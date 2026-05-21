FROM python:3.12-slim
# OS-level CVE patches — runs on every rebuild (libcap2, systemd)
RUN apt-get update && apt-get upgrade -y && rm -rf /var/lib/apt/lists/*

# Non-root user — never run as root inside container (OWASP A05)
RUN groupadd -r semelpass && useradd -r -g semelpass semelpass

WORKDIR /app

# Dependencies first — layer cache
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# App code
COPY app/ ./app/

# Lock ownership to non-root user
RUN chown -R semelpass:semelpass /app

USER semelpass

EXPOSE 8000

# Python-based healthcheck — no curl needed, no apt-get, no DNS during build
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--no-access-log"]
