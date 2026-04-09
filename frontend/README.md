# Frontend

This folder is a standalone SPA frontend with no Django template tags.

Run backend:

```powershell
.\.venv\Scripts\python.exe manage.py runserver
```

Run frontend:

```powershell
.\.venv\Scripts\python.exe frontend\serve.py
```

Open:

```text
http://localhost:4173
```

`config.js` is loaded automatically. By default it uses `window.location.origin`, so same-domain deploys work without edits.

If your backend runs on another host or port, edit [config.js](/C:/Users/Admin/PycharmProjects/QR%20code/frontend/config.js).
