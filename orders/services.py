"""
Orders services — Business logic for checkout and order management.
"""

from django.db import transaction
from django.core.exceptions import ValidationError
from decimal import Decimal

from .models import Order, OrderItem, Payment, OrderStatus, PaymentStatus
from store.models import StoreProduct, StoreStatus, Inventory
from cart.models import Cart
from discovery.repository import get_book_by_id
from discovery.exceptions import BookNotFoundError


class CheckoutService:
    @staticmethod
    def checkout(user) -> Order:
        """
        Processes the active cart, creates an order, simulates payment,
        and clears the cart.
        """
        # 1. Pre-flight Validation: Load active cart
        cart = Cart.objects.filter(user=user, status="ACTIVE").prefetch_related('items__product').first()
        if not cart or not cart.items.exists():
            raise ValidationError("Cart is empty or does not exist.")

        cart_items = list(cart.items.all())

        # 2. MongoDB Resolution
        # We do this BEFORE the transaction starts to avoid holding locks during external I/O
        # If MongoDB is down or a book is missing, we fail safely.
        book_titles = {}
        book_references = [item.product.book_reference for item in cart_items]
        
        for ref in book_references:
            try:
                book = get_book_by_id(ref)
                book_titles[ref] = book.get("title", "Unknown Title")
            except BookNotFoundError:
                pass
            
        for item in cart_items:
            if item.product.book_reference not in book_titles:
                raise ValidationError(f"Book data for product {item.product.id} could not be resolved from Discovery service.")

        # 3. Transactional Boundary
        with transaction.atomic():
            # Get product IDs to lock their inventory
            product_ids = [item.product_id for item in cart_items]
            
            # Lock the inventory rows. select_for_update prevents other transactions from modifying them.
            # We sort by product_id to avoid deadlocks between concurrent transactions
            product_ids.sort()
            
            # Note: We need to pull inventory models into memory to check and decrement
            inventories = list(Inventory.objects.select_for_update().filter(product_id__in=product_ids))
            inventory_map = {inv.product_id: inv for inv in inventories}
            
            # Re-fetch products to ensure we have the absolute latest status and price
            products = StoreProduct.objects.filter(id__in=product_ids).in_bulk()

            order_subtotal = Decimal("0.00")
            
            for item in cart_items:
                product = products.get(item.product_id)
                if not product:
                    raise ValidationError(f"Product {item.product_id} no longer exists.")
                    
                if product.status in [StoreStatus.DISCONTINUED, StoreStatus.OUT_OF_STOCK]:
                    raise ValidationError(f"Product {product.id} is {product.status} and cannot be purchased.")
                    
                inv = inventory_map.get(product.id)
                if not inv:
                    raise ValidationError(f"Inventory record missing for product {product.id}.")
                    
                if item.quantity > inv.available_quantity:
                    raise ValidationError(f"Insufficient stock for product {product.id}. Requested: {item.quantity}, Available: {inv.available_quantity}")
                
                # Calculate server-authoritative line total
                line_total = product.price * item.quantity
                order_subtotal += line_total
                
            # Create the Order
            order = Order.objects.create(
                user=user,
                status=OrderStatus.PENDING,
                subtotal=order_subtotal,
                total=order_subtotal # Currently total == subtotal as there are no taxes/discounts
            )
            
            # Create OrderItems and Decrement Inventory
            order_items_to_create = []
            for item in cart_items:
                product = products[item.product_id]
                title = book_titles[product.book_reference]
                
                order_items_to_create.append(
                    OrderItem(
                        order=order,
                        product=product,
                        title=title,
                        quantity=item.quantity,
                        price=product.price # Snapshot the authoritative price
                    )
                )
                
                # Decrement inventory
                inv = inventory_map[product.id]
                inv.quantity -= item.quantity
                inv.save(update_fields=['quantity'])
                
                # Update StoreProduct status if necessary
                new_status = StoreStatus.IN_STOCK
                if inv.quantity == 0:
                    new_status = StoreStatus.OUT_OF_STOCK
                elif inv.quantity <= 5:
                    new_status = StoreStatus.LOW_STOCK
                    
                if product.status != new_status:
                    product.status = new_status
                    product.save(update_fields=['status', 'updated_at'])

            # Bulk create order items
            OrderItem.objects.bulk_create(order_items_to_create)
            
            # Create Payment record (MOCK)
            payment = Payment.objects.create(
                order=order,
                status=PaymentStatus.PAID, # Mocking immediate success
                amount=order.total
            )
            
            # Transition Order state
            order.status = OrderStatus.CONFIRMED
            order.save(update_fields=['status', 'updated_at'])
            
            # Clear the cart items
            cart.items.all().delete()
            
            return order
