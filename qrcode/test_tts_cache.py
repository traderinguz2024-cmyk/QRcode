from unittest.mock import patch

from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient


class TtsCacheTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()

    @patch("qrcode.api_views.synthesize_edge_tts", return_value=b"cached-audio")
    def test_tts_endpoint_reuses_cached_audio(self, synthesize_edge_tts_mock):
        first_response = self.client.post("/api/tts/", {"text": "Cache sinovi", "lang": "uz"}, format="json")
        second_response = self.client.post("/api/tts/", {"text": "Cache sinovi", "lang": "uz"}, format="json")

        self.assertEqual(first_response.status_code, 200)
        self.assertEqual(second_response.status_code, 200)
        self.assertEqual(first_response.content, b"cached-audio")
        self.assertEqual(second_response.content, b"cached-audio")
        synthesize_edge_tts_mock.assert_called_once_with("Cache sinovi", "uz")
