from io import BytesIO
import importlib.util
import sys
import sysconfig
from pathlib import Path

from django.core.files import File
from django.db import models
from django.urls import reverse
from django.utils import translation

from .public_urls import frontend_public_url


def build_qr_image(data):
    purelib = Path(sysconfig.get_paths()["purelib"])
    package_path = purelib / "qrcode"
    init_path = package_path / "__init__.py"
    package_spec = importlib.util.spec_from_file_location(
        "qrcode",
        init_path,
        submodule_search_locations=[str(package_path)],
    )
    package_module = importlib.util.module_from_spec(package_spec)
    assert package_spec.loader is not None

    original_package = sys.modules.get("qrcode")
    original_submodules = {
        name: module
        for name, module in sys.modules.items()
        if name.startswith("qrcode.")
    }

    try:
        sys.modules["qrcode"] = package_module
        package_spec.loader.exec_module(package_module)
        return package_module.make(data)
    finally:
        for name in list(sys.modules):
            if name.startswith("qrcode.") and name not in original_submodules:
                sys.modules.pop(name, None)
        if original_package is not None:
            sys.modules["qrcode"] = original_package
        else:
            sys.modules.pop("qrcode", None)


def get_current_language():
    return (translation.get_language() or "uz").split("-")[0]


def tts_cache_upload_to(instance, filename):
    provider_key = "".join(
        character.lower() if character.isalnum() else "_"
        for character in (instance.provider or "tts")
    ).strip("_") or "tts"
    extension = (instance.extension or "mp3").lstrip(".") or "mp3"
    digest_prefix = (instance.text_hash or "cache")[:2]
    return f"tts_cache/{instance.language}/{provider_key}/{digest_prefix}/{instance.text_hash}.{extension}"


class Faculty(models.Model):
    name = models.CharField(max_length=100)
    name_ru = models.CharField(max_length=100, blank=True)
    name_en = models.CharField(max_length=100, blank=True)

    def get_name(self, language=None):
        language = language or get_current_language()
        return (
            getattr(self, f"name_{language}", "")
            or self.name
            or self.name_ru
            or self.name_en
        )

    def __str__(self):
        return self.get_name()


class Teacher(models.Model):
    name = models.CharField(max_length=100)
    name_ru = models.CharField(max_length=100, blank=True)
    name_en = models.CharField(max_length=100, blank=True)

    def get_name(self, language=None):
        language = language or get_current_language()
        return (
            getattr(self, f"name_{language}", "")
            or self.name
            or self.name_ru
            or self.name_en
        )

    def __str__(self):
        return self.get_name()


class Product(models.Model):
    category = models.ForeignKey("Category", on_delete=models.CASCADE, null=True, blank=True)
    name_uz = models.CharField(max_length=255)
    name_ru = models.CharField(max_length=255, blank=True)
    name_en = models.CharField(max_length=255, blank=True)
    description_uz = models.TextField(blank=True, null=True)
    description_ru = models.TextField(blank=True, null=True)
    description_en = models.TextField(blank=True, null=True)
    faculty = models.ForeignKey(Faculty, on_delete=models.CASCADE, null=True, blank=True)
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, null=True, blank=True)
    img = models.ImageField(upload_to="qrcode", blank=True, null=True)
    qr_code = models.ImageField(upload_to="qr_codes/", blank=True, null=True)
    audio_uz = models.FileField(upload_to="qrcodes/", blank=True, null=True)
    audio_ru = models.FileField(upload_to="qrcodes/", blank=True, null=True)
    audio_en = models.FileField(upload_to="qrcodes/", blank=True, null=True)
    video_uz = models.FileField(upload_to="qrcodes/", blank=True, null=True)
    video_ru = models.FileField(upload_to="qrcodes/", blank=True, null=True)
    video_en = models.FileField(upload_to="qrcodes/", blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def build_detail_url(self):
        detail_path = reverse("detail", args=[self.pk])
        return frontend_public_url(detail_path)

    def rebuild_qr_code(self, *, save=True):
        qr = build_qr_image(self.build_detail_url())
        buffer = BytesIO()
        qr.save(buffer, format="PNG")
        buffer.seek(0)

        file_name = f"product_{self.pk}_qr.png"
        self.qr_code.save(file_name, File(buffer), save=False)

        if save:
            super().save(update_fields=["qr_code"])

    def save(self, *args, **kwargs):
        creating = self.pk is None

        super().save(*args, **kwargs)

        if creating or not self.qr_code:
            self.rebuild_qr_code(save=True)

    def get_name(self, language):
        return (
            getattr(self, f"name_{language}", "")
            or self.name_uz
            or self.name_ru
            or self.name_en
        )

    def get_description(self, language):
        return (
            getattr(self, f"description_{language}", "")
            or self.description_uz
            or self.description_ru
            or self.description_en
        )

    def get_audio(self, language):
        return (
            getattr(self, f"audio_{language}")
            or self.audio_uz
            or self.audio_ru
            or self.audio_en
        )

    def get_video(self, language):
        return (
            getattr(self, f"video_{language}")
            or self.video_uz
            or self.video_ru
            or self.video_en
        )

    def __str__(self):
        return self.get_name("uz")


class About(models.Model):
    item = models.OneToOneField(Product, on_delete=models.CASCADE, related_name="about_entry", null=True, blank=True)
    about_uz = models.TextField()
    about_ru = models.TextField(blank=True)
    about_en = models.TextField(blank=True)
    audio_uz = models.FileField(upload_to="qrcode", blank=True, null=True)
    audio_ru = models.FileField(upload_to="qrcode", blank=True, null=True)
    audio_en = models.FileField(upload_to="qrcode", blank=True, null=True)
    video_uz = models.FileField(upload_to="qrcode", blank=True, null=True)
    video_ru = models.FileField(upload_to="qrcode", blank=True, null=True)
    video_en = models.FileField(upload_to="qrcode", blank=True, null=True)
    qrcode = models.ImageField(upload_to="qrcode")

    def get_about(self, language):
        return (
            getattr(self, f"about_{language}", "")
            or self.about_uz
            or self.about_ru
            or self.about_en
        )

    def get_audio(self, language):
        return (
            getattr(self, f"audio_{language}")
            or self.audio_uz
            or self.audio_ru
            or self.audio_en
        )

    def get_video(self, language):
        return (
            getattr(self, f"video_{language}")
            or self.video_uz
            or self.video_ru
            or self.video_en
        )

    def __str__(self):
        return self.get_about("uz")


class PersistentTtsAudio(models.Model):
    language = models.CharField(max_length=8, db_index=True)
    provider = models.CharField(max_length=120, db_index=True)
    text_hash = models.CharField(max_length=64, db_index=True)
    source_text = models.TextField()
    content_type = models.CharField(max_length=64, default="audio/mpeg")
    extension = models.CharField(max_length=16, default="mp3")
    audio_file = models.FileField(upload_to=tts_cache_upload_to)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["language", "provider", "text_hash"],
                name="unique_persistent_tts_audio_entry",
            )
        ]

    def __str__(self):
        return f"{self.language}:{self.provider}:{self.text_hash[:10]}"


class Category(models.Model):
    name = models.CharField(max_length=100)
    name_ru = models.CharField(max_length=100, blank=True)
    name_en = models.CharField(max_length=100, blank=True)

    def get_name(self, language=None):
        language = language or get_current_language()
        return (
            getattr(self, f"name_{language}", "")
            or self.name
            or self.name_ru
            or self.name_en
        )

    def __str__(self):
        return self.get_name()
