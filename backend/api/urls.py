from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from .views import MediaViewSet, RegisterView, CurrentUserView, TMDBSearchView

router = DefaultRouter()
router.register(r'media', MediaViewSet, basename='media')

urlpatterns = [
    # JWT Auth Endpoints
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Registration & User Info
    path('register/', RegisterView.as_view(), name='register'),
    path('me/', CurrentUserView.as_view(), name='current_user'),

    # TMDB Search Endpoint
    path('tmdb/search/', TMDBSearchView.as_view(), name='tmdb_search'),

    # Media CRUD endpoints
    path('', include(router.urls)),
]
