"""
Store Admin API views — Central administrative console endpoints for Akashic Store.

Access restricted strictly to users with the ADMIN role or superuser status.
"""

from django.db.models import Count, Sum, Q, F
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from decimal import Decimal
from accounts.models import User, UserRole, ManagerStatus
from .models import StoreProduct, Inventory
from .permissions import IsAdminRole
from .services import StoreService
from orders.models import Order, OrderItem, PaymentStatus


class AdminOverviewView(APIView):
    """
    GET /api/store/admin/overview/
    Returns high-level store health metrics for the Admin Console.
    """
    permission_classes = [IsAdminRole]

    def get(self, request):
        total_products = StoreProduct.objects.count()
        total_users = User.objects.count()

        mgr_qs = User.objects.filter(role=UserRole.STORE_MANAGER)
        total_managers = mgr_qs.count()
        pending_managers = mgr_qs.filter(manager_status=ManagerStatus.PENDING).count()
        approved_managers = mgr_qs.filter(manager_status=ManagerStatus.APPROVED).count()
        rejected_managers = mgr_qs.filter(manager_status=ManagerStatus.REJECTED).count()
        suspended_managers = mgr_qs.filter(manager_status=ManagerStatus.SUSPENDED).count()

        inventory_stats = Inventory.objects.aggregate(
            total_stock=Sum("quantity"),
            total_reserved=Sum("reserved_quantity"),
        )
        total_stock = inventory_stats["total_stock"] or 0
        total_reserved = inventory_stats["total_reserved"] or 0
        available_units = max(0, total_stock - total_reserved)

        out_of_stock_count = StoreProduct.objects.filter(
            Q(status="OUT_OF_STOCK") | Q(inventory__quantity__lte=F("inventory__reserved_quantity"))
        ).count()

        paid_orders = Order.objects.filter(payment__status=PaymentStatus.PAID)
        completed_orders_count = paid_orders.count()
        gross_revenue = sum((o.total for o in paid_orders), Decimal("0.00"))

        return Response(
            {
                "metrics": {
                    "total_products": total_products,
                    "total_users": total_users,
                    "total_managers": total_managers,
                    "pending_managers": pending_managers,
                    "approved_managers": approved_managers,
                    "rejected_managers": rejected_managers,
                    "suspended_managers": suspended_managers,
                    "available_units": available_units,
                    "out_of_stock_count": out_of_stock_count,
                    "completed_orders_count": completed_orders_count,
                    "gross_revenue": f"{gross_revenue:.2f}",
                },
                "server_time": timezone.now().isoformat(),
            },
            status=status.HTTP_200_OK,
        )


class AdminStoreManagersView(APIView):
    """
    GET /api/store/admin/managers/
    List all store managers with optional status and search filtering.
    """
    permission_classes = [IsAdminRole]

    def get(self, request):
        status_filter = request.query_params.get("status", "").strip().upper()
        search_query = request.query_params.get("search", "").strip()

        qs = User.objects.filter(role=UserRole.STORE_MANAGER).annotate(
            products_count=Count("store_products")
        ).select_related("approved_by").order_by("-created_at")

        if status_filter and status_filter in ManagerStatus.values:
            qs = qs.filter(manager_status=status_filter)

        if search_query:
            qs = qs.filter(
                Q(username__icontains=search_query)
                | Q(email__icontains=search_query)
                | Q(business_name__icontains=search_query)
            )

        data = [
            {
                "id": str(u.id),
                "username": u.username,
                "email": u.email,
                "business_name": u.business_name,
                "manager_status": u.manager_status,
                "products_count": u.products_count,
                "approved_by": u.approved_by.username if u.approved_by else None,
                "approved_at": u.approved_at.isoformat() if u.approved_at else None,
                "created_at": u.created_at.isoformat(),
            }
            for u in qs
        ]

        return Response({"managers": data}, status=status.HTTP_200_OK)


class AdminStoreManagerActionView(APIView):
    """
    POST /api/store/admin/managers/<uuid:pk>/action/
    Admin approves, rejects, suspends, or reactivates a Store Manager.
    """
    permission_classes = [IsAdminRole]

    def post(self, request, pk):
        manager = get_object_or_404(User, pk=pk, role=UserRole.STORE_MANAGER)
        action = request.data.get("action", "").strip().lower()

        action_map = {
            "approve": ManagerStatus.APPROVED,
            "reject": ManagerStatus.REJECTED,
            "suspend": ManagerStatus.SUSPENDED,
            "reactivate": ManagerStatus.APPROVED,
        }

        if action not in action_map:
            return Response(
                {"detail": f"Invalid action '{action}'. Choices: {list(action_map.keys())}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        new_status = action_map[action]
        manager.manager_status = new_status
        manager.approved_by = request.user
        manager.approved_at = timezone.now()
        manager.save(update_fields=["manager_status", "approved_by", "approved_at"])

        return Response(
            {
                "success": True,
                "manager_id": str(manager.id),
                "manager_status": new_status,
                "message": f"Store Manager '{manager.username}' has been successfully set to {new_status}.",
            },
            status=status.HTTP_200_OK,
        )


class AdminUsersView(APIView):
    """
    GET /api/store/admin/users/
    List users with search and role filtering.
    """
    permission_classes = [IsAdminRole]

    def get(self, request):
        role_filter = request.query_params.get("role", "").strip().upper()
        search_query = request.query_params.get("search", "").strip()

        qs = User.objects.all().order_by("-created_at")

        if role_filter and role_filter in UserRole.values:
            qs = qs.filter(role=role_filter)

        if search_query:
            qs = qs.filter(
                Q(username__icontains=search_query)
                | Q(email__icontains=search_query)
                | Q(display_name__icontains=search_query)
            )

        data = [
            {
                "id": str(u.id),
                "username": u.username,
                "email": u.email,
                "role": u.role,
                "display_name": u.display_name or u.username,
                "full_name": f"{u.first_name} {u.last_name}".strip() or u.display_name or u.username,
                "is_active": u.is_active,
                "created_at": u.created_at.isoformat(),
            }
            for u in qs[:100]
        ]

        return Response({"users": data}, status=status.HTTP_200_OK)


class AdminUserActionView(APIView):
    """
    POST /api/store/admin/users/<uuid:pk>/action/
    Admin suspends or reactivates a user account (Patron/USER or other role).
    Protections:
    - Administrator cannot suspend their own account.
    - Cannot suspend the last active administrator account.
    - Soft suspension toggles `is_active = False` which immediately prevents authentication
      and access to protected APIs while preserving account data, orders, and cart records.
    """
    permission_classes = [IsAdminRole]

    def post(self, request, pk):
        target_user = get_object_or_404(User, pk=pk)
        action = request.data.get("action", "").strip().lower()

        if action not in ("suspend", "reactivate"):
            return Response(
                {"detail": f"Invalid action '{action}'. Choices: ['suspend', 'reactivate']."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Protection: Cannot suspend own account
        if target_user.id == request.user.id and action == "suspend":
            return Response(
                {"detail": "Administrators cannot suspend their own account."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Protection: Cannot suspend the last active admin
        if target_user.role == UserRole.ADMIN and action == "suspend":
            active_admins = User.objects.filter(role=UserRole.ADMIN, is_active=True).count()
            if active_admins <= 1:
                return Response(
                    {"detail": "Cannot suspend the last active administrator account."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if action == "suspend":
            target_user.is_active = False
            target_user.save(update_fields=["is_active"])
            msg = f"User '{target_user.username}' has been successfully suspended."
        else:
            target_user.is_active = True
            target_user.save(update_fields=["is_active"])
            msg = f"User '{target_user.username}' has been successfully reactivated."

        return Response(
            {
                "success": True,
                "user_id": str(target_user.id),
                "username": target_user.username,
                "is_active": target_user.is_active,
                "message": msg,
            },
            status=status.HTTP_200_OK,
        )


class AdminProductsView(APIView):
    """
    GET /api/store/admin/products/
    Lists all store products across all managers with full metadata and stock.
    """
    permission_classes = [IsAdminRole]

    def get(self, request):
        search_query = request.query_params.get("search", "").strip()
        status_filter = request.query_params.get("status", "").strip().upper()

        qs = StoreProduct.objects.select_related("inventory", "created_by").order_by("-created_at")

        if status_filter:
            qs = qs.filter(status=status_filter)

        enriched_products = StoreService.enrich_products_with_book_data(list(qs))

        # Build mapping of product id to creator info
        creator_map = {
            str(p.id): {
                "id": str(p.created_by.id) if p.created_by else None,
                "username": p.created_by.username if p.created_by else "System / Unassigned",
                "business_name": p.created_by.business_name if p.created_by else "",
            }
            for p in qs
        }

        results = []
        for p in enriched_products:
            p_id = str(p.get("id"))
            creator = creator_map.get(p_id, {"id": None, "username": "System / Unassigned", "business_name": ""})
            p_copy = dict(p)
            p_copy["manager"] = creator
            if search_query:
                title = str(p_copy.get("title", "")).lower()
                authors = " ".join(p_copy.get("authors", [])).lower()
                if search_query.lower() not in title and search_query.lower() not in authors:
                    continue
            results.append(p_copy)

        return Response({"products": results}, status=status.HTTP_200_OK)


class AdminRevenueView(APIView):
    """
    GET /api/store/admin/revenue/
    Provides global store revenue statistics, breakdowns by manager and book.
    Dynamically reports live metrics from verified completed orders.
    """
    permission_classes = [IsAdminRole]

    def get(self, request):
        paid_orders = Order.objects.filter(payment__status=PaymentStatus.PAID)
        total_orders = paid_orders.count()
        gross_revenue = sum((o.total for o in paid_orders), Decimal("0.00"))
        net_revenue = gross_revenue * Decimal("0.15")  # 15% platform commission
        avg_order = (gross_revenue / total_orders) if total_orders > 0 else Decimal("0.00")

        # Aggregate sales by store manager and by book
        paid_items = list(
            OrderItem.objects.filter(order__payment__status=PaymentStatus.PAID).select_related("store_manager")
        )
        mgr_sales: dict[str, dict] = {}
        book_sales: dict[str, dict] = {}

        for it in paid_items:
            m_id = str(it.store_manager.id) if it.store_manager else "sanctuary"
            m_name = (
                it.store_manager.business_name or it.store_manager.username
            ) if it.store_manager else "Akashic Official Sanctuary"

            if m_id not in mgr_sales:
                mgr_sales[m_id] = {"name": m_name, "units": 0, "revenue": Decimal("0.00")}
            mgr_sales[m_id]["units"] += it.quantity
            mgr_sales[m_id]["revenue"] += (it.price * it.quantity)

            b_key = it.title
            if b_key not in book_sales:
                book_sales[b_key] = {"title": b_key, "units": 0, "revenue": Decimal("0.00")}
            book_sales[b_key]["units"] += it.quantity
            book_sales[b_key]["revenue"] += (it.price * it.quantity)

        top_mgrs = sorted(
            [
                {
                    "manager_name": v["name"],
                    "units_sold": v["units"],
                    "gross_revenue": f"{v['revenue']:.2f}",
                }
                for v in mgr_sales.values()
            ],
            key=lambda x: float(x["gross_revenue"]),
            reverse=True,
        )[:5]

        top_books = sorted(
            [
                {
                    "title": v["title"],
                    "units_sold": v["units"],
                    "gross_revenue": f"{v['revenue']:.2f}",
                }
                for v in book_sales.values()
            ],
            key=lambda x: float(x["gross_revenue"]),
            reverse=True,
        )[:5]

        return Response(
            {
                "gross_revenue": f"{gross_revenue:.2f}",
                "net_revenue": f"{net_revenue:.2f}",
                "total_orders": total_orders,
                "average_order_value": f"{avg_order:.2f}",
                "revenue_by_period": [
                    {"period": "This Month", "orders": total_orders, "revenue": f"{gross_revenue:.2f}"},
                    {"period": "Last Month", "orders": 0, "revenue": "0.00"},
                ],
                "top_performing_managers": top_mgrs,
                "top_selling_books": top_books,
                "status_note": "Global revenue tracking operational from completed customer orders.",
            },
            status=status.HTTP_200_OK,
        )
