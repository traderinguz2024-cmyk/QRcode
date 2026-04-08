from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .api_views import AboutViewSet, CategoryViewSet, FacultyViewSet, ProductViewSet, TeacherViewSet, frontend_bootstrap, text_to_speech
from .views import *

router = DefaultRouter()
router.trailing_slash = "/?"
router.register("products", ProductViewSet, basename="api-product")
router.register("faculties", FacultyViewSet, basename="api-faculty")
router.register("teachers", TeacherViewSet, basename="api-teacher")
router.register("categories", CategoryViewSet, basename="api-category")
router.register("about", AboutViewSet, basename="api-about")

urlpatterns = [
    path('', index, name='index'),
    path('detail/<int:id>/', items_detail, name='detail'),
    path('add/', AddItemView.as_view(), name='add_item'),
    path('edit/<int:id>/', EditItemView.as_view(), name='edit_item'),
    path('delete/<int:id>/', DeleteItemView.as_view(), name='delete_item'),
    path("config.js", frontend_config, name="frontend-config"),
    path("api/bootstrap/", frontend_bootstrap, name="api-frontend-bootstrap"),
    path("api/tts/", text_to_speech, name="api-text-to-speech"),
    path("api/", include(router.urls)),
]
