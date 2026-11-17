FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements from root build context
COPY backend/api/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

ARG SITE_TARGET=zambia
ENV SITE_TARGET=${SITE_TARGET}
ENV PORT=4000

# Copy backend source code and site manifests
COPY backend/api/ /app/
COPY config/sites/ /app/config/sites/

EXPOSE 4000

HEALTHCHECK --interval=5s --timeout=3s --start-period=3s --retries=3 \
    CMD curl -f http://localhost:4000/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "4000"]
