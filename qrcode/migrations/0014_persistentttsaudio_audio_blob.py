from django.db import migrations, models


def backfill_persistent_tts_audio_blob(apps, schema_editor):
    PersistentTtsAudio = apps.get_model("qrcode", "PersistentTtsAudio")

    for entry in PersistentTtsAudio.objects.iterator():
        if entry.audio_blob:
            continue
        if not entry.audio_file:
            continue
        try:
            with entry.audio_file.open("rb") as audio_stream:
                entry.audio_blob = audio_stream.read()
        except OSError:
            continue
        entry.save(update_fields=["audio_blob"])


class Migration(migrations.Migration):

    dependencies = [
        ("qrcode", "0013_persistentttsaudio"),
    ]

    operations = [
        migrations.AddField(
            model_name="persistentttsaudio",
            name="audio_blob",
            field=models.BinaryField(blank=True, editable=False, null=True),
        ),
        migrations.RunPython(backfill_persistent_tts_audio_blob, migrations.RunPython.noop),
    ]
