from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from .models import Media


class AuthAndMediaSecurityTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Create User A (Alice)
        self.user_a = User.objects.create_user(
            username='alice',
            password='password123',
            email='alice@example.com'
        )
        
        # Create User B (Bob)
        self.user_b = User.objects.create_user(
            username='bob',
            password='password123',
            email='bob@example.com'
        )
        
        # Alice's token
        response_a = self.client.post('/api/token/', {
            'username': 'alice',
            'password': 'password123'
        }, format='json')
        self.token_a = response_a.data['access']
        self.refresh_a = response_a.data['refresh']

        # Bob's token
        response_b = self.client.post('/api/token/', {
            'username': 'bob',
            'password': 'password123'
        }, format='json')
        self.token_b = response_b.data['access']
        self.refresh_b = response_b.data['refresh']

    def test_unauthenticated_requests_are_rejected(self):
        """Global DRF permission must reject unauthenticated requests."""
        response = self.client.get('/api/media/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        response = self.client.post('/api/media/', {'title': 'Ghost In The Shell', 'type': 'Movie'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_token_refresh(self):
        """Verify SimpleJWT refresh endpoint returns a new access token."""
        response = self.client.post('/api/token/refresh/', {
            'refresh': self.refresh_a
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)

    def test_user_registration(self):
        """Verify new user registration and token obtain flow."""
        # 1. Registration with email
        response = self.client.post('/api/register/', {
            'username': 'charlie',
            'password': 'password123',
            'email': 'charlie@example.com'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['user']['username'], 'charlie')
        self.assertIn('Registration successful', response.data['message'])

        # 2. Registration without email (optional empty email)
        response_no_email = self.client.post('/api/register/', {
            'username': 'dave',
            'password': 'password123',
            'email': ''
        }, format='json')
        self.assertEqual(response_no_email.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response_no_email.data['user']['username'], 'dave')

        # 3. Duplicate username should return 400 with clear message
        dup_res = self.client.post('/api/register/', {
            'username': 'charlie',
            'password': 'password123',
            'email': ''
        }, format='json')
        self.assertEqual(dup_res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(
            any('already exists' in msg.lower() for msg in dup_res.data.get('username', []))
        )

        # 4. Short password should return 400 with validation message
        short_res = self.client.post('/api/register/', {
            'username': 'shortpassuser',
            'password': '123',
            'email': ''
        }, format='json')
        self.assertEqual(short_res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', short_res.data)

        # 5. Verify newly created user can log in via /api/token/
        token_res = self.client.post('/api/token/', {
            'username': 'charlie',
            'password': 'password123'
        }, format='json')
        self.assertEqual(token_res.status_code, status.HTTP_200_OK)
        self.assertIn('access', token_res.data)
        self.assertIn('refresh', token_res.data)

    def test_user_a_can_create_and_manage_media(self):
        """Alice creates an unwatched movie, marks as watched, rates it, and deletes it."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token_a}')
        
        # 1. Create unwatched item
        res = self.client.post('/api/media/', {
            'title': 'Inception',
            'type': 'Movie',
            'status': 'Unwatched',
            'rating': 0
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        media_id = res.data['id']
        self.assertEqual(res.data['owner'], 'alice')
        self.assertEqual(res.data['status'], 'Unwatched')
        
        # 2. Mark as Watched
        patch_res = self.client.patch(f'/api/media/{media_id}/', {
            'status': 'Watched'
        }, format='json')
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_res.data['status'], 'Watched')

        # 3. Update rating to 5
        rate_res = self.client.patch(f'/api/media/{media_id}/', {
            'rating': 5
        }, format='json')
        self.assertEqual(rate_res.status_code, status.HTTP_200_OK)
        self.assertEqual(rate_res.data['rating'], 5)

        # 4. Rating validation boundary (above 5 rejected)
        invalid_rate = self.client.patch(f'/api/media/{media_id}/', {
            'rating': 6
        }, format='json')
        self.assertEqual(invalid_rate.status_code, status.HTTP_400_BAD_REQUEST)

        # 5. Delete item
        del_res = self.client.delete(f'/api/media/{media_id}/')
        self.assertEqual(del_res.status_code, status.HTTP_204_NO_CONTENT)

    def test_strict_multi_user_data_isolation(self):
        """Verify User B cannot see, retrieve, modify, or delete User A's media."""
        # 1. Create media for Alice
        alice_media = Media.objects.create(
            title='Alice Secret Movie',
            type='Movie',
            status='Unwatched',
            rating=0,
            owner=self.user_a
        )

        # 2. Create media for Bob
        bob_media = Media.objects.create(
            title='Bob Favorite Show',
            type='TV',
            status='Watched',
            rating=4,
            owner=self.user_b
        )

        # 3. Authenticate as Bob
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token_b}')

        # 4. Bob lists media -> Must ONLY see Bob's media
        list_res = self.client.get('/api/media/')
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        returned_ids = [item['id'] for item in list_res.data]
        self.assertIn(bob_media.id, returned_ids)
        self.assertNotIn(alice_media.id, returned_ids)
        self.assertEqual(len(returned_ids), 1)

        # 5. Bob tries to GET Alice's media by ID -> 404
        get_res = self.client.get(f'/api/media/{alice_media.id}/')
        self.assertEqual(get_res.status_code, status.HTTP_404_NOT_FOUND)

        # 6. Bob tries to PATCH Alice's media -> 404
        patch_res = self.client.patch(f'/api/media/{alice_media.id}/', {
            'title': 'Hacked Title',
            'rating': 1
        }, format='json')
        self.assertEqual(patch_res.status_code, status.HTTP_404_NOT_FOUND)

        # 7. Bob tries to DELETE Alice's media -> 404
        delete_res = self.client.delete(f'/api/media/{alice_media.id}/')
        self.assertEqual(delete_res.status_code, status.HTTP_404_NOT_FOUND)

        # 8. Verify Alice's media is untouched in database
        alice_media.refresh_from_db()
        self.assertEqual(alice_media.title, 'Alice Secret Movie')
        self.assertEqual(alice_media.owner, self.user_a)

        # 9. Authenticate back as Alice -> Alice still sees her item
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token_a}')
        alice_list_res = self.client.get('/api/media/')
        self.assertEqual(alice_list_res.status_code, status.HTTP_200_OK)
        alice_returned_ids = [item['id'] for item in alice_list_res.data]
        self.assertIn(alice_media.id, alice_returned_ids)
        self.assertNotIn(bob_media.id, alice_returned_ids)

    def test_tmdb_search_authentication_and_validation(self):
        """Verify TMDB search endpoint permissions and input validation."""
        # Unauthenticated request -> 401
        res_unauth = self.client.get('/api/tmdb/search/?query=Inception')
        self.assertEqual(res_unauth.status_code, status.HTTP_401_UNAUTHORIZED)

        # Authenticated empty query -> 400
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token_a}')
        res_empty = self.client.get('/api/tmdb/search/?query=')
        self.assertEqual(res_empty.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', res_empty.data)

    def test_tmdb_media_addition_and_duplicate_prevention(self):
        """Verify adding TMDB media with posters and duplicate checking."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token_a}')

        # 1. Add TMDB movie
        payload = {
            'title': 'Inception',
            'type': 'Movie',
            'status': 'Unwatched',
            'rating': 0,
            'tmdb_id': 27205,
            'poster_path': '/ljsZTbVsrQSqZgWeep2B1QiDKuh.jpg',
            'genre': ['Action', 'Science Fiction', 'Adventure'],
            'tmdb_rating': 8.4,
            'overview': 'Cobb steals information from targets dreams.',
            'release_date': '2010-07-15'
        }
        res_add = self.client.post('/api/media/', payload, format='json')
        self.assertEqual(res_add.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res_add.data['tmdb_id'], 27205)
        self.assertEqual(res_add.data['poster_path'], '/ljsZTbVsrQSqZgWeep2B1QiDKuh.jpg')
        self.assertIn('Action', res_add.data['genre'])
        self.assertEqual(res_add.data['tmdb_rating'], 8.4)

        # 2. Try adding duplicate TMDB movie for Alice -> 400 Bad Request
        res_dup = self.client.post('/api/media/', payload, format='json')
        self.assertEqual(res_dup.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('tmdb_id', res_dup.data)

        # 3. User B (Bob) CAN add the same TMDB movie without collision
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token_b}')
        res_bob_add = self.client.post('/api/media/', payload, format='json')
        self.assertEqual(res_bob_add.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res_bob_add.data['owner'], 'bob')

