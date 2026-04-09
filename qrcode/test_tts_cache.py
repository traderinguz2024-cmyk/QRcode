import shutil
import tempfile
from unittest.mock import patch

from django.core.cache import cache
from django.test import override_settings
from django.test import TestCase
from rest_framework.test import APIClient

from .models import PersistentTtsAudio


class TtsCacheTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.media_root = tempfile.mkdtemp()
        self.media_override = override_settings(MEDIA_ROOT=self.media_root)
        self.media_override.enable()
        self.addCleanup(self.media_override.disable)
        self.addCleanup(shutil.rmtree, self.media_root, True)

    @patch("qrcode.api_views.synthesize_edge_tts", return_value=b"cached-audio")
    def test_tts_endpoint_reuses_cached_audio(self, synthesize_edge_tts_mock):
        first_response = self.client.post("/api/tts/", {"text": "Cache sinovi", "lang": "uz"}, format="json")
        second_response = self.client.post("/api/tts/", {"text": "Cache sinovi", "lang": "uz"}, format="json")

        self.assertEqual(first_response.status_code, 200)
        self.assertEqual(second_response.status_code, 200)
        self.assertEqual(first_response.content, b"cached-audio")
        self.assertEqual(second_response.content, b"cached-audio")
        synthesize_edge_tts_mock.assert_called_once_with("Cache sinovi", "uz")

    @patch("qrcode.api_views.synthesize_edge_tts", return_value=b"persisted-audio")
    def test_tts_endpoint_reuses_persistent_audio_after_cache_clear(self, synthesize_edge_tts_mock):
        first_response = self.client.post("/api/tts/", {"text": "Doimiy saqlash", "lang": "uz"}, format="json")

        self.assertEqual(first_response.status_code, 200)
        entry = PersistentTtsAudio.objects.get(language="uz")
        self.assertEqual(bytes(entry.audio_blob), b"persisted-audio")
        self.assertTrue(entry.audio_file.name)

        entry.audio_file.storage.delete(entry.audio_file.name)
        cache.clear()

        second_client = APIClient()
        second_response = second_client.post("/api/tts/", {"text": "Doimiy saqlash", "lang": "uz"}, format="json")

        self.assertEqual(second_response.status_code, 200)
        self.assertEqual(second_response.content, b"persisted-audio")
        synthesize_edge_tts_mock.assert_called_once_with("Doimiy saqlash", "uz")
