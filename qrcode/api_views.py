import json
import asyncio
import hashlib
from io import BytesIO
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request as UrlRequest
from urllib.request import urlopen

from django.db.models import Q
from django.conf import settings
from django.core.cache import cache
from django.core.files.base import ContentFile
from django.middleware.csrf import get_token
from django.http import HttpResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework import status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

try:
    import edge_tts
except ImportError:  # pragma: no cover - optional dependency
    edge_tts = None

try:
    from gtts import gTTS
except ImportError:  # pragma: no cover - optional dependency
    gTTS = None

from .models import About, Category, Faculty, PersistentTtsAudio, Product, Teacher
from .public_urls import backend_public_url, frontend_public_url
from .serializers import (
    AboutReadSerializer,
    AboutWriteSerializer,
    CategorySerializer,
    FacultySerializer,
    ProductReadSerializer,
    ProductWriteSerializer,
    TeacherSerializer,
)

API_CACHE_VERSION_KEY = "api:response:version"


product_request_schema = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={
        "name": openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                "en": openapi.Schema(type=openapi.TYPE_STRING),
                "ru": openapi.Schema(type=openapi.TYPE_STRING),
                "uz": openapi.Schema(type=openapi.TYPE_STRING),
            },
        ),
        "description": openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                "en": openapi.Schema(type=openapi.TYPE_STRING),
                "ru": openapi.Schema(type=openapi.TYPE_STRING),
                "uz": openapi.Schema(type=openapi.TYPE_STRING),
            },
        ),
        "faculty_id": openapi.Schema(type=openapi.TYPE_INTEGER),
        "teacher_id": openapi.Schema(type=openapi.TYPE_INTEGER),
        "category_id": openapi.Schema(type=openapi.TYPE_INTEGER),
        "faculty_name": openapi.Schema(type=openapi.TYPE_STRING),
        "teacher_name": openapi.Schema(type=openapi.TYPE_STRING),
        "category_name": openapi.Schema(type=openapi.TYPE_STRING),
    },
    required=["name"],
)

about_request_schema = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={
        "item": openapi.Schema(type=openapi.TYPE_INTEGER),
        "about": openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                "en": openapi.Schema(type=openapi.TYPE_STRING),
                "ru": openapi.Schema(type=openapi.TYPE_STRING),
                "uz": openapi.Schema(type=openapi.TYPE_STRING),
            },
        ),
    },
    required=["item"],
)

lookup_search_parameter = openapi.Parameter(
    "search",
    openapi.IN_QUERY,
    description="Case-insensitive partial match by name.",
    type=openapi.TYPE_STRING,
)

product_list_parameters = [
    openapi.Parameter(
        "search",
        openapi.IN_QUERY,
        description="Case-insensitive partial match by product name, description, faculty, teacher, or category.",
        type=openapi.TYPE_STRING,
    ),
    openapi.Parameter(
        "faculty_id",
        openapi.IN_QUERY,
        description="Filter by faculty id.",
        type=openapi.TYPE_INTEGER,
    ),
    openapi.Parameter(
        "teacher_id",
        openapi.IN_QUERY,
        description="Filter by teacher id.",
        type=openapi.TYPE_INTEGER,
    ),
    openapi.Parameter(
        "category_id",
        openapi.IN_QUERY,
        description="Filter by category id.",
        type=openapi.TYPE_INTEGER,
    ),
    openapi.Parameter(
        "faculty_name",
        openapi.IN_QUERY,
        description="Case-insensitive partial match by faculty name.",
        type=openapi.TYPE_STRING,
    ),
    openapi.Parameter(
        "teacher_name",
        openapi.IN_QUERY,
        description="Case-insensitive partial match by teacher name.",
        type=openapi.TYPE_STRING,
    ),
    openapi.Parameter(
        "category_name",
        openapi.IN_QUERY,
        description="Case-insensitive partial match by category name.",
        type=openapi.TYPE_STRING,
    ),
]


def get_query_text(request, key):
    return request.query_params.get(key, "").strip()


def get_query_int(request, key):
    raw_value = request.query_params.get(key)
    if raw_value in {None, ""}:
        return None

    try:
        return int(raw_value)
    except (TypeError, ValueError) as exc:
        raise ValidationError({key: "Must be an integer."}) from exc


@swagger_auto_schema(
    method="get",
    operation_summary="Bootstrap frontend session",
)
@api_view(["GET"])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def frontend_bootstrap(request):
    backend_url = backend_public_url(request=request)
    frontend_url = frontend_public_url(request=request)
    return Response(
        {
            "csrfToken": get_token(request),
            "backendUrl": backend_url,
            "frontendUrl": frontend_url,
            "api": {
                "bootstrap": backend_public_url("/api/bootstrap/", request=request),
                "products": backend_public_url("/api/products/", request=request),
                "categories": backend_public_url("/api/categories/", request=request),
                "faculties": backend_public_url("/api/faculties/", request=request),
                "teachers": backend_public_url("/api/teachers/", request=request),
                "tts": backend_public_url("/api/tts/", request=request),
            },
            "languages": ["uz", "ru", "en"],
            "tts": {
                "provider": "hybrid" if gTTS or edge_tts else ("yandex" if settings.YANDEX_TTS_API_KEY else ""),
            },
        }
    )


async def _edge_tts_bytes(text, voice):
    communicate = edge_tts.Communicate(text, voice=voice)
    audio_chunks = []
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_chunks.append(chunk["data"])
    return b"".join(audio_chunks)


def synthesize_edge_tts(text, language):
    if language != "uz":
        raise ValidationError({"lang": "Edge TTS is currently enabled only for Uzbek."})
    if edge_tts is None:
        raise ValidationError({"detail": "Edge TTS is not available on the server."})
    return asyncio.run(_edge_tts_bytes(text, settings.EDGE_TTS_UZ_VOICE))


def synthesize_gtts(text, language):
    if language not in {"ru", "en"}:
        raise ValidationError({"lang": "Google TTS is currently enabled only for Russian and English."})
    if gTTS is None:
        raise ValidationError({"detail": "gTTS is not available on the server."})

    buffer = BytesIO()
    gTTS(text=text, lang=language).write_to_fp(buffer)
    return buffer.getvalue()


def synthesize_yandex_tts(text, language):
    if language != "uz":
        raise ValidationError({"lang": "Server-side TTS is currently enabled only for Uzbek."})
    if not settings.YANDEX_TTS_API_KEY:
        raise ValidationError({"detail": "Yandex TTS is not configured on the server."})

    payload = urlencode(
        {
            "text": text,
            "lang": "uz-UZ",
            "voice": settings.YANDEX_TTS_UZ_VOICE,
            "format": "oggopus",
        }
    ).encode("utf-8")
    request = UrlRequest(
        settings.YANDEX_TTS_API_URL,
        data=payload,
        headers={
            "Authorization": f"Api-Key {settings.YANDEX_TTS_API_KEY}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=settings.YANDEX_TTS_TIMEOUT) as response:
            return response.read()
    except HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="ignore")
        raise ValidationError({"detail": error_body or "Yandex TTS request failed."}) from exc
    except URLError as exc:
        raise ValidationError({"detail": "Unable to reach Yandex TTS."}) from exc


def resolve_tts_backend(language):
    if language == "uz":
        if edge_tts is not None:
            return {
                "provider": f"edge-tts:{settings.EDGE_TTS_UZ_VOICE}",
                "content_type": "audio/mpeg",
                "extension": "mp3",
                "synthesizer": synthesize_edge_tts,
            }
        return {
            "provider": f"yandex:{settings.YANDEX_TTS_UZ_VOICE}",
            "content_type": "audio/ogg",
            "extension": "ogg",
            "synthesizer": synthesize_yandex_tts,
        }
    if language in {"ru", "en"}:
        return {
            "provider": f"gtts:{language}",
            "content_type": "audio/mpeg",
            "extension": "mp3",
            "synthesizer": synthesize_gtts,
        }
    raise ValidationError({"lang": "Supported languages are uz, ru, and en."})


def build_tts_cache_key(language, text, provider):
    digest = build_tts_text_digest(text)
    return f"tts:{provider}:{language}:{digest}"


def build_tts_text_digest(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def persistent_tts_entry_has_blob(entry):
    return bool(entry is not None and entry.audio_blob is not None and len(entry.audio_blob) > 0)


def persistent_tts_entry_has_audio(entry):
    return bool(entry is not None and (persistent_tts_entry_has_blob(entry) or entry.audio_file))


def load_persistent_tts_entry(language, text_digest, provider):
    exact_entry = PersistentTtsAudio.objects.filter(
        language=language,
        provider=provider,
        text_hash=text_digest,
    ).first()
    if persistent_tts_entry_has_audio(exact_entry):
        return exact_entry

    fallback_entry = PersistentTtsAudio.objects.filter(
        language=language,
        text_hash=text_digest,
    ).exclude(provider=provider).order_by("-updated_at").first()
    if persistent_tts_entry_has_audio(fallback_entry):
        return fallback_entry
    return None


def read_persistent_tts_audio(entry):
    if persistent_tts_entry_has_blob(entry):
        return bytes(entry.audio_blob)

    if not entry or not entry.audio_file:
        return None

    try:
        with entry.audio_file.open("rb") as audio_stream:
            return audio_stream.read()
    except OSError:
        return None


def persist_tts_audio(language, text, text_digest, provider, content_type, extension, audio_bytes):
    entry, _ = PersistentTtsAudio.objects.get_or_create(
        language=language,
        provider=provider,
        text_hash=text_digest,
        defaults={
            "source_text": text,
            "content_type": content_type,
            "extension": extension,
        },
    )
    entry.source_text = text
    entry.content_type = content_type
    entry.extension = extension
    entry.audio_blob = audio_bytes

    has_stored_file = bool(entry.audio_file and entry.audio_file.name and entry.audio_file.storage.exists(entry.audio_file.name))
    if not has_stored_file:
        file_name = f"{text_digest}.{extension.lstrip('.') or 'mp3'}"
        entry.audio_file.save(file_name, ContentFile(audio_bytes), save=False)

    entry.save()
    return entry


def get_api_cache_version():
    version = cache.get(API_CACHE_VERSION_KEY)
    if version is None:
        cache.set(API_CACHE_VERSION_KEY, 1, timeout=None)
        return 1
    return int(version)


def bump_api_cache_version():
    current_version = get_api_cache_version()
    cache.set(API_CACHE_VERSION_KEY, current_version + 1, timeout=None)


def build_api_response_cache_key(namespace, request):
    version = get_api_cache_version()
    request_digest = hashlib.sha256(request.build_absolute_uri().encode("utf-8")).hexdigest()
    return f"api-response:v{version}:{namespace}:{request_digest}"


def get_cached_api_payload(namespace, request):
    return cache.get(build_api_response_cache_key(namespace, request))


def cache_api_payload(namespace, request, payload, timeout):
    cache.set(build_api_response_cache_key(namespace, request), payload, timeout=timeout)
    return payload


@swagger_auto_schema(
    method="post",
    operation_summary="Synthesize speech from text",
    request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        properties={
            "text": openapi.Schema(type=openapi.TYPE_STRING),
            "lang": openapi.Schema(type=openapi.TYPE_STRING, default="uz"),
        },
        required=["text"],
    ),
    responses={200: "audio"},
)
@api_view(["POST"])
@permission_classes([AllowAny])
def text_to_speech(request):
    text = str(request.data.get("text", "")).strip()
    language = str(request.data.get("lang", "uz")).strip().lower()

    if not text:
        raise ValidationError({"text": "This field is required."})
    backend = resolve_tts_backend(language)
    text_digest = build_tts_text_digest(text)
    cache_key = build_tts_cache_key(language, text, backend["provider"])
    audio_bytes = cache.get(cache_key)
    response_content_type = backend["content_type"]
    response_extension = backend["extension"]
    if audio_bytes is None:
        persistent_entry = load_persistent_tts_entry(language, text_digest, backend["provider"])
        if persistent_entry is not None:
            audio_bytes = read_persistent_tts_audio(persistent_entry)
            if audio_bytes is not None:
                response_content_type = persistent_entry.content_type or response_content_type
                response_extension = persistent_entry.extension or response_extension
    if audio_bytes is None:
        audio_bytes = backend["synthesizer"](text, language)
        persisted_entry = persist_tts_audio(
            language,
            text,
            text_digest,
            backend["provider"],
            backend["content_type"],
            backend["extension"],
            audio_bytes,
        )
        response_content_type = persisted_entry.content_type or response_content_type
        response_extension = persisted_entry.extension or response_extension
    if audio_bytes is not None:
        cache.set(cache_key, audio_bytes, timeout=settings.TTS_CACHE_TIMEOUT)

    response = HttpResponse(audio_bytes, content_type=response_content_type)
    response["Content-Disposition"] = f'inline; filename="tts.{response_extension}"'
    response["Cache-Control"] = "no-store"
    return response


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related("faculty", "teacher", "category", "about_entry").order_by("-created_at")
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def get_serializer_class(self):
        if self.action in {"create", "update", "partial_update"}:
            return ProductWriteSerializer
        return ProductReadSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        faculty_id = get_query_int(self.request, "faculty_id")
        teacher_id = get_query_int(self.request, "teacher_id")
        category_id = get_query_int(self.request, "category_id")

        if faculty_id is not None:
            queryset = queryset.filter(faculty_id=faculty_id)
        if teacher_id is not None:
            queryset = queryset.filter(teacher_id=teacher_id)
        if category_id is not None:
            queryset = queryset.filter(category_id=category_id)

        faculty_name = get_query_text(self.request, "faculty_name")
        teacher_name = get_query_text(self.request, "teacher_name")
        category_name = get_query_text(self.request, "category_name")
        search = get_query_text(self.request, "search")

        if faculty_name:
            queryset = queryset.filter(
                Q(faculty__name__icontains=faculty_name)
                | Q(faculty__name_ru__icontains=faculty_name)
                | Q(faculty__name_en__icontains=faculty_name)
            )
        if teacher_name:
            queryset = queryset.filter(
                Q(teacher__name__icontains=teacher_name)
                | Q(teacher__name_ru__icontains=teacher_name)
                | Q(teacher__name_en__icontains=teacher_name)
            )
        if category_name:
            queryset = queryset.filter(
                Q(category__name__icontains=category_name)
                | Q(category__name_ru__icontains=category_name)
                | Q(category__name_en__icontains=category_name)
            )
        if search:
            queryset = queryset.filter(
                Q(name_uz__icontains=search)
                | Q(name_ru__icontains=search)
                | Q(name_en__icontains=search)
                | Q(description_uz__icontains=search)
                | Q(description_ru__icontains=search)
                | Q(description_en__icontains=search)
                | Q(faculty__name__icontains=search)
                | Q(faculty__name_ru__icontains=search)
                | Q(faculty__name_en__icontains=search)
                | Q(teacher__name__icontains=search)
                | Q(teacher__name_ru__icontains=search)
                | Q(teacher__name_en__icontains=search)
                | Q(category__name__icontains=search)
                | Q(category__name_ru__icontains=search)
                | Q(category__name_en__icontains=search)
            )

        return queryset.distinct()

    @swagger_auto_schema(
        operation_summary="List products",
        manual_parameters=product_list_parameters,
        responses={200: ProductReadSerializer(many=True)},
    )
    def list(self, request, *args, **kwargs):
        cached_payload = get_cached_api_payload("products:list", request)
        if cached_payload is not None:
            return Response(cached_payload)
        response = super().list(request, *args, **kwargs)
        cache_api_payload("products:list", request, response.data, settings.API_RESPONSE_CACHE_TIMEOUT)
        return response

    @swagger_auto_schema(
        operation_summary="Create product",
        request_body=product_request_schema,
        responses={201: ProductReadSerializer},
    )
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        bump_api_cache_version()
        headers = self.get_success_headers(serializer.data)
        read_data = ProductReadSerializer(serializer.instance, context=self.get_serializer_context()).data
        return Response(read_data, status=status.HTTP_201_CREATED, headers=headers)

    @swagger_auto_schema(
        operation_summary="Retrieve product",
        responses={200: ProductReadSerializer},
    )
    def retrieve(self, request, *args, **kwargs):
        cached_payload = get_cached_api_payload("products:detail", request)
        if cached_payload is not None:
            return Response(cached_payload)
        response = super().retrieve(request, *args, **kwargs)
        cache_api_payload("products:detail", request, response.data, settings.API_RESPONSE_CACHE_TIMEOUT)
        return response

    @swagger_auto_schema(
        operation_summary="Update product",
        request_body=product_request_schema,
        responses={200: ProductReadSerializer},
    )
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        bump_api_cache_version()
        read_data = ProductReadSerializer(serializer.instance, context=self.get_serializer_context()).data
        return Response(read_data)

    @swagger_auto_schema(
        operation_summary="Partial update product",
        request_body=product_request_schema,
        responses={200: ProductReadSerializer},
    )
    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        response = super().destroy(request, *args, **kwargs)
        bump_api_cache_version()
        return response


class FacultyViewSet(viewsets.ModelViewSet):
    queryset = Faculty.objects.order_by("name")
    serializer_class = FacultySerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        search = get_query_text(self.request, "search")
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(name_ru__icontains=search)
                | Q(name_en__icontains=search)
            )
        return queryset

    @swagger_auto_schema(
        operation_summary="List faculties",
        manual_parameters=[lookup_search_parameter],
        responses={200: FacultySerializer(many=True)},
    )
    def list(self, request, *args, **kwargs):
        cached_payload = get_cached_api_payload("faculties:list", request)
        if cached_payload is not None:
            return Response(cached_payload)
        response = super().list(request, *args, **kwargs)
        cache_api_payload("faculties:list", request, response.data, settings.LOOKUP_RESPONSE_CACHE_TIMEOUT)
        return response


class TeacherViewSet(viewsets.ModelViewSet):
    queryset = Teacher.objects.order_by("name")
    serializer_class = TeacherSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        search = get_query_text(self.request, "search")
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(name_ru__icontains=search)
                | Q(name_en__icontains=search)
            )
        return queryset

    @swagger_auto_schema(
        operation_summary="List teachers",
        manual_parameters=[lookup_search_parameter],
        responses={200: TeacherSerializer(many=True)},
    )
    def list(self, request, *args, **kwargs):
        cached_payload = get_cached_api_payload("teachers:list", request)
        if cached_payload is not None:
            return Response(cached_payload)
        response = super().list(request, *args, **kwargs)
        cache_api_payload("teachers:list", request, response.data, settings.LOOKUP_RESPONSE_CACHE_TIMEOUT)
        return response


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.order_by("name")
    serializer_class = CategorySerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        search = get_query_text(self.request, "search")
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(name_ru__icontains=search)
                | Q(name_en__icontains=search)
            )
        return queryset

    @swagger_auto_schema(
        operation_summary="List categories",
        manual_parameters=[lookup_search_parameter],
        responses={200: CategorySerializer(many=True)},
    )
    def list(self, request, *args, **kwargs):
        cached_payload = get_cached_api_payload("categories:list", request)
        if cached_payload is not None:
            return Response(cached_payload)
        response = super().list(request, *args, **kwargs)
        cache_api_payload("categories:list", request, response.data, settings.LOOKUP_RESPONSE_CACHE_TIMEOUT)
        return response


class AboutViewSet(viewsets.ModelViewSet):
    queryset = About.objects.select_related("item").order_by("id")
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def get_serializer_class(self):
        if self.action in {"create", "update", "partial_update"}:
            return AboutWriteSerializer
        return AboutReadSerializer

    @swagger_auto_schema(
        operation_summary="List about entries",
        responses={200: AboutReadSerializer(many=True)},
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @swagger_auto_schema(
        operation_summary="Create about entry",
        request_body=about_request_schema,
        responses={201: AboutReadSerializer},
    )
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        read_data = AboutReadSerializer(serializer.instance, context=self.get_serializer_context()).data
        return Response(read_data, status=status.HTTP_201_CREATED, headers=headers)

    @swagger_auto_schema(
        operation_summary="Retrieve about entry",
        responses={200: AboutReadSerializer},
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @swagger_auto_schema(
        operation_summary="Update about entry",
        request_body=about_request_schema,
        responses={200: AboutReadSerializer},
    )
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        read_data = AboutReadSerializer(serializer.instance, context=self.get_serializer_context()).data
        return Response(read_data)

    @swagger_auto_schema(
        operation_summary="Partial update about entry",
        request_body=about_request_schema,
        responses={200: AboutReadSerializer},
    )
    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)
