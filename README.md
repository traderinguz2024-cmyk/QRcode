# QRcode

Public domain:
`https://qr.akadmvd.uz`

Backend now runs as a separate API/QR/media service. The old local `frontend/` bundle has been removed from this repository.

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
1. Set `BACKEND_URL` and `FRONTEND_URL` to `https://qr.akadmvd.uz`
2. Set `DJANGO_SECRET_KEY` to a long random value
3. Put the nginx config in place and update filesystem paths if needed
4. Run `collectstatic`
5. Run `regenerate_qr_codes`
