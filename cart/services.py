"""
Cart services — Business logic for shopping cart operations.

Enforces inventory checks, valid quantities, user isolation,
multi-store supplier switching, and global store selection.
"""

from django.db import transaction
from django.db.models import Q
from django.core.exceptions import ValidationError

from .models import Cart, CartItem, CartStatus
from store.models import StoreProduct, StoreStatus


class CartService:
    @staticmethod
    def get_or_create_active_cart(user) -> Cart:
        """Retrieve the user's active cart or create one if it doesn't exist."""
        cart, _ = Cart.objects.get_or_create(
            user=user,
            defaults={"status": CartStatus.ACTIVE}
        )
        return cart

    @staticmethod
    def get_cart(user) -> Cart | None:
        """Retrieve the user's active cart without creating one."""
        return Cart.objects.filter(user=user, status=CartStatus.ACTIVE).first()

    @staticmethod
    @transaction.atomic
    def add_item(user, product_id: str, quantity: int) -> CartItem:
        """
        Add a product to the user's cart or increment its quantity.
        Validates product status and inventory availability.
        """
        if quantity <= 0:
            raise ValidationError({"quantity": "Quantity must be greater than zero."})

        try:
            product = StoreProduct.objects.select_related("inventory", "created_by").get(pk=product_id)
        except StoreProduct.DoesNotExist:
            raise ValidationError({"product_id": "StoreProduct does not exist."})

        if product.status in [StoreStatus.DISCONTINUED, StoreStatus.OUT_OF_STOCK]:
            raise ValidationError({"product_id": f"Product is {product.status} and cannot be added."})

        cart = CartService.get_or_create_active_cart(user)
        
        # Check if it's already in the cart
        item = CartItem.objects.filter(cart=cart, product=product).first()
        
        new_quantity = quantity
        if item:
            new_quantity += item.quantity

        available = product.inventory.available_quantity if hasattr(product, "inventory") else 0
        if new_quantity > available:
            raise ValidationError({
                "quantity": f"Requested quantity ({new_quantity}) exceeds available stock ({available})."
            })

        if item:
            item.quantity = new_quantity
            item.save(update_fields=["quantity", "updated_at"])
        else:
            item = CartItem.objects.create(
                cart=cart,
                product=product,
                quantity=new_quantity
            )
            
        return item

    @staticmethod
    def update_item(user, item_id: str, quantity: int) -> CartItem:
        """
        Update the quantity of an existing cart item.
        """
        if quantity <= 0:
            raise ValidationError({"quantity": "Quantity must be greater than zero."})

        try:
            item = CartItem.objects.select_related("product__inventory").get(
                pk=item_id, cart__user=user
            )
        except CartItem.DoesNotExist:
            raise ValidationError({"item_id": "CartItem does not exist in your cart."})

        product = item.product
        if product.status == StoreStatus.DISCONTINUED:
            raise ValidationError({"product_id": "Product is DISCONTINUED."})

        available = product.inventory.available_quantity if hasattr(product, "inventory") else 0
        if quantity > available:
            raise ValidationError({
                "quantity": f"Requested quantity ({quantity}) exceeds available stock ({available})."
            })

        item.quantity = quantity
        item.save(update_fields=["quantity", "updated_at"])
        return item

    @staticmethod
    def remove_item(user, item_id: str) -> None:
        """Remove a specific item from the user's cart."""
        deleted_count, _ = CartItem.objects.filter(pk=item_id, cart__user=user).delete()
        if deleted_count == 0:
            raise ValidationError({"item_id": "CartItem does not exist in your cart."})

    @staticmethod
    def clear_cart(user) -> None:
        """Remove all items from the user's active cart."""
        cart = CartService.get_cart(user)
        if cart:
            cart.items.all().delete()

    @staticmethod
    @transaction.atomic
    def switch_item_store(user, item_id: str, new_product_id: str) -> CartItem:
        """
        Switch supplying store for a specific book in the cart to an alternative
        StoreProduct offer of the exact same canonical edition.
        """
        try:
            item = CartItem.objects.select_related("product__inventory", "cart").get(
                pk=item_id, cart__user=user
            )
        except CartItem.DoesNotExist:
            raise ValidationError({"item_id": "CartItem does not exist in your cart."})

        try:
            new_product = StoreProduct.objects.select_related("inventory", "created_by").get(pk=new_product_id)
        except StoreProduct.DoesNotExist:
            raise ValidationError({"product_id": "Selected store product offer does not exist."})

        if new_product.status in [StoreStatus.DISCONTINUED, StoreStatus.OUT_OF_STOCK]:
            raise ValidationError({"product_id": f"This store offer is currently {new_product.status.replace('_', ' ').lower()}."})

        if str(new_product.book_reference) != str(item.product.book_reference):
            raise ValidationError({"product_id": "Selected product does not represent the same canonical book edition."})

        if new_product.created_by:
            if not new_product.created_by.is_active or getattr(new_product.created_by, "manager_status", None) == "SUSPENDED":
                raise ValidationError({"product_id": "This seller is currently not accepting orders."})

        available_stock = new_product.inventory.available_quantity if hasattr(new_product, "inventory") else 0
        if item.quantity > available_stock:
            raise ValidationError({
                "quantity": f"The selected store only has {available_stock} copies available (cart has {item.quantity})."
            })

        # Check if the cart already has this exact new_product in another line (merge)
        existing_same_product = CartItem.objects.filter(cart=item.cart, product=new_product).exclude(pk=item.pk).first()
        if existing_same_product:
            merged_qty = existing_same_product.quantity + item.quantity
            if merged_qty > available_stock:
                raise ValidationError({"quantity": f"Cannot merge lines: exceeds store available stock of {available_stock}."})
            existing_same_product.quantity = merged_qty
            existing_same_product.save(update_fields=["quantity", "updated_at"])
            item.delete()
            return existing_same_product

        item.product = new_product
        item.save(update_fields=["product", "updated_at"])
        return item

    @staticmethod
    @transaction.atomic
    def select_global_store(user, store_id: str) -> Cart:
        """
        Convenience feature: Switch all eligible cart items to a single selected store,
        provided that store has active offers with sufficient stock for every book in the cart.
        """
        cart = CartService.get_or_create_active_cart(user)
        items = list(cart.items.select_related("product__inventory").all())
        if not items:
            raise ValidationError("Cart is empty.")

        from accounts.models import User
        try:
            target_manager = User.objects.get(pk=store_id)
        except User.DoesNotExist:
            raise ValidationError({"store_id": "Store manager not found."})

        if not target_manager.is_active or getattr(target_manager, "manager_status", None) == "SUSPENDED":
            raise ValidationError({"store_id": "This store is currently unavailable."})

        # Verify full coverage for all books in cart
        new_product_map = {}
        for item in items:
            ref = item.product.book_reference
            match = StoreProduct.objects.filter(
                created_by=target_manager,
                book_reference=ref
            ).exclude(
                status__in=[StoreStatus.DISCONTINUED, StoreStatus.OUT_OF_STOCK]
            ).select_related("inventory").first()

            s_name = target_manager.business_name or target_manager.username
            if not match:
                raise ValidationError({
                    "store_id": f"No single store currently supplies all items. '{s_name}' does not stock all titles in your bag."
                })

            available_stock = match.inventory.available_quantity if hasattr(match, "inventory") else 0
            if item.quantity > available_stock:
                raise ValidationError({
                    "store_id": f"'{s_name}' has insufficient stock for all titles."
                })

            new_product_map[item.id] = match

        # All covered! Apply switches
        for item in items:
            item.product = new_product_map[item.id]
            item.save(update_fields=["product", "updated_at"])

        return cart

    @staticmethod
    def get_eligible_global_stores(cart) -> list[dict]:
        """
        Calculates which stores offer every item in the cart with sufficient stock.
        """
        if hasattr(cart, "_prefetched_objects_cache") and "items" in cart._prefetched_objects_cache:
            items = cart._prefetched_objects_cache["items"]
        else:
            items = list(cart.items.select_related("product__inventory").all())
        if not items:
            return []

        from accounts.models import User, UserRole, ManagerStatus
        approved_managers = User.objects.filter(
            role=UserRole.STORE_MANAGER,
            manager_status=ManagerStatus.APPROVED,
            is_active=True
        )

        eligible = []
        for mgr in approved_managers:
            all_found = True
            for item in items:
                ref = item.product.book_reference
                cand = StoreProduct.objects.filter(
                    created_by=mgr,
                    book_reference=ref
                ).exclude(
                    status__in=[StoreStatus.DISCONTINUED, StoreStatus.OUT_OF_STOCK]
                ).select_related("inventory").first()

                if not cand or (cand.inventory.available_quantity < item.quantity):
                    all_found = False
                    break

            if all_found:
                eligible.append({
                    "store_id": str(mgr.id),
                    "store_name": mgr.business_name or mgr.display_name or mgr.username,
                    "manager_username": mgr.username,
                })

        return eligible

    @staticmethod
    def enrich_cart_items(items):
        """
        Batch-enrich a list of CartItems with:
        - Bibliographic metadata from MongoDB
        - Seller / Store Manager attribution
        - Alternative store offers for the same canonical edition
        """
        if not items:
            return items

        from discovery.repository import _get_collection
        from bson import ObjectId
        from bson.errors import InvalidId
        from accounts.models import ManagerStatus

        # 1. Collect book references
        refs = list({item.product.book_reference for item in items if item.product and item.product.book_reference})
        object_ids = []
        str_refs = []
        for r in refs:
            try:
                object_ids.append(ObjectId(r))
            except (InvalidId, TypeError):
                str_refs.append(r)

        col = _get_collection()
        clauses = []
        if object_ids:
            clauses.append({"_id": {"$in": object_ids}})
        if str_refs:
            clauses.append({"_id": {"$in": str_refs}})
            clauses.append({"identifiers.isbn13": {"$in": str_refs}})
            clauses.append({"identifiers.isbn10": {"$in": str_refs}})

        book_map = {}
        if clauses:
            for doc in col.find({"$or": clauses}):
                book_map[str(doc.get("_id"))] = doc
                if doc.get("identifiers"):
                    if doc["identifiers"].get("isbn13"):
                        book_map[doc["identifiers"]["isbn13"]] = doc
                    if doc["identifiers"].get("isbn10"):
                        book_map[doc["identifiers"]["isbn10"]] = doc

        # 2. Collect alternative store offers for all references
        all_offers = (
            StoreProduct.objects.filter(book_reference__in=refs)
            .exclude(status=StoreStatus.DISCONTINUED)
            .exclude(
                Q(created_by__manager_status=ManagerStatus.SUSPENDED)
                | Q(created_by__is_active=False)
            )
            .select_related("inventory", "created_by")
            .order_by("price")
        )

        offers_by_ref = {}
        for p in all_offers:
            offers_by_ref.setdefault(str(p.book_reference), []).append(p)

        # 3. Attach metadata to CartItem instances
        for item in items:
            ref = str(item.product.book_reference) if item.product else ""
            b = book_map.get(ref, {})
            title = b.get("title") or "Curated Edition"
            raw_authors = b.get("authors") or []
            authors = []
            for a in raw_authors:
                if isinstance(a, dict):
                    authors.append(a.get("name", ""))
                elif isinstance(a, str):
                    authors.append(a)
            author_str = ", ".join([a for a in authors if a]) or "Various Authors"

            cover = ""
            if item.product.custom_cover_url:
                cover = item.product.custom_cover_url
            elif b.get("cover_urls"):
                cover = b["cover_urls"][0]
            elif b.get("identifiers", {}).get("isbn13"):
                cover = f"https://covers.openlibrary.org/b/isbn/{b['identifiers']['isbn13']}-L.jpg"

            genres = item.product.custom_genres or b.get("subjects") or b.get("genres") or []

            item._book_title = title
            item._book_author = author_str
            item._book_cover = cover
            item._book_genres = genres

            # Build available store offers for this item
            offers_list = []
            for offer in offers_by_ref.get(ref, []):
                s_name = (
                    offer.created_by.business_name
                    or offer.created_by.display_name
                    or offer.created_by.username
                ) if offer.created_by else "Akashic Official Sanctuary"
                s_id = str(offer.created_by.id) if offer.created_by else None
                available_qty = offer.inventory.available_quantity if hasattr(offer, "inventory") else 0

                offers_list.append({
                    "product_id": str(offer.id),
                    "store_id": s_id,
                    "store_name": s_name,
                    "price": str(offer.price),
                    "edition": offer.edition or "Standard Edition",
                    "condition": offer.condition or "New",
                    "available_quantity": available_qty,
                    "status": offer.status,
                    "is_current": offer.id == item.product.id,
                })
            item._available_stores = offers_list

        return items
