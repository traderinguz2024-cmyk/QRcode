import os
import subprocess
import sys
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[1]


def run_manage(*args):
    subprocess.check_call([sys.executable, "manage.py", *args], cwd=BASE_DIR)


def build_gunicorn_command():
    port = os.getenv("PORT", "8000").strip() or "8000"
    bind = os.getenv("GUNICORN_BIND", f"0.0.0.0:{port}").strip()
    workers = os.getenv("GUNICORN_WORKERS", "3").strip() or "3"
    timeout = os.getenv("GUNICORN_TIMEOUT", "120").strip() or "120"

    command = [
        sys.executable,
        "-m",
        "gunicorn",
        "core.wsgi:application",
        "--bind",
        bind,
        "--workers",
        workers,
        "--timeout",
        timeout,
        "--access-logfile",
        "-",
        "--error-logfile",
        "-",
    ]

    certfile = os.getenv("GUNICORN_CERTFILE", "").strip()
    keyfile = os.getenv("GUNICORN_KEYFILE", "").strip()
    if certfile and keyfile:
        command.extend(["--certfile", certfile, "--keyfile", keyfile])

    return command


def main():
    run_manage("migrate")
    run_manage("collectstatic", "--noinput")
    os.execvp(sys.executable, build_gunicorn_command())


if __name__ == "__main__":
    main()
