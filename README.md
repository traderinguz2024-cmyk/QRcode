# QRcode

Public domain:
`https://qr.akadmvd.uz`

Backend and frontend are currently served together from this repository on the same domain.

Environment:
```powershell
Copy-Item .env.example .env
```

Local run:
```powershell
.\.venv\Scripts\python.exe manage.py runserver
```

Important production commands:
```powershell
.\.venv\Scripts\python.exe manage.py collectstatic --noinput
.\.venv\Scripts\python.exe manage.py regenerate_qr_codes
```

Production files:
- [.env.example](.env.example)
- [deploy/nginx/qr.akadmvd.uz.conf](deploy/nginx/qr.akadmvd.uz.conf)

Production checklist:
1. Copy `.env.example` to `.env`
2. Set `BACKEND_URL` and `FRONTEND_URL` to your HTTPS domain
3. Set `ALLOWED_HOSTS` and `FRONTEND_ALLOWED_ORIGINS` to that domain
4. Set `DJANGO_SECRET_KEY` to a long random value
5. Put the nginx config in place and update filesystem paths if needed
6. Run `collectstatic`
7. Run `regenerate_qr_codes`
