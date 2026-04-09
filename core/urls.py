from django.contrib import admin
from django.conf import settings
from django.urls import include, path
from drf_yasg import openapi
from drf_yasg.views import get_schema_view
from qrcode.views import serve_frontend_asset, serve_media_file
from rest_framework.permissions import AllowAny

schema_view = get_schema_view(
    openapi.Info(
        title="QR Code API",
        default_version="v1",
        description="API for products, categories, faculties, teachers, and about content.",
    ),
    url=settings.BACKEND_URL,
    public=True,
    permission_classes=(AllowAny,),
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path("assets/<path:path>", serve_frontend_asset, name="frontend-asset"),
    path("media/<path:path>", serve_media_file, name="media-file"),
    path('', include('qrcode.urls')),
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
]
