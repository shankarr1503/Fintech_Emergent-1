FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY server.py .

# Never run as root.
RUN useradd --create-home --uid 10001 api
USER api

EXPOSE 8001
HEALTHCHECK --interval=30s --timeout=3s CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8001/api/health')"
# Stateless workers: sessions, rate limits and idempotency live in MongoDB, so scale out freely.
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "4", "--proxy-headers", "--forwarded-allow-ips", "*"]
