# QRcode

Public domain:
`https://qr.akadmvd.uz`

Backend and frontend are currently served together from this repository on the same domain.

Environment:
```bash
cp .env.example .env
```

Local run:
```bash
python manage.py runserver
```

Important production commands:
```bash
python manage.py collectstatic --noinput
python manage.py regenerate_qr_codes
```

Production files:
- [.env.example](.env.example)
- [deploy/run_gunicorn.py](deploy/run_gunicorn.py)
- [deploy/nginx/qr.akadmvd.uz.conf](deploy/nginx/qr.akadmvd.uz.conf) (optional)

Production checklist without nginx:
1. Copy `.env.example` to `.env`
2. Set `BACKEND_URL` and `FRONTEND_URL` to your HTTPS domain
3. Set `ALLOWED_HOSTS` and `FRONTEND_ALLOWED_ORIGINS` to that domain
4. Set `DJANGO_SECRET_KEY` to a long random value
5. Install dependencies from `requirements.txt`
6. Run `python manage.py regenerate_qr_codes`
7. Start the app with `python deploy/run_gunicorn.py`
8. If you terminate TLS directly in Gunicorn, set `GUNICORN_CERTFILE` and `GUNICORN_KEYFILE`
9. Keep `USE_X_FORWARDED_HOST=0` unless you are behind a reverse proxy which sets `X-Forwarded-Host`
10. If you serve plain HTTP directly, set `SESSION_COOKIE_SECURE=0`, `CSRF_COOKIE_SECURE=0`, and `SECURE_SSL_REDIRECT=0`
