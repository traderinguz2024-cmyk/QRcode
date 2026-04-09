from urllib.parse import urlsplit


LOCAL_HOST_NAMES = {"localhost", "127.0.0.1", "::1"}


def normalize_origin(origin, *, default_scheme="https"):
    value = str(origin or "").strip()
    if not value:
        return ""

    value = value.rstrip("/")
    if "://" not in value:
        host = value.split("/", 1)[0].strip("[]").lower()
        scheme = "http" if host in LOCAL_HOST_NAMES or host.startswith(("localhost:", "127.0.0.1:")) else default_scheme
        value = f"{scheme}://{value.lstrip('/')}"

    parts = urlsplit(value)
    if not parts.netloc:
        return value.lower()

    scheme = (parts.scheme or default_scheme).lower()
    hostname = (parts.hostname or "").lower()
    if not hostname:
        return value.lower()

    port = parts.port
    if port and not ((scheme == "http" and port == 80) or (scheme == "https" and port == 443)):
        return f"{scheme}://{hostname}:{port}"
    return f"{scheme}://{hostname}"


def normalize_origin_list(origins, *, default_scheme="https"):
    normalized = []
    seen = set()

    for origin in origins:
        value = normalize_origin(origin, default_scheme=default_scheme)
        if not value or value in seen:
            continue
        normalized.append(value)
        seen.add(value)

    return normalized
