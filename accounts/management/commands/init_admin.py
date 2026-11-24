import os
from django.core.management.base import BaseCommand
from accounts.models import User, UserRole, ManagerStatus


class Command(BaseCommand):
    help = "Idempotently initialize or update the default Akashic Administrator account."

    def add_arguments(self, parser):
        parser.add_argument("--username", type=str, help="Admin username")
        parser.add_argument("--email", type=str, help="Admin email address")
        parser.add_argument("--password", type=str, help="Admin password")

    def handle(self, *args, **options):
        username = (
            options.get("username")
            or os.environ.get("AKASHIC_ADMIN_USERNAME")
            or "admin"
        ).strip()
        email = (
            options.get("email")
            or os.environ.get("AKASHIC_ADMIN_EMAIL")
            or "admin@akashic.library"
        ).strip()
        password = (
            options.get("password")
            or os.environ.get("AKASHIC_ADMIN_PASSWORD")
            or "Admin123!@#"
        )

        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                "email": email,
                "role": UserRole.ADMIN,
                "is_staff": True,
                "is_superuser": True,
                "is_active": True,
                "manager_status": ManagerStatus.APPROVED,
            },
        )

        user.email = email
        user.role = UserRole.ADMIN
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.manager_status = ManagerStatus.APPROVED
        user.set_password(password)
        user.save()

        if created:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Successfully created Akashic Administrator '{username}' ({email})."
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Successfully verified and updated Akashic Administrator '{username}' ({email})."
                )
            )
