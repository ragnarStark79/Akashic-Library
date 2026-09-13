from django.contrib import admin
from .models import StoreProduct, Inventory

class InventoryInline(admin.StackedInline):
    model = Inventory
    can_delete = False
    verbose_name_plural = 'Inventory'

@admin.register(StoreProduct)
class StoreProductAdmin(admin.ModelAdmin):
    list_display = ('book_reference', 'edition', 'price', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('book_reference', 'edition')
    inlines = [InventoryInline]

@admin.register(Inventory)
class InventoryAdmin(admin.ModelAdmin):
    list_display = ('product', 'quantity', 'reserved_quantity', 'available_quantity')
    search_fields = ('product__book_reference',)
