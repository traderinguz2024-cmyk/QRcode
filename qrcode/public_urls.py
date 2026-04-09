from urllib.parse import urljoin

from django.conf import settings

LOCAL_DEVELOPMENT_HOSTS = {"127.0.0.1", "::1", "localhost"}


def build_public_url(path="", base_url=None):
    origin = (base_url or settings.BACKEND_URL).rstrip("/")
    value = str(path or "").strip()
    if not value:
        return origin
    if value.startswith(("http://", "https://")):
        return value
    return urljoin(origin + "/", value.lstrip("/"))


def request_origin(request):
    if request is None:
        return None
    return request.build_absolute_uri("/").rstrip("/")


def request_host_name(request):
    if request is None:
        return None
    return request.get_host().split(":", 1)[0].strip("[]").lower()


def is_local_development_request(request):
    return settings.DEBUG and request_host_name(request) in LOCAL_DEVELOPMENT_HOSTS


def backend_public_url(path="", request=None):
    base_url = request_origin(request) if is_local_development_request(request) else settings.BACKEND_URL
    return build_public_url(path, base_url)


def frontend_public_url(path="", request=None):
    base_url = request_origin(request) if is_local_development_request(request) else settings.FRONTEND_URL
    return build_public_url(path, base_url)
