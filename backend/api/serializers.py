from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from .models import Media


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']


class RegisterSerializer(serializers.ModelSerializer):
    username = serializers.CharField(
        required=True,
        validators=[
            UniqueValidator(
                queryset=User.objects.all(),
                message="Username already exists.",
                lookup="iexact"
            )
        ]
    )
    password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'},
        trim_whitespace=False
    )
    email = serializers.EmailField(
        required=False,
        allow_blank=True,
        default=''
    )

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password']
        extra_kwargs = {
            'username': {
                'error_messages': {
                    'blank': 'Username is required.',
                }
            }
        }

    def validate_username(self, value):
        trimmed = value.strip()
        if not trimmed:
            raise serializers.ValidationError("Username is required.")
        if User.objects.filter(username__iexact=trimmed).exists():
            raise serializers.ValidationError("Username already exists.")
        return trimmed

    def validate_password(self, value):
        username = self.initial_data.get('username', '')
        user = User(username=username) if username else None
        try:
            validate_password(value, user=user)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', '') or '',
            password=validated_data['password']
        )
        return user


class MediaSerializer(serializers.ModelSerializer):
    owner = serializers.ReadOnlyField(source='owner.username')

    class Meta:
        model = Media
        fields = [
            'id', 'title', 'type', 'status', 'rating',
            'tmdb_id', 'poster_path', 'genre', 'tmdb_rating',
            'overview', 'release_date', 'owner', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'owner', 'created_at', 'updated_at']

    def to_internal_value(self, data):
        # Convert genre array to comma-separated string if provided as array
        if isinstance(data, dict) and isinstance(data.get('genre'), list):
            data = data.copy()
            data['genre'] = ', '.join([str(g) for g in data['genre'] if g])
        return super().to_internal_value(data)

    def validate_rating(self, value):
        if value < 0 or value > 5:
            raise serializers.ValidationError("Rating must be between 0 and 5.")
        return value

    def validate(self, attrs):
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            owner = request.user
            tmdb_id = attrs.get('tmdb_id')
            if tmdb_id is not None:
                qs = Media.objects.filter(owner=owner, tmdb_id=tmdb_id)
                if self.instance:
                    qs = qs.exclude(pk=self.instance.pk)
                if qs.exists():
                    raise serializers.ValidationError({
                        "tmdb_id": "This title is already in your watchlist."
                    })
        return attrs
