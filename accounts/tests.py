"""
Accounts & Identity tests — Step 2.

Run with:
  python manage.py test accounts --settings=Akashic_Library.test_settings

Covers all 12 required test scenarios plus regression for the Step 1
health endpoint.
"""

from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from accounts.models import UserRole

User = get_user_model()

# ─── Helpers ──────────────────────────────────────────────────────────────────

REGISTER_URL = "/api/auth/register/"
LOGIN_URL = "/api/auth/login/"
LOGOUT_URL = "/api/auth/logout/"
ME_URL = "/api/auth/me/"
PASSWORD_CHANGE_URL = "/api/auth/password/change/"
PASSWORD_RESET_URL = "/api/auth/password/reset/"
PASSWORD_RESET_CONFIRM_URL = "/api/auth/password/reset/confirm/"
HEALTH_URL = "/api/health/"


def _make_user(username="alice", email="alice@example.com", password="TestPass123!", role=UserRole.USER, **extra_fields):
    """Create a user directly via the manager (bypasses API)."""
    return User.objects.create_user(username=username, email=email, password=password, role=role, **extra_fields)


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


# ─── Profile Tests (Phase 6B) ────────────────────────────────────────────────


class ProfileTests(TestCase):
    """GET and PATCH /api/auth/me/ — Tests 23–30."""

    def setUp(self):
        self.user = _make_user(
            username="patron_elena",
            email="elena@example.com",
            password="StrongPass123!",
        )

    def test_23_unauthenticated_cannot_access_profile(self):
        """Unauthenticated GET and PATCH /api/auth/me/ return 403."""
        get_resp = self.client.get(ME_URL)
        self.assertEqual(get_resp.status_code, 403)

        patch_resp = self.client.patch(
            ME_URL,
            {"display_name": "New Name"},
            content_type="application/json",
        )
        self.assertEqual(patch_resp.status_code, 403)

    def test_24_authenticated_can_retrieve_profile(self):
        """Authenticated user can read their own profile."""
        self.client.force_login(self.user)
        resp = self.client.get(ME_URL)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["username"], "patron_elena")
        self.assertEqual(data["email"], "elena@example.com")
        self.assertEqual(data["role"], "USER")

    def test_25_profile_payload_fields_and_no_hash(self):
        """Profile never leaks password hash or sensitive internals."""
        self.client.force_login(self.user)
        resp = self.client.get(ME_URL)
        data = resp.json()
        self.assertNotIn("password", data)
        self.assertNotIn("password_hash", data)
        self.assertNotIn("is_staff", data)
        self.assertNotIn("is_superuser", data)

    def test_26_update_display_name_and_bio(self):
        """Authenticated user can update display_name and bio."""
        self.client.force_login(self.user)
        resp = self.client.patch(
            ME_URL,
            {
                "display_name": "Elena Solanas",
                "bio": "Patron of speculative metafiction.",
            },
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["display_name"], "Elena Solanas")
        self.assertEqual(data["bio"], "Patron of speculative metafiction.")

        # Verify persisted
        self.user.refresh_from_db()
        self.assertEqual(self.user.display_name, "Elena Solanas")
        self.assertEqual(self.user.bio, "Patron of speculative metafiction.")

    def test_27_partial_update_display_name_only(self):
        """Partial PATCH updating only display_name preserves existing bio."""
        self.user.bio = "Preserved biography."
        self.user.save()

        self.client.force_login(self.user)
        resp = self.client.patch(
            ME_URL,
            {"display_name": "Updated Name"},
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.display_name, "Updated Name")
        self.assertEqual(self.user.bio, "Preserved biography.")

    def test_28_partial_update_bio_only(self):
        """Partial PATCH updating only bio preserves existing display_name."""
        self.user.display_name = "Preserved Display Name"
        self.user.save()

        self.client.force_login(self.user)
        resp = self.client.patch(
            ME_URL,
            {"bio": "New bio content."},
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.display_name, "Preserved Display Name")
        self.assertEqual(self.user.bio, "New bio content.")

    def test_29_whitespace_only_display_name_rejected(self):
        """Display name consisting only of whitespace is rejected with 400."""
        self.client.force_login(self.user)
        resp = self.client.patch(
            ME_URL,
            {"display_name": "   "},
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("display_name", resp.json())

    def test_30_privilege_escalation_attempt_ignored(self):
        """Attempts to update role, is_staff, is_superuser, username, email via PATCH are ignored."""
        self.client.force_login(self.user)
        resp = self.client.patch(
            ME_URL,
            {
                "role": "ADMIN",
                "is_staff": True,
                "is_superuser": True,
                "username": "hacked_username",
                "email": "hacked@example.com",
                "display_name": "Legit Name",
            },
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.role, UserRole.USER)
        self.assertFalse(self.user.is_staff)
        self.assertFalse(self.user.is_superuser)
        self.assertEqual(self.user.username, "patron_elena")
        self.assertEqual(self.user.email, "elena@example.com")
        self.assertEqual(self.user.display_name, "Legit Name")


# ─── Password Change Tests (Phase 6B) ────────────────────────────────────────


class PasswordChangeTests(TestCase):
    """POST /api/auth/password/change/ — Tests 31–38."""

    def setUp(self):
        self.user = _make_user(
            username="changeling",
            email="changeling@example.com",
            password="OriginalPass123!",
        )

    def _post(self, data):
        return self.client.post(
            PASSWORD_CHANGE_URL,
            data,
            content_type="application/json",
        )

    def test_31_unauthenticated_password_change_rejected(self):
        """Unauthenticated request returns 403."""
        resp = self._post(
            {
                "current_password": "OriginalPass123!",
                "new_password": "NewSecretPass99!",
                "confirm_new_password": "NewSecretPass99!",
            }
        )
        self.assertEqual(resp.status_code, 403)

    def test_32_correct_current_password_changes_password(self):
        """Providing correct current password and valid new password succeeds."""
        self.client.force_login(self.user)
        resp = self._post(
            {
                "current_password": "OriginalPass123!",
                "new_password": "NewSecretPass99!",
                "confirm_new_password": "NewSecretPass99!",
            }
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["detail"], "Password changed successfully.")

        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewSecretPass99!"))
        self.assertFalse(self.user.check_password("OriginalPass123!"))

    def test_33_incorrect_current_password_rejected(self):
        """Incorrect current password returns 400 Bad Request."""
        self.client.force_login(self.user)
        resp = self._post(
            {
                "current_password": "WrongPassword!",
                "new_password": "NewSecretPass99!",
                "confirm_new_password": "NewSecretPass99!",
            }
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("current_password", resp.json())
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("OriginalPass123!"))

    def test_34_mismatched_new_passwords_rejected(self):
        """Mismatched new password and confirmation returns 400."""
        self.client.force_login(self.user)
        resp = self._post(
            {
                "current_password": "OriginalPass123!",
                "new_password": "NewSecretPass99!",
                "confirm_new_password": "DifferentPass99!",
            }
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("confirm_new_password", resp.json())

    def test_35_same_as_current_password_rejected(self):
        """Reusing existing password returns 400."""
        self.client.force_login(self.user)
        resp = self._post(
            {
                "current_password": "OriginalPass123!",
                "new_password": "OriginalPass123!",
                "confirm_new_password": "OriginalPass123!",
            }
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("new_password", resp.json())

    def test_36_session_preserved_after_password_change(self):
        """Password change preserves active caller session via update_session_auth_hash."""
        # Log in normally through the login endpoint to establish real session
        login_resp = self.client.post(
            LOGIN_URL,
            {"username": "changeling", "password": "OriginalPass123!"},
            content_type="application/json",
        )
        self.assertEqual(login_resp.status_code, 200)

        # Change password
        resp = self._post(
            {
                "current_password": "OriginalPass123!",
                "new_password": "BrandNewPass99!",
                "confirm_new_password": "BrandNewPass99!",
            }
        )
        self.assertEqual(resp.status_code, 200)

        # Immediate subsequent request in same session still succeeds
        me_resp = self.client.get(ME_URL)
        self.assertEqual(me_resp.status_code, 200)

    def test_37_old_password_fails_new_password_succeeds(self):
        """After password change, old credentials fail and new credentials succeed."""
        self.client.force_login(self.user)
        resp = self._post(
            {
                "current_password": "OriginalPass123!",
                "new_password": "BrandNewPass99!",
                "confirm_new_password": "BrandNewPass99!",
            }
        )
        self.assertEqual(resp.status_code, 200)

        # In a new client session, attempt old password
        from django.test import Client
        new_client = Client()
        bad_login = new_client.post(
            LOGIN_URL,
            {"username": "changeling", "password": "OriginalPass123!"},
            content_type="application/json",
        )
        self.assertEqual(bad_login.status_code, 400)

        # Attempt new password
        good_login = new_client.post(
            LOGIN_URL,
            {"username": "changeling", "password": "BrandNewPass99!"},
            content_type="application/json",
        )
        self.assertEqual(good_login.status_code, 200)

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
    def test_38_weak_password_rejected_by_validators(self):
        """Weak or common passwords are rejected by configured validators."""
        self.client.force_login(self.user)
        resp = self._post(
            {
                "current_password": "OriginalPass123!",
                "new_password": "password",
                "confirm_new_password": "password",
            }
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("new_password", resp.json())


# ─── Password Recovery Tests (Phase 6B) ──────────────────────────────────────


class PasswordRecoveryTests(TestCase):
    """POST /api/auth/password/reset/ and reset/confirm/ — Tests 39–47."""

    def setUp(self):
        self.user = _make_user(
            username="scholar_leo",
            email="leo@example.com",
            password="OriginalPass123!",
        )
        mail.outbox.clear()

    def test_39_recovery_request_unknown_email_enumeration_resistant(self):
        """Unknown email returns identical generic response and sends no email."""
        resp = self.client.post(
            PASSWORD_RESET_URL,
            {"email": "unknown@example.com"},
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertIn("password recovery instructions will be sent", resp.json()["detail"])
        self.assertEqual(len(mail.outbox), 0)

    def test_40_recovery_request_known_email_sends_email(self):
        """Registered email returns identical generic response and sends recovery email."""
        resp = self.client.post(
            PASSWORD_RESET_URL,
            {"email": "leo@example.com"},
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertIn("password recovery instructions will be sent", resp.json()["detail"])
        self.assertEqual(len(mail.outbox), 1)

        sent_email = mail.outbox[0]
        self.assertIn("leo@example.com", sent_email.to)
        self.assertIn("Folio Master Passphrase Reset", sent_email.subject)
        self.assertIn("view=auth&tab=reset&uid=", sent_email.body)

    def test_41_recovery_request_invalid_email_rejected(self):
        """Invalid email syntax returns 400 Bad Request."""
        resp = self.client.post(
            PASSWORD_RESET_URL,
            {"email": "not-an-email"},
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("email", resp.json())

    def test_42_recovery_confirm_valid_token_resets_password(self):
        """Valid UID and token successfully resets password."""
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = default_token_generator.make_token(self.user)

        resp = self.client.post(
            PASSWORD_RESET_CONFIRM_URL,
            {
                "uid": uid,
                "token": token,
                "new_password": "NewScholarPass123!",
                "confirm_new_password": "NewScholarPass123!",
            },
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertIn("Password has been reset successfully", resp.json()["detail"])

        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewScholarPass123!"))
        self.assertFalse(self.user.check_password("OriginalPass123!"))

    def test_43_recovery_confirm_invalid_token_rejected(self):
        """Invalid token is rejected with 400."""
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        resp = self.client.post(
            PASSWORD_RESET_CONFIRM_URL,
            {
                "uid": uid,
                "token": "invalid-bogus-token",
                "new_password": "NewScholarPass123!",
                "confirm_new_password": "NewScholarPass123!",
            },
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 400)

    def test_44_recovery_confirm_invalid_uid_rejected(self):
        """Invalid / non-existent UID is rejected with 400."""
        token = default_token_generator.make_token(self.user)
        resp = self.client.post(
            PASSWORD_RESET_CONFIRM_URL,
            {
                "uid": "invalid-uid-b64",
                "token": token,
                "new_password": "NewScholarPass123!",
                "confirm_new_password": "NewScholarPass123!",
            },
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 400)

    def test_45_recovery_confirm_used_token_cannot_be_reused(self):
        """A consumed reset token cannot be reused to reset password a second time."""
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = default_token_generator.make_token(self.user)

        # First reset succeeds
        first_resp = self.client.post(
            PASSWORD_RESET_CONFIRM_URL,
            {
                "uid": uid,
                "token": token,
                "new_password": "NewScholarPass123!",
                "confirm_new_password": "NewScholarPass123!",
            },
            content_type="application/json",
        )
        self.assertEqual(first_resp.status_code, 200)

        # Second reset with same token fails because password hash changed
        second_resp = self.client.post(
            PASSWORD_RESET_CONFIRM_URL,
            {
                "uid": uid,
                "token": token,
                "new_password": "AnotherNewPass123!",
                "confirm_new_password": "AnotherNewPass123!",
            },
            content_type="application/json",
        )
        self.assertEqual(second_resp.status_code, 400)

    def test_46_recovery_confirm_mismatched_password_rejected(self):
        """Password confirmation mismatch returns 400."""
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = default_token_generator.make_token(self.user)

        resp = self.client.post(
            PASSWORD_RESET_CONFIRM_URL,
            {
                "uid": uid,
                "token": token,
                "new_password": "PassOne123!",
                "confirm_new_password": "PassTwo123!",
            },
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("confirm_new_password", resp.json())


# ─── Role Permission Tests (Phase 6B) ────────────────────────────────────────


class RolePermissionTests(TestCase):
    """Verify role model boundaries and least-privilege matrix — Tests 47–50."""

    def test_47_user_role_boundaries(self):
        """Standard USER role has no moderator or admin rights."""
        user = _make_user(username="normal_user", role=UserRole.USER)
        self.assertFalse(user.is_moderator)
        self.assertFalse(user.is_admin)
        self.assertFalse(user.is_store_manager)

    def test_48_moderator_role_boundaries(self):
        """MODERATOR role has moderation rights but not admin or store manager rights."""
        mod = _make_user(username="mod_user", role=UserRole.MODERATOR)
        self.assertTrue(mod.is_moderator)
        self.assertFalse(mod.is_admin)
        self.assertFalse(mod.is_store_manager)

    def test_49_store_manager_has_no_moderation_privilege(self):
        """STORE_MANAGER role has store rights but NOT Community moderation rights."""
        sm = _make_user(username="store_mgr", role=UserRole.STORE_MANAGER)
        self.assertFalse(sm.is_moderator)
        self.assertFalse(sm.is_admin)
        self.assertTrue(sm.is_store_manager)

    def test_50_admin_role_boundaries(self):
        """ADMIN role has all administrative, moderation, and store privileges."""
        admin = _make_user(username="super_admin", role=UserRole.ADMIN)
        self.assertTrue(admin.is_moderator)
        self.assertTrue(admin.is_admin)
        self.assertTrue(admin.is_store_manager)


# ─── Password Policy Enforcement Tests (Phase 6B.1) ──────────────────────────


STANDARD_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


@override_settings(AUTH_PASSWORD_VALIDATORS=STANDARD_PASSWORD_VALIDATORS)
class PasswordPolicyEnforcementTests(TestCase):
    """Enforcement of Django's AUTH_PASSWORD_VALIDATORS suite across password change and reset."""

    def setUp(self):
        self.user = _make_user(
            username="philosopher_king",
            email="philosopher@akashic.vault",
            password="StrongInitPassphrase123!",
        )

    # ── Password Change: Validator Rejection ──────────────────────────────────

    def test_51_password_change_too_short_rejected(self):
        """Password shorter than MinimumLengthValidator (8 chars) is rejected."""
        self.client.force_login(self.user)
        resp = self.client.post(
            PASSWORD_CHANGE_URL,
            {
                "current_password": "StrongInitPassphrase123!",
                "new_password": "short",
                "confirm_new_password": "short",
            },
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("new_password", resp.json())
        # Verify user password unchanged
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("StrongInitPassphrase123!"))

    def test_52_password_change_common_password_rejected(self):
        """Common passwords are rejected by CommonPasswordValidator."""
        self.client.force_login(self.user)
        resp = self.client.post(
            PASSWORD_CHANGE_URL,
            {
                "current_password": "StrongInitPassphrase123!",
                "new_password": "password",
                "confirm_new_password": "password",
            },
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("new_password", resp.json())
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("StrongInitPassphrase123!"))

    def test_53_password_change_entirely_numeric_rejected(self):
        """Entirely numeric passwords rejected by NumericPasswordValidator."""
        self.client.force_login(self.user)
        resp = self.client.post(
            PASSWORD_CHANGE_URL,
            {
                "current_password": "StrongInitPassphrase123!",
                "new_password": "1234567890",
                "confirm_new_password": "1234567890",
            },
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("new_password", resp.json())

    def test_54_password_change_similar_to_username_rejected(self):
        """Passwords too similar to username rejected by UserAttributeSimilarityValidator."""
        self.client.force_login(self.user)
        resp = self.client.post(
            PASSWORD_CHANGE_URL,
            {
                "current_password": "StrongInitPassphrase123!",
                "new_password": "philosopher_king",
                "confirm_new_password": "philosopher_king",
            },
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("new_password", resp.json())

    def test_55_password_change_similar_to_email_rejected(self):
        """Passwords too similar to email rejected by UserAttributeSimilarityValidator."""
        self.client.force_login(self.user)
        resp = self.client.post(
            PASSWORD_CHANGE_URL,
            {
                "current_password": "StrongInitPassphrase123!",
                "new_password": "philosopher@akashic.vault",
                "confirm_new_password": "philosopher@akashic.vault",
            },
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("new_password", resp.json())

    # ── Password Change: Success & Session Preservation ───────────────────────

    def test_56_password_change_valid_password_succeeds_and_preserves_session(self):
        """Valid password succeeds and preserves caller's active session."""
        self.client.force_login(self.user)
        resp = self.client.post(
            PASSWORD_CHANGE_URL,
            {
                "current_password": "StrongInitPassphrase123!",
                "new_password": "FolioPassphrase2026!",
                "confirm_new_password": "FolioPassphrase2026!",
            },
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertIn("Password changed successfully", resp.json()["detail"])

        # Check DB updated
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("FolioPassphrase2026!"))

        # Verify active session is preserved (GET /api/auth/me/ returns 200)
        me_resp = self.client.get(ME_URL)
        self.assertEqual(me_resp.status_code, 200)
        self.assertEqual(me_resp.json()["username"], "philosopher_king")

    # ── Password Reset Confirm: Validator Rejection ───────────────────────────

    def test_57_recovery_confirm_too_short_rejected(self):
        """Password reset confirm rejects short password under 8 chars."""
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = default_token_generator.make_token(self.user)

        resp = self.client.post(
            PASSWORD_RESET_CONFIRM_URL,
            {
                "uid": uid,
                "token": token,
                "new_password": "short",
                "confirm_new_password": "short",
            },
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("new_password", resp.json())
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("StrongInitPassphrase123!"))

    def test_58_recovery_confirm_common_password_rejected(self):
        """Password reset confirm rejects common password."""
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = default_token_generator.make_token(self.user)

        resp = self.client.post(
            PASSWORD_RESET_CONFIRM_URL,
            {
                "uid": uid,
                "token": token,
                "new_password": "password",
                "confirm_new_password": "password",
            },
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("new_password", resp.json())

    def test_59_recovery_confirm_numeric_password_rejected(self):
        """Password reset confirm rejects entirely numeric password."""
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = default_token_generator.make_token(self.user)

        resp = self.client.post(
            PASSWORD_RESET_CONFIRM_URL,
            {
                "uid": uid,
                "token": token,
                "new_password": "1234567890",
                "confirm_new_password": "1234567890",
            },
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("new_password", resp.json())

    def test_60_recovery_confirm_similar_to_attributes_rejected(self):
        """Password reset confirm rejects password too similar to username."""
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = default_token_generator.make_token(self.user)

        resp = self.client.post(
            PASSWORD_RESET_CONFIRM_URL,
            {
                "uid": uid,
                "token": token,
                "new_password": "philosopher_king",
                "confirm_new_password": "philosopher_king",
            },
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("new_password", resp.json())

    # ── Password Reset Confirm: Token Preservation on Failure & Consumption on Success ──

    def test_61_recovery_confirm_token_reusable_after_rejected_password(self):
        """A reset token remains valid after a failed attempt with a weak password, and is consumed on success."""
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = default_token_generator.make_token(self.user)

        # 1. Failed attempt with weak password
        fail_resp = self.client.post(
            PASSWORD_RESET_CONFIRM_URL,
            {
                "uid": uid,
                "token": token,
                "new_password": "password",
                "confirm_new_password": "password",
            },
            content_type="application/json",
        )
        self.assertEqual(fail_resp.status_code, 400)

        # 2. Same token used with valid strong password succeeds
        good_resp = self.client.post(
            PASSWORD_RESET_CONFIRM_URL,
            {
                "uid": uid,
                "token": token,
                "new_password": "ValidResetPassphrase2026!",
                "confirm_new_password": "ValidResetPassphrase2026!",
            },
            content_type="application/json",
        )
        self.assertEqual(good_resp.status_code, 200)

        # 3. Third attempt with the now-consumed token is rejected
        reused_resp = self.client.post(
            PASSWORD_RESET_CONFIRM_URL,
            {
                "uid": uid,
                "token": token,
                "new_password": "AnotherValidPass2026!",
                "confirm_new_password": "AnotherValidPass2026!",
            },
            content_type="application/json",
        )
        self.assertEqual(reused_resp.status_code, 400)

    # ── Service Layer Direct Validation Tests ─────────────────────────────────

    def test_62_service_layer_change_password_enforces_validators(self):
        """AccountService.change_password directly raises ValidationError for invalid password."""
        from accounts.services import AccountService
        from rest_framework.exceptions import ValidationError as DRFValidationError

        with self.assertRaises(DRFValidationError) as ctx:
            AccountService.change_password(
                request=None,
                user=self.user,
                new_password="password",
            )
        self.assertIn("new_password", ctx.exception.detail)

    def test_63_service_layer_confirm_reset_enforces_validators(self):
        """AccountService.confirm_password_reset directly raises ValidationError for invalid password."""
        from accounts.services import AccountService
        from rest_framework.exceptions import ValidationError as DRFValidationError

        with self.assertRaises(DRFValidationError) as ctx:
            AccountService.confirm_password_reset(
                user=self.user,
                new_password="123",
            )
        self.assertIn("new_password", ctx.exception.detail)
