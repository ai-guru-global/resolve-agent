FROM python:3.12-slim

WORKDIR /app
COPY app.py .

EXPOSE 9000
HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
    CMD python -c "import urllib.request;urllib.request.urlopen('http://localhost:9000/health',timeout=2)" || exit 1

CMD ["python", "app.py"]
