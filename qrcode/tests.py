from io import StringIO
from unittest.mock import patch

from django.conf import settings
from django.core.cache import cache
from django.core.management import call_command
from django.test import TestCase
from django.test.utils import override_settings
from rest_framework.test import APIClient

from .models import Category, Faculty, Product, Teacher


class APIFilterTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()

        self.faculty_one = Faculty.objects.create(name="Ekspert Kriminalistika")
        self.faculty_two = Faculty.objects.create(name="Tergov")

        self.teacher_one = Teacher.objects.create(name="John Doe")
        self.teacher_two = Teacher.objects.create(name="Ali Valiyev")

        self.category_one = Category.objects.create(name="Texnologiyalar")
        self.category_two = Category.objects.create(name="Mebellar")

        Product.objects.bulk_create(
            [
                Product(
                    name_uz="Kompyuter",
                    description_uz="Laboratoriya uchun",
                    faculty=self.faculty_one,
                    teacher=self.teacher_one,
                    category=self.category_one,
                ),
                Product(
                    name_uz="Stol",
                    description_uz="Auditoriya uchun",
                    faculty=self.faculty_two,
                    teacher=self.teacher_two,
                    category=self.category_two,
                ),
            ]
        )

    def test_category_search_filter(self):
        response = self.client.get("/api/categories/", {"search": "tex"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            [
                {
                    "id": self.category_one.id,
                    "name": "Texnologiyalar",
                    "name_ru": "",
                    "name_en": "",
                    "display_name": "Texnologiyalar",
                }
            ],
        )

    def test_faculty_search_filter(self):
        response = self.client.get("/api/faculties/", {"search": "ter"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            [
                {
                    "id": self.faculty_two.id,
                    "name": "Tergov",
                    "name_ru": "",
                    "name_en": "",
                    "display_name": "Tergov",
                }
            ],
        )

    def test_teacher_search_filter(self):
        response = self.client.get("/api/teachers/", {"search": "john"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            [
                {
                    "id": self.teacher_one.id,
                    "name": "John Doe",
                    "name_ru": "",
                    "name_en": "",
                    "display_name": "John Doe",
                }
            ],
        )

    def test_product_filters_by_related_ids_and_search(self):
        response = self.client.get(
            "/api/products/",
            {
                "faculty_id": self.faculty_one.id,
                "teacher_id": self.teacher_one.id,
                "category_id": self.category_one.id,
                "search": "kompyuter",
            },
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["name"]["uz"], "Kompyuter")
        self.assertEqual(data[0]["faculty_id"], self.faculty_one.id)
        self.assertEqual(data[0]["teacher_id"], self.teacher_one.id)
        self.assertEqual(data[0]["category_id"], self.category_one.id)

    def test_product_filter_rejects_invalid_integer(self):
        response = self.client.get("/api/products/", {"category_id": "abc"})

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {"category_id": "Must be an integer."})

    def test_product_can_be_created_from_flat_multipart_fields(self):
        response = self.client.post(
            "/api/products/",
            {
                "name_uz": "Printer",
                "name_ru": "Принтер",
                "name_en": "Printer",
                "description_uz": "Yangi qurilma",
                "description_ru": "Новое устройство",
                "description_en": "New device",
                "faculty_id": self.faculty_one.id,
                "teacher_id": self.teacher_one.id,
                "category_id": self.category_one.id,
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertEqual(payload["name"]["uz"], "Printer")
        self.assertEqual(payload["name"]["ru"], "Принтер")
        self.assertEqual(payload["description"]["en"], "New device")
        self.assertEqual(payload["faculty_id"], self.faculty_one.id)
        self.assertEqual(payload["teacher_id"], self.teacher_one.id)
        self.assertEqual(payload["category_id"], self.category_one.id)

    def test_product_can_be_updated_from_flat_multipart_fields(self):
        product = Product.objects.create(
            name_uz="Eski nom",
            description_uz="Eski tavsif",
            faculty=self.faculty_one,
            teacher=self.teacher_one,
            category=self.category_one,
        )

        response = self.client.patch(
            f"/api/products/{product.id}/",
            {
                "name_en": "Updated name",
                "description_en": "Updated description",
                "faculty_id": self.faculty_two.id,
                "teacher_id": self.teacher_two.id,
                "category_id": self.category_two.id,
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["name"]["en"], "Updated name")
        self.assertEqual(payload["description"]["en"], "Updated description")
        self.assertEqual(payload["faculty_id"], self.faculty_two.id)
        self.assertEqual(payload["teacher_id"], self.teacher_two.id)
        self.assertEqual(payload["category_id"], self.category_two.id)

    def test_frontend_bootstrap_sets_csrf_cookie(self):
        response = self.client.get("/api/bootstrap/", HTTP_ORIGIN=settings.FRONTEND_URL)

        self.assertEqual(response.status_code, 200)
        self.assertIn("csrftoken", response.cookies)
        payload = response.json()
        self.assertEqual(payload["backendUrl"], settings.BACKEND_URL)
        self.assertEqual(payload["frontendUrl"], settings.FRONTEND_URL)
        self.assertEqual(payload["languages"], ["uz", "ru", "en"])

    def test_html_routes_redirect_to_frontend(self):
        product = Product.objects.first()

        cases = [
            "/?lang=uz",
            "/add/?lang=ru",
            f"/detail/{product.id}/?lang=en",
            f"/edit/{product.id}/?lang=uz",
            f"/delete/{product.id}/?lang=uz",
        ]

        for path in cases:
            response = self.client.get(path, follow=False)
            self.assertEqual(response.status_code, 200)
            self.assertIn("data-spa-root", response.content.decode("utf-8"))

    def test_frontend_config_is_served_without_template_engine(self):
        response = self.client.get("/config.js?lang=ru")

        self.assertEqual(response.status_code, 200)
        body = response.content.decode("utf-8")
        self.assertIn("window.QR_APP_CONFIG", body)
        self.assertIn('"defaultLanguage": "ru"', body)

    @override_settings(
        FRONTEND_URL="https://qr.akadmvd.uz",
        BACKEND_URL="https://qr.akadmvd.uz",
    )
    def test_frontend_html_and_api_use_public_https_urls(self):
        product = Product.objects.create(name_uz="Server product")

        html_response = self.client.get("/")
        self.assertEqual(html_response.status_code, 200)
        html_body = html_response.content.decode("utf-8")
        self.assertIn('"backendUrl":"https://qr.akadmvd.uz"', html_body)
        self.assertIn('"frontendUrl":"https://qr.akadmvd.uz"', html_body)

        bootstrap_response = self.client.get("/api/bootstrap/")
        bootstrap_payload = bootstrap_response.json()
        self.assertEqual(bootstrap_payload["api"]["products"], "https://qr.akadmvd.uz/api/products/")

        products_response = self.client.get("/api/products/")
        products_payload = products_response.json()
        self.assertEqual(products_payload[0]["qr_code"], f"https://qr.akadmvd.uz/qr/{product.pk}.png")

    @override_settings(
        BACKEND_URL="https://qr.akadmvd.uz",
        FRONTEND_URL="https://qr.akadmvd.uz",
    )
    def test_product_qr_image_endpoint_returns_png(self):
        product = Product.objects.create(name_uz="QR endpoint product")

        response = self.client.get(f"/qr/{product.pk}.png")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "image/png")
        self.assertIn(f'product_{product.pk}_qr.png', response["Content-Disposition"])

    @override_settings(
        BACKEND_URL="https://qr.akadmvd.uz",
        FRONTEND_URL="https://qr.akadmvd.uz",
    )
    def test_regenerate_qr_codes_command_rebuilds_existing_products(self):
        product = Product.objects.create(name_uz="QR product")

        output = StringIO()
        call_command("regenerate_qr_codes", "--id", str(product.pk), stdout=output)

        product.refresh_from_db()
        self.assertIn(f"product_{product.pk}_qr", product.qr_code.name)
        self.assertIn("Regenerated 1 QR code(s).", output.getvalue())

    def test_frontend_assets_are_served_with_utf8_charset(self):
        response = self.client.get("/assets/app.js")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["Content-Type"], "application/javascript; charset=utf-8")
        body = b"".join(response.streaming_content)
        self.assertIn(b"(function () {", body)

    @override_settings(YANDEX_TTS_API_KEY="")
    @patch("qrcode.api_views.edge_tts", None)
    def test_tts_endpoint_returns_error_when_no_server_provider_available(self):
        response = self.client.post("/api/tts/", {"text": "Salom dunyo", "lang": "uz"}, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertIn("detail", response.json())

    @patch("qrcode.api_views.synthesize_edge_tts", return_value=b"audio-bytes")
    def test_tts_endpoint_returns_audio_bytes_from_edge_tts(self, synthesize_edge_tts_mock):
        response = self.client.post("/api/tts/", {"text": "Salom dunyo", "lang": "uz"}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "audio/mpeg")
        self.assertEqual(response.content, b"audio-bytes")
        synthesize_edge_tts_mock.assert_called_once()

    @patch("qrcode.api_views.synthesize_gtts", return_value=b"audio-bytes-ru")
    def test_tts_endpoint_supports_russian_and_english(self, synthesize_gtts_mock):
        response = self.client.post("/api/tts/", {"text": "Привет мир", "lang": "ru"}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "audio/mpeg")
        self.assertEqual(response.content, b"audio-bytes-ru")
        synthesize_gtts_mock.assert_called_once_with("Привет мир", "ru")
