from urllib.parse import urljoin

from django.conf import settings


def build_public_url(path="", base_url=None):
    origin = (base_url or settings.BACKEND_URL).rstrip("/")
    value = str(path or "").strip()
    if not value:
        return origin
    if value.startswith(("http://", "https://")):
        return value
    return urljoin(origin + "/", value.lstrip("/"))


def backend_public_url(path=""):
    return build_public_url(path, settings.BACKEND_URL)


def frontend_public_url(path=""):
    return build_public_url(path, settings.FRONTEND_URL)
