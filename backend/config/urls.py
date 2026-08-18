from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse


def home(request):
    return JsonResponse({
        "message": "Movie Watchlist API is running",
        "status": "success"
    })


urlpatterns = [
    path("", home, name="home"),
    path("admin/", admin.site.urls),
    path("api/", include("watchlist.urls")),
]