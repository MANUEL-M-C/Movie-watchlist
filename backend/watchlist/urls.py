from django.urls import path
from . import views

urlpatterns = [
    path('', views.WatchListAV.as_view(), name='watchlist-list'),
    path('<int:pk>/', views.WatchDetailAV.as_view(), name='watchlist-detail'),
]