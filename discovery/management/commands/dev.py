import os
import sys
import subprocess
from django.core.management.base import BaseCommand

class Command(BaseCommand):
    help = 'Runs both Django API backend and Vite React frontend concurrently with one command.'

    def add_arguments(self, parser):
        parser.add_argument('--port', type=str, default='8000', help='Django backend port (default: 8000)')
        parser.add_argument('--host', type=str, default='127.0.0.1', help='Django backend host (default: 127.0.0.1)')

    def handle(self, *args, **options):
        current_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        frontend_dir = os.path.join(current_dir, 'frontend')

        self.stdout.write(self.style.SUCCESS("=" * 60))
        self.stdout.write(self.style.SUCCESS("   ✨ AKASHIC LIBRARY — UNIFIED DEV ENVIRONMENT ✨"))
        self.stdout.write(self.style.SUCCESS("=" * 60))
        self.stdout.write(f"  • Backend Directory:  {current_dir}")
        self.stdout.write(f"  • Frontend Directory: {frontend_dir}")
        self.stdout.write(f"  • Django API Server:  http://{options['host']}:{options['port']}/")
        self.stdout.write("  • Vite Frontend App:  http://127.0.0.1:3000/")
        self.stdout.write(self.style.SUCCESS("=" * 60))
        self.stdout.write("  Press Ctrl+C to terminate both servers.\n")

        # Delegate to npm run dev which uses concurrently
        try:
            p = subprocess.Popen(['npm', 'run', 'dev'], cwd=frontend_dir)
            p.wait()
        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING("\nShutting down servers..."))
            sys.exit(0)
