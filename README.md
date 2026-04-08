# QRcode

Public domain:
`https://qr.akadmvd.uz`

Backend and frontend are currently served together from this repository on the same domain.

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
