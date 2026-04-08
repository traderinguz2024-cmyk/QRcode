import json
import mimetypes
from io import BytesIO
from pathlib import Path

from django.conf import settings
from django.http import FileResponse, Http404, HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import translation
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views import View

from .models import Category, Faculty, Product, Teacher, build_qr_image
from .public_urls import backend_public_url, frontend_public_url
from .serializers import CategorySerializer, FacultySerializer, TeacherSerializer


FRONTEND_INDEX_FILE = settings.BASE_DIR / "frontend" / "index.html"
FRONTEND_ASSETS_DIR = settings.BASE_DIR / "frontend" / "assets"
FRONTEND_BOOTSTRAP_MARKER = "<!-- QR_APP_BOOTSTRAP -->"
UTF8_ASSET_CONTENT_TYPES = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".mjs": "application/javascript; charset=utf-8",
    ".svg": "image/svg+xml; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
}


def get_language(request):
    language = request.GET.get("lang", "uz")
    return language if language in {"uz", "ru", "en"} else "uz"


def activate_request_language(request):
    language = get_language(request)
    translation.activate(language)
    request.LANGUAGE_CODE = language
    return language


def _resolve_frontend_asset(asset_path):
    assets_root = FRONTEND_ASSETS_DIR.resolve()
    resolved_path = (assets_root / asset_path).resolve()

    try:
        resolved_path.relative_to(assets_root)
    except ValueError as exc:
        raise Http404("Asset not found.") from exc

    if not resolved_path.is_file():
        raise Http404("Asset not found.")

    return resolved_path


def _get_frontend_asset_content_type(asset_path):
    suffix = asset_path.suffix.lower()
    if suffix in UTF8_ASSET_CONTENT_TYPES:
        return UTF8_ASSET_CONTENT_TYPES[suffix]

    guessed_type, _ = mimetypes.guess_type(asset_path.name)
    return guessed_type or "application/octet-stream"


def _inline_json(value):
    return json.dumps(value, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")


def _build_frontend_payload(request):
    language = get_language(request)
    lookup_request = type("LookupRequest", (), {"query_params": request.GET})()
    lookup_context = {"request": lookup_request}
    return {
        "config": {
            "backendUrl": backend_public_url(),
            "frontendUrl": frontend_public_url(),
            "defaultLanguage": language,
        },
        "bootstrap": {
            "lookups": {
                "language": language,
                "categories": CategorySerializer(Category.objects.order_by("name"), many=True, context=lookup_context).data,
                "faculties": FacultySerializer(Faculty.objects.order_by("name"), many=True, context=lookup_context).data,
                "teachers": TeacherSerializer(Teacher.objects.order_by("name"), many=True, context=lookup_context).data,
            }
        },
    }


@ensure_csrf_cookie
def render_frontend_index(request):
    payload = _build_frontend_payload(request)
    inline_scripts = "\n".join(
        [
            "<script>",
            "window.QR_APP_CONFIG=" + _inline_json(payload["config"]) + ";",
            "window.QR_APP_BOOTSTRAP=" + _inline_json(payload["bootstrap"]) + ";",
            "</script>",
        ]
    )
    return HttpResponse(
        FRONTEND_INDEX_FILE.read_text(encoding="utf-8").replace(FRONTEND_BOOTSTRAP_MARKER, inline_scripts),
        content_type="text/html; charset=utf-8",
    )


def frontend_config(request):
    config = {
        "backendUrl": backend_public_url(),
        "frontendUrl": frontend_public_url(),
        "defaultLanguage": get_language(request),
    }
    return HttpResponse(
        "window.QR_APP_CONFIG = " + json.dumps(config, ensure_ascii=False, indent=2) + ";",
        content_type="application/javascript; charset=utf-8",
    )


def serve_frontend_asset(request, path):
    asset_path = _resolve_frontend_asset(path)
    return FileResponse(asset_path.open("rb"), content_type=_get_frontend_asset_content_type(asset_path))


def index(request):
    activate_request_language(request)
    return render_frontend_index(request)


def items_detail(request, id):
    activate_request_language(request)
    get_object_or_404(Product, id=id)
    return render_frontend_index(request)


def product_qr_image(request, id):
    product = get_object_or_404(Product, id=id)
    qr_image = build_qr_image(product.build_detail_url())
    buffer = BytesIO()
    qr_image.save(buffer, format="PNG")
    response = HttpResponse(buffer.getvalue(), content_type="image/png")
    response["Content-Disposition"] = f'inline; filename="product_{product.pk}_qr.png"'
    response["Cache-Control"] = "public, max-age=3600"
    return response


class FrontendRedirectView(View):
    product_required = False
    pk_url_kwarg = "id"

    def dispatch(self, request, *args, **kwargs):
        activate_request_language(request)
        if self.product_required:
            get_object_or_404(Product, id=kwargs[self.pk_url_kwarg])
        return super().dispatch(request, *args, **kwargs)

    def get(self, request, *args, **kwargs):
        return render_frontend_index(request)


class AddItemView(FrontendRedirectView):
    pass


class EditItemView(FrontendRedirectView):
    product_required = True


class DeleteItemView(FrontendRedirectView):
    product_required = True
