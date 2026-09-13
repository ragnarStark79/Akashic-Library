"""
Foundation tests — Step 1.

Run with:
  python manage.py test tests --settings=Akashic_Library.test_settings

These tests verify that the Django project configuration is correct and that
the /api/health/ endpoint responds as expected.  No PostgreSQL is required;
the test runner uses an in-memory SQLite database via test_settings.py.
"""

from django.test import TestCase
from django.urls import reverse


class HealthCheckTests(TestCase):
    """Tests for GET /api/health/."""

    def test_health_endpoint_returns_200(self):
        """Health endpoint must respond with HTTP 200."""
        url = reverse("api:api-health")
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

    def test_health_endpoint_returns_json(self):
        """Health endpoint must return a JSON content-type."""
        url = reverse("api:api-health")
        response = self.client.get(url)
        self.assertIn("application/json", response["Content-Type"])

    def test_health_endpoint_payload(self):
        """Health endpoint payload must contain status and service keys."""
        url = reverse("api:api-health")
        response = self.client.get(url)
        data = response.json()
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["service"], "Akashic Library API")

    def test_health_endpoint_rejects_post(self):
        """Health endpoint must reject POST requests with 405."""
        url = reverse("api:api-health")
        response = self.client.post(url, data={}, content_type="application/json")
        self.assertEqual(response.status_code, 405)
