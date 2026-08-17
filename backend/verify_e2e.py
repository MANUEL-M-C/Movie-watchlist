"""
End-to-End Live Verification Script for Movie & TV Watchlist API
Tests:
1. Authentication & JWT tokens (Access + Refresh)
2. Token refresh endpoint
3. User A creating, marking watched, rating, and deleting media
4. Multi-user scoping & security isolation (User B cannot access or mutate User A's media)
"""

import sys
import os
import django

# Setup django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import Client
import json

def run_verification():
    print("==================================================")
    print("  RUNNING FULL E2E LIVE VERIFICATION TEST SUITE  ")
    print("==================================================")
    
    client = Client()

    # 1. Test Login User A (Alice)
    res_login_a = client.post('/api/token/', data=json.dumps({
        'username': 'alice',
        'password': 'password123'
    }), content_type='application/json')
    assert res_login_a.status_code == 200, f"Alice login failed: {res_login_a.content}"
    tokens_a = res_login_a.json()
    access_a = tokens_a['access']
    refresh_a = tokens_a['refresh']
    print(" [PASS] Alice logged in & received JWT Access + Refresh tokens.")

    # 2. Test Login User B (Bob)
    res_login_b = client.post('/api/token/', data=json.dumps({
        'username': 'bob',
        'password': 'password123'
    }), content_type='application/json')
    assert res_login_b.status_code == 200, f"Bob login failed: {res_login_b.content}"
    tokens_b = res_login_b.json()
    access_b = tokens_b['access']
    refresh_b = tokens_b['refresh']
    print(" [PASS] Bob logged in & received JWT Access + Refresh tokens.")

    # 3. Test Token Refresh
    res_refresh = client.post('/api/token/refresh/', data=json.dumps({
        'refresh': refresh_a
    }), content_type='application/json')
    assert res_refresh.status_code == 200, f"Refresh failed: {res_refresh.content}"
    new_access_a = res_refresh.json()['access']
    print(" [PASS] Token refresh successful. New access token obtained.")

    # 4. User A creates an unwatched movie
    auth_header_a = {'HTTP_AUTHORIZATION': f'Bearer {new_access_a}'}
    res_create = client.post('/api/media/', data=json.dumps({
        'title': 'The Matrix Resurrections',
        'type': 'Movie',
        'status': 'Unwatched',
        'rating': 0
    }), content_type='application/json', **auth_header_a)
    assert res_create.status_code == 201, f"Create failed: {res_create.content}"
    created_media = res_create.json()
    media_id = created_media['id']
    assert created_media['owner'] == 'alice'
    assert created_media['status'] == 'Unwatched'
    print(f" [PASS] Alice created unwatched media (ID: {media_id}, Owner: alice).")

    # 5. User A marks media as Watched
    res_patch_status = client.patch(f'/api/media/{media_id}/', data=json.dumps({
        'status': 'Watched'
    }), content_type='application/json', **auth_header_a)
    assert res_patch_status.status_code == 200
    assert res_patch_status.json()['status'] == 'Watched'
    print(" [PASS] Alice marked media as Watched.")

    # 6. User A rates media 5 stars
    res_patch_rating = client.patch(f'/api/media/{media_id}/', data=json.dumps({
        'rating': 5
    }), content_type='application/json', **auth_header_a)
    assert res_patch_rating.status_code == 200
    assert res_patch_rating.json()['rating'] == 5
    print(" [PASS] Alice updated 5-star rating to 5/5.")

    # 7. MULTI-USER SECURITY VERIFICATION: User B attempts to access / tamper Alice's media
    auth_header_b = {'HTTP_AUTHORIZATION': f'Bearer {access_b}'}

    # 7a. Bob lists media -> Alice's media MUST NOT appear
    res_list_b = client.get('/api/media/', **auth_header_b)
    assert res_list_b.status_code == 200
    bob_item_ids = [item['id'] for item in res_list_b.json()]
    assert media_id not in bob_item_ids, "SECURITY BREACH: Bob can see Alice's media in list!"
    print(f" [PASS] Multi-User Isolation: Alice's item (ID: {media_id}) is hidden from Bob's list.")

    # 7b. Bob directly GETs Alice's media ID -> Must return 404
    res_get_b = client.get(f'/api/media/{media_id}/', **auth_header_b)
    assert res_get_b.status_code == 404, f"Expected 404, got {res_get_b.status_code}"
    print(" [PASS] Multi-User Isolation: Bob cannot GET Alice's item by ID (404 Not Found).")

    # 7c. Bob directly PATCHes Alice's media ID -> Must return 404
    res_patch_b = client.patch(f'/api/media/{media_id}/', data=json.dumps({
        'rating': 1,
        'title': 'Hacked Title'
    }), content_type='application/json', **auth_header_b)
    assert res_patch_b.status_code == 404, f"Expected 404, got {res_patch_b.status_code}"
    print(" [PASS] Multi-User Isolation: Bob cannot PATCH Alice's item (404 Not Found).")

    # 7d. Bob directly DELETEs Alice's media ID -> Must return 404
    res_delete_b = client.delete(f'/api/media/{media_id}/', **auth_header_b)
    assert res_delete_b.status_code == 404, f"Expected 404, got {res_delete_b.status_code}"
    print(" [PASS] Multi-User Isolation: Bob cannot DELETE Alice's item (404 Not Found).")

    # 8. User A deletes her own media item -> 204 No Content
    res_delete_a = client.delete(f'/api/media/{media_id}/', **auth_header_a)
    assert res_delete_a.status_code == 204, f"Delete failed: {res_delete_a.content}"
    print(" [PASS] Alice deleted her own media item successfully (204 No Content).")

    # 9. TMDB Integration: User A adds a TMDB Movie with real poster and genres
    tmdb_payload = {
        'title': 'Inception',
        'type': 'Movie',
        'status': 'Unwatched',
        'rating': 0,
        'tmdb_id': 27205,
        'poster_path': '/ljsZTbVsrQSqZgWeep2B1QiDKuh.jpg',
        'genre': 'Action, Science Fiction, Adventure',
        'tmdb_rating': 8.4,
        'overview': 'Cobb steals information from targets dreams.',
        'release_date': '2010-07-15'
    }
    res_tmdb_a = client.post('/api/media/', data=json.dumps(tmdb_payload), content_type='application/json', **auth_header_a)
    assert res_tmdb_a.status_code == 201, f"TMDB add failed: {res_tmdb_a.content}"
    tmdb_media_a = res_tmdb_a.json()
    assert tmdb_media_a['tmdb_id'] == 27205
    assert tmdb_media_a['poster_path'] == '/ljsZTbVsrQSqZgWeep2B1QiDKuh.jpg'
    assert tmdb_media_a['tmdb_rating'] == 8.4
    print(" [PASS] Alice added TMDB title with poster, genres, and TMDB rating.")

    # 10. TMDB Duplicate Prevention: Alice tries to add the same TMDB title -> 400 Bad Request
    res_tmdb_dup = client.post('/api/media/', data=json.dumps(tmdb_payload), content_type='application/json', **auth_header_a)
    assert res_tmdb_dup.status_code == 400, f"Expected 400 for duplicate, got {res_tmdb_dup.status_code}"
    print(" [PASS] Duplicate TMDB title prevention verified (400 Bad Request).")

    # 11. Multi-User Isolation for TMDB: Bob adds the same TMDB title -> Succeeds for Bob
    res_tmdb_b = client.post('/api/media/', data=json.dumps(tmdb_payload), content_type='application/json', **auth_header_b)
    assert res_tmdb_b.status_code == 201, f"Bob TMDB add failed: {res_tmdb_b.content}"
    assert res_tmdb_b.json()['owner'] == 'bob'
    print(" [PASS] Multi-User TMDB: Bob independently added the same TMDB title.")

    # Cleanup TMDB test items
    client.delete(f"/api/media/{tmdb_media_a['id']}/", **auth_header_a)
    client.delete(f"/api/media/{res_tmdb_b.json()['id']}/", **auth_header_b)

    print("\n==================================================")
    print(" ALL 11 E2E SECURITY & TMDB CHECKS PASSED 100% ")
    print("==================================================")

if __name__ == '__main__':
    run_verification()
