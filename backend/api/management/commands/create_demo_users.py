from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from api.models import Media


class Command(BaseCommand):
    help = 'Creates or updates demo users (alice & bob) with properly hashed passwords and initial watchlist data'

    def handle(self, *args, **options):
        users_config = [
            {'username': 'alice', 'email': 'alice@example.com', 'password': 'password123'},
            {'username': 'bob', 'email': 'bob@example.com', 'password': 'password123'},
        ]

        created_users = {}

        for conf in users_config:
            username = conf['username']
            email = conf['email']
            password = conf['password']

            user, created = User.objects.get_or_create(
                username=username,
                defaults={'email': email}
            )

            # Always explicitly use set_password() to ensure proper Django password hashing
            user.set_password(password)
            user.email = email
            user.is_active = True
            user.save()

            created_users[username] = user

            status_str = "Created" if created else "Updated password for"
            self.stdout.write(self.style.SUCCESS(f"{status_str} user '{username}' (password: '{password}')"))

        # Seed sample watchlist items for Alice
        alice = created_users.get('alice')
        if alice:
            alice_items = [
                {
                    'title': 'Interstellar',
                    'type': 'Movie',
                    'status': 'Watched',
                    'rating': 5,
                    'tmdb_id': 157336,
                    'poster_path': '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
                    'genre': 'Adventure, Drama, Science Fiction',
                    'tmdb_rating': 8.4,
                    'release_date': '2014-11-05',
                    'overview': 'The adventures of a group of explorers who make use of a newly discovered wormhole.'
                },
                {
                    'title': 'Severance',
                    'type': 'TV',
                    'status': 'Watched',
                    'rating': 5,
                    'tmdb_id': 95557,
                    'poster_path': '/97dnk6S98sU7T6A4E2N7c0z7bE0.jpg',
                    'genre': 'Drama, Mystery, Sci-Fi & Fantasy',
                    'tmdb_rating': 8.4,
                    'release_date': '2022-02-17',
                    'overview': 'Mark leads a team of office workers whose memories have been surgically divided.'
                },
                {
                    'title': 'Dune: Part Two',
                    'type': 'Movie',
                    'status': 'Unwatched',
                    'rating': 0,
                    'tmdb_id': 693134,
                    'poster_path': '/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
                    'genre': 'Science Fiction, Adventure',
                    'tmdb_rating': 8.2,
                    'release_date': '2024-02-27',
                    'overview': 'Follow the mythic journey of Paul Atreides as he unites with Chani and the Fremen.'
                },
                {
                    'title': 'Stranger Things',
                    'type': 'TV',
                    'status': 'Unwatched',
                    'rating': 0,
                    'tmdb_id': 66732,
                    'poster_path': '/49WJfeN0moxb9IPfGn8AIqMGskD.jpg',
                    'genre': 'Sci-Fi & Fantasy, Drama, Mystery',
                    'tmdb_rating': 8.6,
                    'release_date': '2016-07-15',
                    'overview': 'When a young boy vanishes, a small town uncovers a mystery involving secret experiments.'
                },
            ]
            for item in alice_items:
                Media.objects.update_or_create(
                    owner=alice,
                    title=item['title'],
                    defaults=item
                )
            self.stdout.write(self.style.SUCCESS("Seeded sample media items for 'alice'."))

        # Seed sample watchlist items for Bob
        bob = created_users.get('bob')
        if bob:
            bob_items = [
                {
                    'title': 'Breaking Bad',
                    'type': 'TV',
                    'status': 'Watched',
                    'rating': 5,
                    'tmdb_id': 1396,
                    'poster_path': '/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg',
                    'genre': 'Drama, Crime',
                    'tmdb_rating': 8.9,
                    'release_date': '2008-01-20',
                    'overview': 'Walter White, a New Mexico chemistry teacher, is diagnosed with Stage III cancer.'
                },
                {
                    'title': 'The Dark Knight',
                    'type': 'Movie',
                    'status': 'Watched',
                    'rating': 5,
                    'tmdb_id': 155,
                    'poster_path': '/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
                    'genre': 'Drama, Action, Crime, Thriller',
                    'tmdb_rating': 8.5,
                    'release_date': '2008-07-16',
                    'overview': 'Batman raises the stakes in his war on crime with the help of Lt. Jim Gordon and District Attorney Harvey Dent.'
                },
                {
                    'title': 'The Last of Us',
                    'type': 'TV',
                    'status': 'Unwatched',
                    'rating': 0,
                    'tmdb_id': 100088,
                    'poster_path': '/uKvVjHNqB5VmOrdxqAt2V7JMrne.jpg',
                    'genre': 'Drama, Sci-Fi & Fantasy',
                    'tmdb_rating': 8.6,
                    'release_date': '2023-01-15',
                    'overview': 'Twenty years after modern civilization has been destroyed, Joel is hired to smuggle Ellie.'
                },
            ]
            for item in bob_items:
                Media.objects.update_or_create(
                    owner=bob,
                    title=item['title'],
                    defaults=item
                )
            self.stdout.write(self.style.SUCCESS("Seeded sample media items for 'bob'."))

        self.stdout.write(self.style.SUCCESS("Demo users creation completed successfully."))
