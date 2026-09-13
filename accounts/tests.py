"""
Accounts & Identity tests — Step 2.

Run with:
  python manage.py test accounts --settings=Akashic_Library.test_settings

Covers all 12 required test scenarios plus regression for the Step 1
health endpoint.
"""

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.urls import reverse

User = get_user_model()

# ─── Helpers ──────────────────────────────────────────────────────────────────

REGISTER_URL = "/api/auth/register/"
LOGIN_URL = "/api/auth/login/"
LOGOUT_URL = "/api/auth/logout/"
ME_URL = "/api/auth/me/"
HEALTH_URL = "/api/health/"


def _make_user(username="alice", email="alice@example.com", password="TestPass123!"):
    """Create a user directly via the manager (bypasses API)."""
    return User.objects.create_user(username=username, email=email, password=password)


# ─── Registration ─────────────────────────────────────────────────────────────


class RegistrationTests(TestCase):
    """POST /api/auth/register/ — Test 1–6."""

    def _post(self, data):
        return self.client.post(REGISTER_URL, data, content_type="application/json")

    def test_01_registration_succeeds(self):
        """Test 1 — Successful registration returns 201."""
        resp = self._post(
            {"username": "bob", "email": "bob@example.com", "password": "GoodPass99!"}
        )
        self.assertEqual(resp.status_code, 201, resp.json())
        self.assertIn("user", resp.json())

    def test_02_registration_default_role_is_user(self):
        """Test 2 — Newly registered accounts always get the USER role."""
        resp = self._post(
            {"username": "carol", "email": "carol@example.com", "password": "GoodPass99!"}
        )
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.json()["user"]["role"], "USER")

    def test_03_client_cannot_register_as_admin(self):
        """Test 3 — Providing role=ADMIN in the payload must be ignored.

        The registration serializer has no role field; extra data is silently
        dropped by DRF Serializer.  The created user must still be USER.
        """
        resp = self._post(
            {
                "username": "evil",
                "email": "evil@example.com",
                "password": "GoodPass99!",
                "role": "ADMIN",
            }
        )
        self.assertEqual(resp.status_code, 201, resp.json())
        self.assertEqual(resp.json()["user"]["role"], "USER")

    def test_04_duplicate_username_is_rejected(self):
        """Test 4 — Duplicate username must return 400."""
        _make_user(username="dave")
        resp = self._post(
            {"username": "dave", "email": "dave2@example.com", "password": "GoodPass99!"}
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("username", resp.json())

    @override_settings(
        AUTH_PASSWORD_VALIDATORS=[
            {
                "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
            },
            {
                "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
            },
        ]
    )
    def test_05_weak_password_is_rejected(self):
        """Test 5 — Common/short passwords are rejected by Django validators."""
        resp = self._post(
            {"username": "eve", "email": "eve@example.com", "password": "password"}
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("password", resp.json())

    def test_06_password_never_returned(self):
        """Test 6 — API response must never contain the user's password."""
        resp = self._post(
            {"username": "frank", "email": "frank@example.com", "password": "GoodPass99!"}
        )
        self.assertEqual(resp.status_code, 201)
        response_text = resp.content.decode()
        self.assertNotIn("GoodPass99!", response_text)
        self.assertNotIn("password", resp.json()["user"])

    def test_07_duplicate_email_is_rejected(self):
        """Bonus — Duplicate email must return 400."""
        _make_user(email="grace@example.com")
        resp = self._post(
            {"username": "grace2", "email": "grace@example.com", "password": "GoodPass99!"}
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("email", resp.json())

    def test_08_missing_required_fields_returns_400(self):
        """Bonus — Missing fields must return 400."""
        resp = self._post({"username": "nobody"})
        self.assertEqual(resp.status_code, 400)


# ─── Login / Logout ───────────────────────────────────────────────────────────


class LoginTests(TestCase):
    """POST /api/auth/login/ — Tests 7–8."""

    def setUp(self):
        self.user = _make_user(username="henry", password="TestPass123!")

    def _login(self, username="henry", password="TestPass123!"):
        return self.client.post(
            LOGIN_URL,
            {"username": username, "password": password},
            content_type="application/json",
        )

    def test_09_login_succeeds_with_valid_credentials(self):
        """Test 7 — Valid credentials return 200 with user data."""
        resp = self._login()
        self.assertEqual(resp.status_code, 200, resp.json())
        self.assertIn("user", resp.json())
        self.assertEqual(resp.json()["user"]["username"], "henry")

    def test_10_login_fails_with_invalid_password(self):
        """Test 8 — Wrong password returns 400 (public login endpoint, no auth classes)."""
        resp = self._login(password="wrongpassword")
        self.assertEqual(resp.status_code, 400)

    def test_11_login_fails_with_unknown_username(self):
        """Test 8b — Unknown username returns 400 (public login endpoint, no auth classes)."""
        resp = self._login(username="nobody", password="anything")
        self.assertEqual(resp.status_code, 400)

    def test_12_password_not_in_login_response(self):
        """Security — Password must not appear in login response."""
        resp = self._login()
        self.assertEqual(resp.status_code, 200)
        self.assertNotIn("password", resp.json().get("user", {}))


# ─── Current user ─────────────────────────────────────────────────────────────


class MeTests(TestCase):
    """GET /api/auth/me/ — Tests 9–10."""

    def setUp(self):
        self.user = _make_user(username="iris", password="TestPass123!")

    def test_13_me_returns_authenticated_user(self):
        """Test 9 — Authenticated user gets their account data."""
        # Log in via the API (establishes a session cookie).
        self.client.post(
            LOGIN_URL,
            {"username": "iris", "password": "TestPass123!"},
            content_type="application/json",
        )
        resp = self.client.get(ME_URL)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["username"], "iris")
        self.assertNotIn("password", data)

    def test_14_me_rejects_unauthenticated_requests(self):
        """Test 10 — Unauthenticated request to /me/ must return 403."""
        resp = self.client.get(ME_URL)
        self.assertEqual(resp.status_code, 403)

    def test_15_me_response_excludes_sensitive_fields(self):
        """Security — /me/ must never expose password or internal flags."""
        self.client.post(
            LOGIN_URL,
            {"username": "iris", "password": "TestPass123!"},
            content_type="application/json",
        )
        resp = self.client.get(ME_URL)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        for sensitive_field in ("password", "is_staff", "is_superuser"):
            self.assertNotIn(sensitive_field, data)


# ─── Logout ───────────────────────────────────────────────────────────────────


class LogoutTests(TestCase):
    """POST /api/auth/logout/ — Test 11."""

    def setUp(self):
        self.user = _make_user(username="jack", password="TestPass123!")

    def test_16_logout_invalidates_session(self):
        """Test 11 — After logout, /me/ must return 403."""
        # Login.
        self.client.post(
            LOGIN_URL,
            {"username": "jack", "password": "TestPass123!"},
            content_type="application/json",
        )
        # Confirm we are authenticated.
        self.assertEqual(self.client.get(ME_URL).status_code, 200)

        # Logout.
        resp = self.client.post(LOGOUT_URL, content_type="application/json")
        self.assertEqual(resp.status_code, 200)

        # Confirm session is gone.
        self.assertEqual(self.client.get(ME_URL).status_code, 403)

    def test_17_logout_works_when_not_logged_in(self):
        """Logout of an anonymous session must not raise an error."""
        resp = self.client.post(LOGOUT_URL, content_type="application/json")
        self.assertEqual(resp.status_code, 200)


# ─── Superuser / admin compatibility ─────────────────────────────────────────


class SuperuserTests(TestCase):
    """Test 12 — Django admin/superuser creation compatibility."""

    def test_18_create_superuser_sets_correct_flags(self):
        """create_superuser() must produce is_staff=True, is_superuser=True."""
        su = User.objects.create_superuser(
            username="admin_user",
            email="admin@example.com",
            password="SuperSecure99!",
        )
        self.assertTrue(su.is_staff)
        self.assertTrue(su.is_superuser)

    def test_19_superuser_has_admin_role(self):
        """create_superuser() must assign ADMIN role."""
        su = User.objects.create_superuser(
            username="admin2",
            email="admin2@example.com",
            password="SuperSecure99!",
        )
        self.assertEqual(su.role, "ADMIN")

    def test_20_superuser_can_access_admin_site(self):
        """Superuser must be able to log into the Django admin site."""
        User.objects.create_superuser(
            username="adminstaff",
            email="adminstaff@example.com",
            password="SuperSecure99!",
        )
        logged_in = self.client.login(username="adminstaff", password="SuperSecure99!")
        self.assertTrue(logged_in)


# ─── Step 1 regression ────────────────────────────────────────────────────────


class HealthEndpointRegressionTests(TestCase):
    """Verify Step 1 health endpoint still works after Step 2 changes."""

    def test_21_health_endpoint_still_returns_200(self):
        resp = self.client.get(HEALTH_URL)
        self.assertEqual(resp.status_code, 200)

    def test_22_health_endpoint_payload_unchanged(self):
        resp = self.client.get(HEALTH_URL)
        data = resp.json()
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["service"], "Akashic Library API")
