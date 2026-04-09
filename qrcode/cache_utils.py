from django.core.cache import cache


API_CACHE_VERSION_KEY = "api:response:version"


def get_api_cache_version():
    version = cache.get(API_CACHE_VERSION_KEY)
    if version is None:
        cache.set(API_CACHE_VERSION_KEY, 1, timeout=None)
        return 1
    return int(version)


def bump_api_cache_version():
    current_version = get_api_cache_version()
    cache.set(API_CACHE_VERSION_KEY, current_version + 1, timeout=None)
