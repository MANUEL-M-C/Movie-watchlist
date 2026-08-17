from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator


class Media(models.Model):
    TYPE_CHOICES = [
        ('Movie', 'Movie'),
        ('TV', 'TV'),
    ]

    STATUS_CHOICES = [
        ('Unwatched', 'Unwatched'),
        ('Watched', 'Watched'),
    ]

    title = models.CharField(max_length=255)
    type = models.CharField(max_length=10, choices=TYPE_CHOICES, default='Movie')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='Unwatched')
    rating = models.IntegerField(
        default=0,
        validators=[
            MinValueValidator(0),
            MaxValueValidator(5)
        ]
    )
    # TMDB Integration Fields
    tmdb_id = models.IntegerField(null=True, blank=True, db_index=True)
    poster_path = models.CharField(max_length=255, blank=True, default='')
    genre = models.CharField(max_length=255, blank=True, default='')
    tmdb_rating = models.FloatField(default=0.0, blank=True, null=True)
    overview = models.TextField(blank=True, default='')
    release_date = models.CharField(max_length=50, blank=True, default='')

    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='media_items')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['owner', 'tmdb_id'],
                condition=models.Q(tmdb_id__isnull=False),
                name='unique_user_tmdb_media'
            )
        ]

    def __str__(self):
        return f"{self.title} ({self.type}) - {self.owner.username}"
