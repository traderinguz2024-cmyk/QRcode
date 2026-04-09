FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    DEBUG=1 \
    ALLOWED_HOSTS=* \
    BACKEND_URL=http://localhost:4040 \
    FRONTEND_URL=http://localhost:4040 \
    FRONTEND_ALLOWED_ORIGINS=http://localhost:4040

WORKDIR /app

COPY requirements.txt /app/
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY . /app/

EXPOSE 4040

CMD ["sh", "-c", "python manage.py migrate && python manage.py runserver 0.0.0.0:4040"]
