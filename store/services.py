"""
Store services — Business logic for catalog and inventory.

Enforces inventory constraints, manages status transitions, and bridges
the boundary between PostgreSQL commerce and MongoDB discovery.
"""

from django.db import transaction
from django.core.exceptions import ValidationError

from store.models import StoreProduct, Inventory, StoreStatus
from discovery.repository import get_book_by_id
from discovery.exceptions import BookNotFoundError

LOW_STOCK_THRESHOLD = 5

class StoreService:
    @staticmethod
    @transaction.atomic
    def create_store_product(
        book_reference: str,
        price,
        edition: str = "",
        condition: str = "",
        status: str = StoreStatus.OUT_OF_STOCK,
        quantity: int = 0,
        reserved_quantity: int = 0
    ) -> StoreProduct:
        """Create a StoreProduct and its Inventory simultaneously."""
        # 1. Validate the MongoDB book reference
        try:
            # Check if book exists in MongoDB. Returns dict or raises BookNotFoundError
            get_book_by_id(book_reference)
        except BookNotFoundError:
            raise ValidationError({"book_reference": "Book reference does not exist in the catalog."})

        # 2. Validate price
        if price < 0:
            raise ValidationError({"price": "Price cannot be negative."})

        # 3. Create the product
        product = StoreProduct.objects.create(
            book_reference=book_reference,
            price=price,
            edition=edition,
            condition=condition,
            status=status
        )

        # 4. Initialize inventory
        StoreService.update_inventory(
            product,
            quantity=quantity,
            reserved_quantity=reserved_quantity,
            force_status_update=(status == StoreStatus.OUT_OF_STOCK)
        )
        return product

    @staticmethod
    def update_store_product(product: StoreProduct, **kwargs) -> StoreProduct:
        """Update StoreProduct scalar fields."""
        if 'price' in kwargs and kwargs['price'] < 0:
            raise ValidationError({"price": "Price cannot be negative."})
        
        for key, value in kwargs.items():
            if hasattr(product, key):
                setattr(product, key, value)
        
        # If status is manually set to DISCONTINUED, save it.
        # Otherwise, we might want to recalculate based on inventory.
        product.save()
        return product

    @staticmethod
    @transaction.atomic
    def update_inventory(
        product: StoreProduct, 
        quantity: int | None = None, 
        reserved_quantity: int | None = None,
        force_status_update: bool = True
    ) -> Inventory:
        """
        Safely update inventory levels and recalculate the product's status.
        """
        # Ensure inventory object exists
        inventory, _ = Inventory.objects.get_or_create(product=product)

        if quantity is not None:
            if quantity < 0:
                raise ValidationError({"quantity": "Quantity cannot be negative."})
            inventory.quantity = quantity

        if reserved_quantity is not None:
            if reserved_quantity < 0:
                raise ValidationError({"reserved_quantity": "Reserved quantity cannot be negative."})
            inventory.reserved_quantity = reserved_quantity

        if inventory.reserved_quantity > inventory.quantity:
            raise ValidationError({"reserved_quantity": "Reserved quantity cannot exceed total quantity."})

        inventory.save()

        # Determine if we should cascade a status update
        if force_status_update and product.status != StoreStatus.DISCONTINUED:
            available = inventory.available_quantity
            new_status = product.status
            
            if available == 0:
                new_status = StoreStatus.OUT_OF_STOCK
            elif available <= LOW_STOCK_THRESHOLD:
                new_status = StoreStatus.LOW_STOCK
            else:
                new_status = StoreStatus.IN_STOCK
                
            if new_status != product.status:
                product.status = new_status
                product.save(update_fields=['status', 'updated_at'])

        return inventory

    @staticmethod
    def get_bulk_store_availability(book_ids: list[str]) -> dict[str, dict]:
        """
        Retrieve StoreProduct availability for a list of MongoDB book IDs.
        Used to enrich discovery API responses without N+1 queries.
        
        Returns a dict mapping book_reference -> {"available": bool, "product_id": str, "price": str}
        """
        if not book_ids:
            return {}

        # Fetch products that are NOT discontinued and have available stock.
        # In a real system, there might be multiple products per book.
        # We'll just grab the first available one per book for simplicity.
        products = StoreProduct.objects.filter(
            book_reference__in=book_ids
        ).exclude(
            status=StoreStatus.DISCONTINUED
        ).order_by('book_reference', 'price')

        availability = {}
        for p in products:
            if p.book_reference not in availability:
                is_available = p.status in [StoreStatus.IN_STOCK, StoreStatus.LOW_STOCK]
                # If there are multiple, prioritize available ones
                if is_available or p.book_reference not in availability:
                    availability[p.book_reference] = {
                        "available": is_available,
                        "product_id": str(p.id),
                    }
                
                # Update if we find an available one later
                if is_available and not availability[p.book_reference]["available"]:
                    availability[p.book_reference] = {
                        "available": True,
                        "product_id": str(p.id),
                    }

        return availability
