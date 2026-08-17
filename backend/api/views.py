from rest_framework import viewsets, permissions, generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth.models import User
from .models import Media
from .serializers import MediaSerializer, RegisterSerializer, UserSerializer
from .services import tmdb


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        return Response({
            'message': 'Registration successful.',
            'user': UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)


class CurrentUserView(APIView):
    """
    Returns the currently authenticated user's details.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class TMDBSearchView(APIView):
    """
    Search TMDB for movies or TV shows.
    Requires JWT authentication.
    Endpoints:
      GET /api/tmdb/search/?query=inception&type=movie
      GET /api/tmdb/search/?query=breaking&type=tv
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        query = request.query_params.get('query', '').strip()
        media_type = request.query_params.get('type', 'movie').strip().lower()

        if not query:
            return Response(
                {'error': 'Enter a movie or TV show name.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            if media_type == 'tv':
                results = tmdb.search_tv(query)
            else:
                results = tmdb.search_movies(query)

            return Response({'results': results}, status=status.HTTP_200_OK)
        except tmdb.TMDBServiceError as e:
            return Response(
                {'error': e.message},
                status=e.status_code
            )
        except Exception:
            return Response(
                {'error': 'Movie service is temporarily unavailable.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )


class MediaViewSet(viewsets.ModelViewSet):
    """
    ModelViewSet for Media items.
    Strictly scoped to the authenticated user.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = MediaSerializer

    def get_queryset(self):
        # Explicit user-level isolation: never return items belonging to other users
        return Media.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        # Auto-assign the authenticated user from JWT context
        serializer.save(owner=self.request.user)
