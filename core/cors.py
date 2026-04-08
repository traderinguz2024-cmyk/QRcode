from django.conf import settings
from django.http import HttpResponse


class SimpleCORSMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        origin = request.headers.get("Origin")
        is_allowed_origin = origin in getattr(settings, "FRONTEND_ALLOWED_ORIGINS", [])

        if request.method == "OPTIONS" and is_allowed_origin:
            response = HttpResponse(status=204)
        else:
            response = self.get_response(request)

        if is_allowed_origin:
            response["Access-Control-Allow-Origin"] = origin
            response["Access-Control-Allow-Credentials"] = "true"
            response["Access-Control-Allow-Headers"] = (
                "Accept, Authorization, Content-Type, X-CSRFToken, X-Requested-With"
            )
            response["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            vary = response.get("Vary")
            response["Vary"] = "Origin" if not vary else f"{vary}, Origin"

        return response
