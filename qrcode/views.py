from io import BytesIO

from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import get_object_or_404
from django.views import View

from .models import Product, build_qr_image
from .public_urls import frontend_public_url


def redirect_to_frontend(request):
    return HttpResponseRedirect(frontend_public_url(request.get_full_path()))


def frontend_config(request):
    return redirect_to_frontend(request)


def serve_frontend_asset(request, path):
    return redirect_to_frontend(request)


def index(request):
    return redirect_to_frontend(request)


def items_detail(request, id):
    return redirect_to_frontend(request)


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
    def get(self, request, *args, **kwargs):
        return redirect_to_frontend(request)


class AddItemView(FrontendRedirectView):
    pass


class EditItemView(FrontendRedirectView):
    pass


class DeleteItemView(FrontendRedirectView):
    pass
