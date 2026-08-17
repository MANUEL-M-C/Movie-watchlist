"""
TMDB API Service
Handles communication with The Movie Database (TMDB) API v3 using Bearer token authentication.
"""

import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

TMDB_BASE_URL = "https://api.themoviedb.org/3"
TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500"

# Standard TMDB Genre Mappings (Movie + TV)
GENRE_MAP = {
    # Movie Genres
    28: "Action",
    12: "Adventure",
    16: "Animation",
    35: "Comedy",
    80: "Crime",
    99: "Documentary",
    18: "Drama",
    10751: "Family",
    14: "Fantasy",
    36: "History",
    27: "Horror",
    10402: "Music",
    9648: "Mystery",
    10749: "Romance",
    878: "Science Fiction",
    10770: "TV Movie",
    53: "Thriller",
    10752: "War",
    37: "Western",
    # TV Genres
    10759: "Action & Adventure",
    10762: "Kids",
    10763: "News",
    10764: "Reality",
    10765: "Sci-Fi & Fantasy",
    10766: "Soap",
    10767: "Talk",
    10768: "War & Politics",
}


class TMDBServiceError(Exception):
    """Custom exception for TMDB API errors."""
    def __init__(self, message, status_code=500):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def get_auth_headers():
    """Builds the authorization headers using TMDB_API_READ_ACCESS_TOKEN from settings."""
    token = getattr(settings, 'TMDB_API_READ_ACCESS_TOKEN', '')
    if not token or token == 'YOUR_TOKEN_HERE' or token == 'YOUR_TMDB_API_READ_ACCESS_TOKEN_HERE':
        raise TMDBServiceError(
            "TMDB API Read Access Token is not configured. Please set TMDB_API_READ_ACCESS_TOKEN in your backend .env file.",
            status_code=503
        )
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json;charset=utf-8",
        "Accept": "application/json"
    }


def map_genre_ids_to_names(genre_ids, custom_genres=None):
    """Converts a list of genre IDs to a list of readable genre names."""
    if not genre_ids:
        return []
    
    genres = []
    for gid in genre_ids:
        if custom_genres and gid in custom_genres:
            genres.append(custom_genres[gid])
        elif gid in GENRE_MAP:
            genres.append(GENRE_MAP[gid])
    return genres


def format_movie_result(item):
    """Normalizes raw TMDB movie payload to the standard application schema."""
    genre_ids = item.get('genre_ids', [])
    # Also handle if genres is returned as objects with 'name' (e.g. from details endpoint)
    if 'genres' in item and isinstance(item['genres'], list):
        genres = [g['name'] for g in item['genres'] if isinstance(g, dict) and 'name' in g]
    else:
        genres = map_genre_ids_to_names(genre_ids)

    return {
        'tmdb_id': item.get('id'),
        'title': item.get('title') or item.get('original_title') or 'Untitled Movie',
        'type': 'Movie',
        'overview': item.get('overview', ''),
        'poster_path': item.get('poster_path'),
        'release_date': item.get('release_date', ''),
        'genre': genres,
        'tmdb_rating': round(float(item.get('vote_average', 0.0)), 1) if item.get('vote_average') is not None else 0.0,
    }


def format_tv_result(item):
    """Normalizes raw TMDB TV payload to the standard application schema."""
    genre_ids = item.get('genre_ids', [])
    if 'genres' in item and isinstance(item['genres'], list):
        genres = [g['name'] for g in item['genres'] if isinstance(g, dict) and 'name' in g]
    else:
        genres = map_genre_ids_to_names(genre_ids)

    return {
        'tmdb_id': item.get('id'),
        'title': item.get('name') or item.get('original_name') or 'Untitled Show',
        'type': 'TV',
        'overview': item.get('overview', ''),
        'poster_path': item.get('poster_path'),
        'release_date': item.get('first_air_date', ''),
        'genre': genres,
        'tmdb_rating': round(float(item.get('vote_average', 0.0)), 1) if item.get('vote_average') is not None else 0.0,
    }


def search_movies(query, page=1):
    """
    Search TMDB for movies matching query.
    Returns: list of formatted movie dicts.
    """
    if not query or not query.strip():
        return []

    headers = get_auth_headers()
    url = f"{TMDB_BASE_URL}/search/movie"
    params = {
        "query": query.strip(),
        "include_adult": "false",
        "language": "en-US",
        "page": page,
    }

    try:
        response = requests.get(url, headers=headers, params=params, timeout=10)
        if response.status_code == 401:
            raise TMDBServiceError("Invalid TMDB API Read Access Token.", status_code=401)
        response.raise_for_status()
        data = response.json()
        results = data.get('results', [])
        return [format_movie_result(item) for item in results]
    except requests.exceptions.RequestException as e:
        logger.error("TMDB Movie Search Error: %s", e)
        if isinstance(e, requests.exceptions.HTTPError) and e.response is not None:
            if e.response.status_code == 401:
                raise TMDBServiceError("Invalid TMDB API Read Access Token.", status_code=401)
        raise TMDBServiceError("Movie service is temporarily unavailable.", status_code=503)


def search_tv(query, page=1):
    """
    Search TMDB for TV shows matching query.
    Returns: list of formatted TV show dicts.
    """
    if not query or not query.strip():
        return []

    headers = get_auth_headers()
    url = f"{TMDB_BASE_URL}/search/tv"
    params = {
        "query": query.strip(),
        "include_adult": "false",
        "language": "en-US",
        "page": page,
    }

    try:
        response = requests.get(url, headers=headers, params=params, timeout=10)
        if response.status_code == 401:
            raise TMDBServiceError("Invalid TMDB API Read Access Token.", status_code=401)
        response.raise_for_status()
        data = response.json()
        results = data.get('results', [])
        return [format_tv_result(item) for item in results]
    except requests.exceptions.RequestException as e:
        logger.error("TMDB TV Search Error: %s", e)
        if isinstance(e, requests.exceptions.HTTPError) and e.response is not None:
            if e.response.status_code == 401:
                raise TMDBServiceError("Invalid TMDB API Read Access Token.", status_code=401)
        raise TMDBServiceError("Movie service is temporarily unavailable.", status_code=503)


def get_movie_details(tmdb_id):
    """Fetches details for a specific movie by TMDB ID."""
    headers = get_auth_headers()
    url = f"{TMDB_BASE_URL}/movie/{tmdb_id}"
    params = {"language": "en-US"}

    try:
        response = requests.get(url, headers=headers, params=params, timeout=10)
        if response.status_code == 401:
            raise TMDBServiceError("Invalid TMDB API Read Access Token.", status_code=401)
        response.raise_for_status()
        return format_movie_result(response.json())
    except requests.exceptions.RequestException as e:
        logger.error("TMDB Movie Details Error: %s", e)
        raise TMDBServiceError("Movie service is temporarily unavailable.", status_code=503)


def get_tv_details(tmdb_id):
    """Fetches details for a specific TV show by TMDB ID."""
    headers = get_auth_headers()
    url = f"{TMDB_BASE_URL}/tv/{tmdb_id}"
    params = {"language": "en-US"}

    try:
        response = requests.get(url, headers=headers, params=params, timeout=10)
        if response.status_code == 401:
            raise TMDBServiceError("Invalid TMDB API Read Access Token.", status_code=401)
        response.raise_for_status()
        return format_tv_result(response.json())
    except requests.exceptions.RequestException as e:
        logger.error("TMDB TV Details Error: %s", e)
        raise TMDBServiceError("Movie service is temporarily unavailable.", status_code=503)
