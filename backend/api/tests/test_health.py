import os
import pytest
from fastapi.testclient import TestClient

# Set ALLOW_DISCONNECTED_HEALTH=1 for isolated unit tests
os.environ["ALLOW_DISCONNECTED_HEALTH"] = "1"

from backend.api.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_health_endpoint_returns_200(client):
    """Smoke test verifying GET /health responds with 200 and required fields."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "site_target" in data
    assert "timestamp" in data
    assert "database_connected" in data
    assert "raw_schema_readable" in data


def test_site_manifest_endpoint(client):
    """Smoke test verifying GET /api/site loads the active site manifest."""
    response = client.get("/api/site")
    assert response.status_code == 200
    data = response.json()
    assert "site_id" in data
    assert "hardware_profile" in data
    assert "active_features" in data


def test_twin_state_endpoint(client):
    """Smoke test verifying GET /api/twin/state returns valid structure."""
    response = client.get("/api/twin/state")
    assert response.status_code == 200
    data = response.json()
    assert "site_id" in data
    assert "state_data" in data

