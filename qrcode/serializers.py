import json
from django.urls import reverse

from rest_framework import serializers

from .models import About, Category, Faculty, Product, Teacher
from .public_urls import backend_public_url


class FacultySerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = Faculty
        fields = ["id", "name", "name_ru", "name_en", "display_name"]

    def get_display_name(self, obj):
        request = self.context.get("request")
        language = request.query_params.get("lang", "uz") if request else "uz"
        return obj.get_name(language)


class TeacherSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = Teacher
        fields = ["id", "name", "name_ru", "name_en", "display_name"]

    def get_display_name(self, obj):
        request = self.context.get("request")
        language = request.query_params.get("lang", "uz") if request else "uz"
        return obj.get_name(language)


class CategorySerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ["id", "name", "name_ru", "name_en", "display_name"]

    def get_display_name(self, obj):
        request = self.context.get("request")
        language = request.query_params.get("lang", "uz") if request else "uz"
        return obj.get_name(language)


class AboutReadSerializer(serializers.ModelSerializer):
    about = serializers.SerializerMethodField()
    audio = serializers.SerializerMethodField()
    video = serializers.SerializerMethodField()

    class Meta:
        model = About
        fields = ["id", "item", "about", "audio", "video", "qrcode"]

    def get_about(self, obj):
        return {
            "uz": obj.about_uz,
            "ru": obj.about_ru,
            "en": obj.about_en,
        }

    def _build_url(self, file_field):
        if not file_field:
            return None
        return backend_public_url(file_field.url)

    def get_audio(self, obj):
        return {
            "uz": self._build_url(obj.audio_uz),
            "ru": self._build_url(obj.audio_ru),
            "en": self._build_url(obj.audio_en),
        }

    def get_video(self, obj):
        return {
            "uz": self._build_url(obj.video_uz),
            "ru": self._build_url(obj.video_ru),
            "en": self._build_url(obj.video_en),
        }


class AboutWriteSerializer(serializers.ModelSerializer):
    about = serializers.DictField(child=serializers.CharField(allow_blank=True), write_only=True, required=False)

    class Meta:
        model = About
        fields = [
            "id",
            "item",
            "about",
            "audio_uz",
            "audio_ru",
            "audio_en",
            "video_uz",
            "video_ru",
            "video_en",
            "qrcode",
        ]

    def validate(self, attrs):
        if self.instance is None and "item" not in attrs:
            raise serializers.ValidationError({"item": "This field is required."})
        return attrs

    def _apply_multilingual_fields(self, instance, attrs):
        about_data = attrs.pop("about", None)
        if about_data is not None:
            instance.about_uz = about_data.get("uz", instance.about_uz)
            instance.about_ru = about_data.get("ru", instance.about_ru)
            instance.about_en = about_data.get("en", instance.about_en)

        for field, value in attrs.items():
            setattr(instance, field, value)
        return instance

    def create(self, validated_data):
        instance = About()
        instance = self._apply_multilingual_fields(instance, validated_data)
        instance.save()
        return instance

    def update(self, instance, validated_data):
        instance = self._apply_multilingual_fields(instance, validated_data)
        instance.save()
        return instance


class ProductReadSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    description = serializers.SerializerMethodField()
    faculty_id = serializers.SerializerMethodField()
    faculty = serializers.SerializerMethodField()
    teacher_id = serializers.SerializerMethodField()
    teacher_name = serializers.SerializerMethodField()
    category_id = serializers.SerializerMethodField()
    category = serializers.SerializerMethodField()
    category_name = serializers.SerializerMethodField()
    created_time = serializers.DateTimeField(source="created_at", read_only=True)
    qr_code = serializers.SerializerMethodField()
    img = serializers.SerializerMethodField()
    audio = serializers.SerializerMethodField()
    video = serializers.SerializerMethodField()
    about = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "faculty_id",
            "faculty",
            "description",
            "teacher_name",
            "teacher_id",
            "created_time",
            "qr_code",
            "img",
            "category_id",
            "category",
            "category_name",
            "audio",
            "video",
            "about",
        ]

    def _build_url(self, file_field):
        if not file_field:
            return None
        return backend_public_url(file_field.url)

    def _get_language(self):
        request = self.context.get("request")
        return request.query_params.get("lang", "uz") if request else "uz"

    def get_name(self, obj):
        return {
            "uz": obj.name_uz,
            "ru": obj.name_ru,
            "en": obj.name_en,
        }

    def get_faculty_id(self, obj):
        return obj.faculty_id

    def get_faculty(self, obj):
        return obj.faculty.get_name(self._get_language()) if obj.faculty else None

    def get_teacher_id(self, obj):
        return obj.teacher_id

    def get_teacher_name(self, obj):
        return obj.teacher.get_name(self._get_language()) if obj.teacher else None

    def get_category_id(self, obj):
        return obj.category_id

    def get_category(self, obj):
        return obj.category.get_name(self._get_language()) if obj.category else None

    def get_category_name(self, obj):
        return obj.category.get_name(self._get_language()) if obj.category else None

    def get_description(self, obj):
        return {
            "uz": obj.description_uz,
            "ru": obj.description_ru,
            "en": obj.description_en,
        }

    def get_qr_code(self, obj):
        return backend_public_url(reverse("product-qr", args=[obj.pk]))

    def get_img(self, obj):
        return self._build_url(obj.img)

    def get_audio(self, obj):
        about = getattr(obj, "about_entry", None)
        return {
            "uz": self._build_url(obj.audio_uz or (about.audio_uz if about else None)),
            "ru": self._build_url(obj.audio_ru or (about.audio_ru if about else None)),
            "en": self._build_url(obj.audio_en or (about.audio_en if about else None)),
        }

    def get_video(self, obj):
        about = getattr(obj, "about_entry", None)
        return {
            "uz": self._build_url(obj.video_uz or (about.video_uz if about else None)),
            "ru": self._build_url(obj.video_ru or (about.video_ru if about else None)),
            "en": self._build_url(obj.video_en or (about.video_en if about else None)),
        }

    def get_about(self, obj):
        about = getattr(obj, "about_entry", None)
        if not about:
            return {
                "uz": None,
                "ru": None,
                "en": None,
            }
        return {
            "uz": about.about_uz,
            "ru": about.about_ru,
            "en": about.about_en,
        }


class ProductWriteSerializer(serializers.ModelSerializer):
    name = serializers.DictField(child=serializers.CharField(allow_blank=True), write_only=True, required=False)
    description = serializers.DictField(child=serializers.CharField(allow_blank=True, allow_null=True), write_only=True, required=False)
    name_uz = serializers.CharField(write_only=True, required=False, allow_blank=True)
    name_ru = serializers.CharField(write_only=True, required=False, allow_blank=True)
    name_en = serializers.CharField(write_only=True, required=False, allow_blank=True)
    description_uz = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True)
    description_ru = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True)
    description_en = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True)
    faculty_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    teacher_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    category_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    faculty_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    teacher_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    category_name = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "description",
            "name_uz",
            "name_ru",
            "name_en",
            "description_uz",
            "description_ru",
            "description_en",
            "faculty_id",
            "teacher_id",
            "category_id",
            "faculty_name",
            "teacher_name",
            "category_name",
            "img",
            "audio_uz",
            "audio_ru",
            "audio_en",
            "video_uz",
            "video_ru",
            "video_en",
        ]
        extra_kwargs = {
            "video_uz": {"required": False, "allow_null": True},
            "video_ru": {"required": False, "allow_null": True},
            "video_en": {"required": False, "allow_null": True},
        }

    def _coerce_multilingual_payload(self, attrs, compound_key, flat_prefix):
        data = attrs.pop(compound_key, None)
        if isinstance(data, str):
            try:
                data = json.loads(data)
            except json.JSONDecodeError as exc:
                raise serializers.ValidationError({compound_key: "Must be a JSON object."}) from exc

        if data is not None and not isinstance(data, dict):
            raise serializers.ValidationError({compound_key: "Must be a mapping of language codes to values."})

        flat_data = {}
        has_flat_values = False
        for language in ("uz", "ru", "en"):
            key = f"{flat_prefix}{language}"
            if key in attrs:
                flat_data[language] = attrs.pop(key)
                has_flat_values = True

        if data is None and not has_flat_values:
            return None

        merged = {}
        if data:
            for language in ("uz", "ru", "en"):
                if language in data:
                    merged[language] = data.get(language)

        return {
            **merged,
            **flat_data,
        }

    def validate(self, attrs):
        name_data = self._coerce_multilingual_payload(attrs, "name", "name_")
        description_data = self._coerce_multilingual_payload(attrs, "description", "description_")

        if name_data is not None:
            attrs["name"] = name_data
        if description_data is not None:
            attrs["description"] = description_data

        if self.instance is None and "name" not in attrs:
            raise serializers.ValidationError({"name": "This field is required."})
        return attrs

    def _resolve_related(self, attrs, id_key, name_key, model):
        related_id = attrs.pop(id_key, None)
        related_name = attrs.pop(name_key, "").strip()
        if related_id:
            return model.objects.get(pk=related_id)
        if related_name:
            obj, _ = model.objects.get_or_create(name=related_name)
            return obj
        return None

    def _apply_multilingual_fields(self, instance, attrs):
        name_data = attrs.pop("name", None)
        if name_data is not None:
            instance.name_uz = name_data.get("uz", instance.name_uz)
            instance.name_ru = name_data.get("ru", instance.name_ru)
            instance.name_en = name_data.get("en", instance.name_en)

        description_data = attrs.pop("description", None)
        if description_data is not None:
            instance.description_uz = description_data.get("uz", instance.description_uz)
            instance.description_ru = description_data.get("ru", instance.description_ru)
            instance.description_en = description_data.get("en", instance.description_en)

        for field, value in attrs.items():
            setattr(instance, field, value)
        return instance

    def create(self, validated_data):
        faculty = self._resolve_related(validated_data, "faculty_id", "faculty_name", Faculty)
        teacher = self._resolve_related(validated_data, "teacher_id", "teacher_name", Teacher)
        category = self._resolve_related(validated_data, "category_id", "category_name", Category)
        product = Product(
            faculty=faculty,
            teacher=teacher,
            category=category,
        )
        product = self._apply_multilingual_fields(product, validated_data)
        product.save()
        return product

    def update(self, instance, validated_data):
        if "faculty_id" in validated_data or "faculty_name" in validated_data:
            instance.faculty = self._resolve_related(validated_data, "faculty_id", "faculty_name", Faculty)
        if "teacher_id" in validated_data or "teacher_name" in validated_data:
            instance.teacher = self._resolve_related(validated_data, "teacher_id", "teacher_name", Teacher)
        if "category_id" in validated_data or "category_name" in validated_data:
            instance.category = self._resolve_related(validated_data, "category_id", "category_name", Category)
        instance = self._apply_multilingual_fields(instance, validated_data)
        instance.save()
        return instance
