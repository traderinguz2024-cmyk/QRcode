# Frontend

This folder is a standalone SPA frontend with no Django template tags.

Run backend:

```powershell
.\.venv\Scripts\python.exe manage.py runserver 192.168.0.174:8000
```

Run frontend:

```powershell
.\.venv\Scripts\python.exe frontend\serve.py
```

Open:

```text
http://192.168.0.174:4173
```

If your backend runs on another host or port, edit [config.js](/C:/Users/Admin/PycharmProjects/QR%20code/frontend/config.js).
