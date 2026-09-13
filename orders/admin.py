from django.contrib import admin
from .models import Order, OrderItem, Payment

class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ("title", "price", "product", "quantity")
    can_delete = False

class PaymentInline(admin.StackedInline):
    model = Payment
    readonly_fields = ("amount", "status")
    can_delete = False

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "status", "total", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("user__username", "id")
    inlines = [PaymentInline, OrderItemInline]
    readonly_fields = ("subtotal", "total", "status")

@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ("id", "order", "title", "price", "quantity")
    search_fields = ("order__id", "title")
    readonly_fields = ("order", "product", "title", "price", "quantity")

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("id", "order", "status", "amount", "created_at")
    list_filter = ("status",)
    search_fields = ("order__id",)
    readonly_fields = ("order", "status", "amount")
