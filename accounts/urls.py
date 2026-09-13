"""
Accounts URL configuration.

Mounted at /api/auth/ by the root URLconf.
All routes are namespaced under 'accounts' via the include() call in urls.py.
"""

from django.urls import path

from . import views

urlpatterns = [
    path("register/", views.register,      name="register"),
    path("login/",    views.login_view,    name="login"),
    path("logout/",   views.logout_view,   name="logout"),
    path("me/",       views.me,            name="me"),
]
