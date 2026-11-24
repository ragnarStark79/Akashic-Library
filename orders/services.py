"""
Orders services — Business logic for checkout, order management,
multi-store snapshot attribution, and atomic inventory reduction.
"""

import uuid
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError

from .models import Order, OrderItem, Payment, OrderStatus, PaymentStatus
from store.models import StoreProduct, StoreStatus, Inventory
from cart.models import Cart
from discovery.repository import get_book_by_id, _get_collection
from discovery.exceptions import BookNotFoundError


class CheckoutService:
    @staticmethod
    def create_order(
        user,
        customer_name: str = "",
        customer_email: str = "",
        shipping_address: dict | None = None,
        payment_method: str = "qr_demo",
    ) -> Order:
        """
        Create a pending Order and Payment session snapshot from the user's active cart.
        Does NOT deduct inventory yet; stock deduction occurs upon confirmed payment.
        """
        # 1. Load active cart
        cart = Cart.objects.filter(user=user, status="ACTIVE").prefetch_related(
            "items__product__inventory",
            "items__product__created_by",
            "items__product__detail",
        ).first()

        if not cart or not cart.items.exists():
            raise ValidationError("Cart is empty or does not exist.")

        cart_items = list(cart.items.all())

        # 2. Resolve book metadata
        book_metadata = {}
        book_references = [item.product.book_reference for item in cart_items if item.product]

        col = _get_collection()
        for ref in book_references:
            try:
                b = get_book_by_id(ref)
                book_metadata[str(ref)] = b
            except BookNotFoundError:
                doc = col.find_one({"$or": [{"_id": ref}, {"identifiers.isbn13": ref}]})
                if doc:
                    book_metadata[str(ref)] = doc

        for item in cart_items:
            ref = str(item.product.book_reference)
            if ref not in book_metadata:
                raise ValidationError(
                    f"Book data for product {item.product.id} could not be resolved from Discovery service."
                )

        # 3. Validate live product statuses and stock availability
        order_subtotal = Decimal("0.00")
        for item in cart_items:
            product = item.product
            if not product:
                raise ValidationError("One of the products in your cart is no longer available.")

            if product.status in [StoreStatus.DISCONTINUED, StoreStatus.OUT_OF_STOCK]:
                raise ValidationError(f"Product '{product.edition or product.id}' is {product.status} and cannot be purchased.")

            available_stock = product.inventory.available_quantity if hasattr(product, "inventory") else 0
            if item.quantity > available_stock:
                b = book_metadata.get(str(product.book_reference), {})
                t = b.get("title") or "Title"
                raise ValidationError(
                    f"Insufficient stock for product '{t}'. Requested: {item.quantity}, Available: {available_stock}"
                )

            order_subtotal += (product.price * item.quantity)

        # 4. Create Pending Order & Items atomically
        with transaction.atomic():
            c_name = customer_name.strip() or getattr(user, "display_name", "") or user.username
            c_email = customer_email.strip() or getattr(user, "email", "") or f"{user.username}@akashic.library"

            order_id = uuid.uuid4()
            order_num = f"AK-2026-{str(order_id)[:8].upper()}"
            pay_ref = f"DEMO-PAY-{uuid.uuid4().hex[:8].upper()}"

            order = Order.objects.create(
                id=order_id,
                order_number=order_num,
                user=user,
                status=OrderStatus.PENDING,
                subtotal=order_subtotal,
                total=order_subtotal,
                payment_reference=pay_ref,
                customer_name=c_name,
                customer_email=c_email,
                shipping_address=shipping_address or {
                    "recipient": c_name,
                    "address_line1": "742 Evergreen Terrace",
                    "city": "Springfield",
                    "postal_code": "97477",
                    "country": "United States",
                },
            )

            # Create OrderItems with full snapshot
            order_items_to_create = []
            for item in cart_items:
                product = item.product
                b = book_metadata.get(str(product.book_reference), {})
                title = b.get("title") or "Curated Edition"

                raw_authors = b.get("authors") or []
                authors = []
                for a in raw_authors:
                    if isinstance(a, dict):
                        authors.append(a.get("name", ""))
                    elif isinstance(a, str):
                        authors.append(a)
                author_str = ", ".join([a for a in authors if a]) or "Various Authors"

                cover = product.custom_cover_url or ""
                if not cover and b.get("cover_urls"):
                    cover = b["cover_urls"][0]
                elif not cover and b.get("identifiers", {}).get("isbn13"):
                    cover = f"https://covers.openlibrary.org/b/isbn/{b['identifiers']['isbn13']}-L.jpg"

                # Seller attribution
                store_mgr = product.created_by
                s_name = (
                    store_mgr.business_name or store_mgr.display_name or store_mgr.username
                ) if store_mgr else "Akashic Official Sanctuary"

                # Discount snapshot
                detail = getattr(product, "detail", None)
                orig_price = detail.original_price if detail else None
                disc_pct = None
                if orig_price and product.price and orig_price > product.price:
                    disc_pct = int(round(((orig_price - product.price) / orig_price) * 100))

                order_items_to_create.append(
                    OrderItem(
                        order=order,
                        product=product,
                        store_manager=store_mgr,
                        store_name=s_name,
                        title=title,
                        author=author_str,
                        cover_image=cover,
                        edition=product.edition or "Curated Edition",
                        quantity=item.quantity,
                        price=product.price,
                        original_price=orig_price,
                        discount_percentage=disc_pct,
                    )
                )

            OrderItem.objects.bulk_create(order_items_to_create)

            # Generate Demo Payment QR payload
            qr_token = f"akashic-demo-pay:{order.order_number}:{uuid.uuid4().hex[:12]}"
            Payment.objects.create(
                order=order,
                reference_id=pay_ref,
                status=PaymentStatus.PENDING,
                amount=order.total,
                qr_payload=qr_token,
            )

            return order

    @staticmethod
    def confirm_demo_payment(order_id, user, idempotency_key: str | None = None) -> Order:
        """
        Confirms a demonstration payment, atomically decrements inventory for all
        contributing store managers, transitions order status to CONFIRMED, and clears cart.
        Enforces double-click idempotency and race condition safety.
        """
        with transaction.atomic():
            try:
                order = Order.objects.select_for_update().prefetch_related(
                    "items__product", "payment"
                ).get(pk=order_id, user=user)
            except Order.DoesNotExist:
                raise ValidationError({"order": "Order not found."})

            payment = getattr(order, "payment", None)
            if not payment:
                raise ValidationError({"payment": "No payment session exists for this order."})

            # Idempotency Guard: If already paid, safely return existing result without double deduction
            if order.status == OrderStatus.CONFIRMED and payment.status == PaymentStatus.PAID:
                return order

            if idempotency_key and payment.idempotency_key == idempotency_key and payment.status == PaymentStatus.PAID:
                return order

            # Lock product inventory records in sorted order to avoid deadlocks
            order_items = list(order.items.select_related("product").all())
            product_ids = [item.product_id for item in order_items if item.product_id]
            product_ids.sort()

            inventories = list(Inventory.objects.select_for_update().filter(product_id__in=product_ids))
            inventory_map = {inv.product_id: inv for inv in inventories}
            products_map = StoreProduct.objects.filter(id__in=product_ids).in_bulk()

            # Re-verify stock availability before deducting
            for item in order_items:
                if not item.product_id:
                    continue
                inv = inventory_map.get(item.product_id)
                if not inv:
                    raise ValidationError(f"Inventory record missing for '{item.title}'.")
                if item.quantity > inv.available_quantity:
                    raise ValidationError(
                        f"Stock changed: insufficient copies available for '{item.title}'. "
                        f"Requested: {item.quantity}, Available: {inv.available_quantity}."
                    )

            # Atomic Inventory Decrement
            for item in order_items:
                if not item.product_id:
                    continue
                inv = inventory_map[item.product_id]
                inv.quantity -= item.quantity
                inv.save(update_fields=["quantity"])

                # Update StoreProduct status according to new stock level
                prod = products_map.get(item.product_id)
                if prod:
                    new_status = StoreStatus.IN_STOCK
                    if inv.quantity == 0:
                        new_status = StoreStatus.OUT_OF_STOCK
                    elif inv.quantity <= 5:
                        new_status = StoreStatus.LOW_STOCK

                    if prod.status != new_status:
                        prod.status = new_status
                        prod.save(update_fields=["status", "updated_at"])

            # Transition Payment State
            payment.status = PaymentStatus.PAID
            payment.paid_at = timezone.now()
            if idempotency_key:
                payment.idempotency_key = idempotency_key
            payment.save(update_fields=["status", "paid_at", "idempotency_key", "updated_at"])

            # Transition Order State
            order.status = OrderStatus.CONFIRMED
            order.save(update_fields=["status", "updated_at"])

            # Clear user active cart
            cart = Cart.objects.filter(user=user, status="ACTIVE").first()
            if cart:
                cart.items.all().delete()

            return order

    @staticmethod
    def checkout(user) -> Order:
        """
        Legacy checkout method: creates the order and confirms payment immediately.
        Keeps 100% backward compatibility for all automated tests.
        """
        order = CheckoutService.create_order(user)
        return CheckoutService.confirm_demo_payment(order.id, user)
