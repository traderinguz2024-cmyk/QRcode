import hashlib

from django.db.models import Q
from django.conf import settings
from django.core.cache import cache
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework import status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from .cache_utils import get_api_cache_version
from .models import About, Category, Faculty, Product, Teacher
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
            },
            "languages": ["uz", "ru", "en"],
        }
    )


def build_api_response_cache_key(namespace, request):
    version = get_api_cache_version()
    request_digest = hashlib.sha256(request.build_absolute_uri().encode("utf-8")).hexdigest()
    return f"api-response:v{version}:{namespace}:{request_digest}"


def get_cached_api_payload(namespace, request):
    return cache.get(build_api_response_cache_key(namespace, request))


def cache_api_payload(namespace, request, payload, timeout):
    cache.set(build_api_response_cache_key(namespace, request), payload, timeout=timeout)
    return payload


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related("faculty", "teacher", "category", "about_entry").order_by("-created_at", "-pk")
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
        return super().destroy(request, *args, **kwargs)


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
