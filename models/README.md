# Forecasting Models & BentoML Integration Guide (`models/`)

This directory is the designated home for machine learning and forecasting microservices.

At initial repository setup, this directory intentionally contains **no sample model code**, maintaining a clean baseline. When data scientists and engineers develop predictive models (such as solar irradiance forecasting, load projection, or battery degradation estimation), follow the architecture and step-by-step instructions below.

---

## 1. Core Integration Rules

1. **One Container Per Model**: Each model lives in its own subdirectory under `models/` (e.g. `models/solar_forecast_v1/`) and compiles to an isolated Docker container.
2. **Committed Lightweight Model Weights**: Model weights and artifacts must be lightweight (< 100 MB) and committed directly into the Git repository alongside the model code. Do not pull weights from external cloud buckets at container runtime.
3. **HTTP Microservices (BentoML)**: All models are packaged and served using [BentoML](https://github.com/bentoml/BentoML), exposing standard HTTP REST endpoints.
4. **Strict Isolation from Database**: Model containers **must never connect to PostgreSQL/TimescaleDB**.
   * Model containers receive input features via HTTP POST from `backend/api`.
   * Model containers return predictions via HTTP JSON responses to `backend/api`.
   * `backend/api` is responsible for persisting forecast outputs into `app.forecast_outputs`.
5. **Docker Compose Profiles**: Each model service is registered under one or more site Compose profiles (`zambia`, `malawi`, `kenya`) in `docker-compose.yml`. Only the models required by that site are booted.

---

## 2. Step-by-Step Guide: Setting Up a BentoML Model Container

### Step 1: Create the Model Subdirectory
Create a dedicated folder for your model:
```bash
mkdir -p models/solar_forecast_v1/weights
```

### Step 2: Place Committed Weights & Inference Code
Place your serialized model (e.g. `model.onnx`, `model.pkl`, or `model.pt`) into `models/solar_forecast_v1/weights/`.

### Step 3: Define `bentofile.yaml`
Create `models/solar_forecast_v1/bentofile.yaml`:

```yaml
service: "service:SolarForecastService"
labels:
  owner: credit-ml-team
  site_target: zambia
  project: credit-digital-twin
python:
  packages:
    - numpy>=1.26.0
    - pandas>=2.2.0
    - scikit-learn>=1.4.0
    - pydantic>=2.6.0
include:
  - "service.py"
  - "weights/"
```

### Step 4: Write the BentoML Service (`service.py`)
Create `models/solar_forecast_v1/service.py`:

```python
import bentoml
import numpy as np
import pickle
from pathlib import Path
from typing import List, Dict, Any
from pydantic import BaseModel

class ForecastInput(BaseModel):
    site_id: str
    historical_irradiance: List[float]  # Last 24 hours of sensor readings
    ambient_temp_c: float
    horizon_hours: int = 24

class ForecastOutput(BaseModel):
    model_id: str = "solar_forecast_v1"
    site_id: str
    forecast_values: List[float]
    confidence_interval_lower: List[float]
    confidence_interval_upper: List[float]

@bentoml.service(
    name="solar_forecast_v1",
    resources={"cpu": "1"}
)
class SolarForecastService:
    def __init__(self):
        weights_path = Path(__file__).parent / "weights" / "model.pkl"
        if weights_path.exists():
            with open(weights_path, "rb") as f:
                self.model = pickle.load(f)
        else:
            self.model = None  # Fallback rule-based logic for dev

    @bentoml.api
    def predict(self, input_data: ForecastInput) -> ForecastOutput:
        # Example prediction logic
        values = [max(0.0, float(x) * 0.95) for x in input_data.historical_irradiance]
        return ForecastOutput(
            site_id=input_data.site_id,
            forecast_values=values,
            confidence_interval_lower=[v * 0.9 for v in values],
            confidence_interval_upper=[v * 1.1 for v in values]
        )
```

### Step 5: Build the Bento Container Image
From within `models/solar_forecast_v1/`:
```bash
# 1. Build the Bento package
bentoml build

# 2. Containerize the Bento as a Docker image
bentoml containerize solar_forecast_v1:latest -t credit-model-solar-forecast:latest
```

---

## 3. Registering the Model in Docker Compose

In `docker-compose.yml`, define the model container on the internal bridge network and tag it with the site profile(s) that require it:

```yaml
  model-solar-forecast:
    build:
      context: ./models/solar_forecast_v1
      dockerfile: Dockerfile
    image: credit-model-solar-forecast:latest
    container_name: credit-model-solar-forecast
    restart: unless-stopped
    networks:
      - internal-net
    profiles:
      - zambia
      - kenya
```

Because it attaches to `profiles: ["zambia", "kenya"]`, running `npm run dev` (Zambia) will launch this container, whereas running `SITE_TARGET=malawi npm run dev` will skip it automatically.

---

## 4. Registering the Model in Site Manifests

Open `config/sites/<site>.json` (e.g. `config/sites/zambia.json`) and add the model ID to the `"models"` array:

```json
{
  "site_id": "zambia",
  "models": [
    "solar_forecast_v1"
  ]
}
```

---

## 5. End-to-End Inference Workflow

1. A cron job or frontend trigger calls `backend/api` at `POST /api/forecast/trigger`.
2. `backend/api` fetches the latest required feature window from `raw.telemetry_placeholder`.
3. `backend/api` sends an HTTP POST request to `http://model-solar-forecast:3000/predict`.
4. `model-solar-forecast` returns the predicted output JSON.
5. `backend/api` writes the forecast records into the TimescaleDB hypertable `app.forecast_outputs`.
6. The frontend reads the saved forecast via `GET /api/forecast/latest`.

