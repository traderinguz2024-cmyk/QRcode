import os
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from django.test import SimpleTestCase

from .env import load_env_file


class EnvLoaderTests(SimpleTestCase):
    def test_load_env_file_reads_values(self):
        with TemporaryDirectory() as tmp_dir:
            env_path = Path(tmp_dir) / ".env"
            env_path.write_text(
                "TEST_FRONTEND_URL=https://example.com\n"
                "TEST_DEBUG=0\n"
                "export TEST_ALLOWED_HOSTS=example.com,localhost\n",
                encoding="utf-8",
            )

            with patch.dict(os.environ, {}, clear=False):
                os.environ.pop("TEST_FRONTEND_URL", None)
                os.environ.pop("TEST_DEBUG", None)
                os.environ.pop("TEST_ALLOWED_HOSTS", None)

                load_env_file(env_path)

                self.assertEqual(os.environ["TEST_FRONTEND_URL"], "https://example.com")
                self.assertEqual(os.environ["TEST_DEBUG"], "0")
                self.assertEqual(os.environ["TEST_ALLOWED_HOSTS"], "example.com,localhost")

    def test_load_env_file_keeps_existing_values_by_default(self):
        with TemporaryDirectory() as tmp_dir:
            env_path = Path(tmp_dir) / ".env"
            env_path.write_text("TEST_FRONTEND_URL=https://from-file.example\n", encoding="utf-8")

            with patch.dict(os.environ, {"TEST_FRONTEND_URL": "https://from-env.example"}, clear=False):
                load_env_file(env_path)
                self.assertEqual(os.environ["TEST_FRONTEND_URL"], "https://from-env.example")
