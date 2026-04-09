import os
from pathlib import Path

from core.env import load_env_file
from core.origins import normalize_origin_list

BASE_DIR = Path(__file__).resolve().parent.parent
load_env_file(BASE_DIR / ".env")

def env_bool(name, default=False):
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


DEBUG = env_bool("DEBUG", True)
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "").strip() or "dev-only-insecure-secret-key"
if not DEBUG and SECRET_KEY == "dev-only-insecure-secret-key":
    raise RuntimeError("DJANGO_SECRET_KEY must be set when DEBUG=0.")

USE_X_FORWARDED_HOST = env_bool("USE_X_FORWARDED_HOST", True)
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = env_bool("SECURE_SSL_REDIRECT", not DEBUG)
SESSION_COOKIE_SECURE = env_bool("SESSION_COOKIE_SECURE", not DEBUG)
CSRF_COOKIE_SECURE = env_bool("CSRF_COOKIE_SECURE", not DEBUG)
SECURE_HSTS_SECONDS = int(os.getenv("SECURE_HSTS_SECONDS", "31536000" if not DEBUG else "0"))
SECURE_HSTS_INCLUDE_SUBDOMAINS = env_bool("SECURE_HSTS_INCLUDE_SUBDOMAINS", not DEBUG)
SECURE_HSTS_PRELOAD = env_bool("SECURE_HSTS_PRELOAD", not DEBUG)


def env_list(name, default):
    value = os.getenv(name)
    if not value:
        return list(default)
    return [item.strip() for item in value.split(",") if item.strip()]

DEFAULT_PUBLIC_URL = "https://qr.akadmvd.uz"
ALLOWED_HOSTS = env_list(
    "ALLOWED_HOSTS",
    [
        "qr.akadmvd.uz",
        "localhost",
        "127.0.0.1",
    ],
)
BACKEND_URL = os.getenv("BACKEND_URL", DEFAULT_PUBLIC_URL).rstrip("/")
FRONTEND_URL = os.getenv("FRONTEND_URL", DEFAULT_PUBLIC_URL).rstrip("/")
DEFAULT_FRONTEND_ALLOWED_ORIGINS = [
    FRONTEND_URL,
    DEFAULT_PUBLIC_URL,
    "http://localhost:4173",
    "http://localhost:5173",
]
FRONTEND_ALLOWED_ORIGINS = normalize_origin_list(
    [
        *env_list("FRONTEND_ALLOWED_ORIGINS", DEFAULT_FRONTEND_ALLOWED_ORIGINS),
        FRONTEND_URL,
        DEFAULT_PUBLIC_URL,
    ]
)
CSRF_TRUSTED_ORIGINS = FRONTEND_ALLOWED_ORIGINS
API_RESPONSE_CACHE_TIMEOUT = int(os.getenv("API_RESPONSE_CACHE_TIMEOUT", "120"))
LOOKUP_RESPONSE_CACHE_TIMEOUT = int(os.getenv("LOOKUP_RESPONSE_CACHE_TIMEOUT", "900"))


INSTALLED_APPS = [
    'jazzmin',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'drf_yasg',
    'qrcode',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.middleware.gzip.GZipMiddleware',
    'core.cors.SimpleCORSMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.locale.LocaleMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

LANGUAGE_CODE = 'uz'

LANGUAGES = [
    ('uz', "O'zbek"),
    ('ru', 'Russian'),
    ('en', 'English'),
]

LOCALE_PATHS = [
    BASE_DIR / 'locale',
]

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True

STATIC_URL = '/static/'
MEDIA_ROOT = BASE_DIR / 'media'
MEDIA_URL = '/media/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "qr-catalog-default-cache",
    }
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

