from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Alias for create_demo_users: Seeds initial demo users and watchlist data'

    def handle(self, *args, **options):
        call_command('create_demo_users')
