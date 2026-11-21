"""
test_phase4_api.py - Integration Tests for FastAPI Backend Endpoints.
Verifies:
  - GET /api/health (200 OK)
  - GET /api/risk/summary?date=YYYY-MM-DD (200 OK, valid schema & probability in [0, 1])
  - GET /api/timeseries (200 OK, array of synchronized metrics)
  - GET /api/inundation/{scenario} (200 OK, valid GeoJSON FeatureCollection)
  - GET /api/exposure/{scenario} (200 OK, exposed infrastructure counts & Hassanabad Bridge)
"""

from fastapi.testclient import TestClient
import pytest

from backend.main import app

client = TestClient(app)


def test_api_health():
    """Verify healthcheck endpoint returns 200 OK."""
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"


def test_api_risk_summary():
    """Verify risk summary endpoint on May 2022 GLOF date."""
    resp = client.get("/api/risk/summary?date=2022-05-07")
    assert resp.status_code == 200
    data = resp.json()

    assert "glof_probability" in data
    assert 0.0 <= data["glof_probability"] <= 1.0
    assert "alert_level" in data
    assert data["alert_level"] in ["NORMAL", "WATCH", "WARNING", "EMERGENCY"]

    # Verify stream breakdown
    breakdown = data["stream_breakdown"]
    assert "optical_hazard" in breakdown
    assert "glacier_velocity_surge" in breakdown
    assert "lake_expansion_dynamics" in breakdown
    assert "temperature_thermal_driver" in breakdown
    assert "rainfall_accumulation" in breakdown


def test_api_timeseries():
    """Verify timeseries endpoint returns multi-sensor synchrony."""
    resp = client.get("/api/timeseries?start_date=2021-01-01&end_date=2022-12-31")
    assert resp.status_code == 200
    data = resp.json()

    assert "series" in data
    assert len(data["series"]) > 0
    sample = data["series"][0]
    assert "glacier_velocity_m_day" in sample
    assert "temp_mean_c" in sample
    assert "precipitation_mm" in sample
    assert "lake_area_km2" in sample


def test_api_inundation_scenarios():
    """Verify inundation endpoints return valid GeoJSON FeatureCollections."""
    for scen in ["low", "medium", "high"]:
        resp = client.get(f"/api/inundation/{scen}")
        assert resp.status_code == 200
        geojson = resp.json()
        assert geojson["type"] == "FeatureCollection"
        assert len(geojson["features"]) > 0
        assert "geometry" in geojson["features"][0]
        assert "inundated_area_km2" in geojson["features"][0]["properties"]


def test_api_exposure_scenario():
    """Verify exposure endpoint returns asset impact metrics and Hassanabad bridge."""
    resp = client.get("/api/exposure/high")
    assert resp.status_code == 200
    data = resp.json()

    assert "summary" in data
    summary = data["summary"]
    assert "total_exposed_roads_km" in summary
    assert "exposed_bridge_count" in summary
    assert "hassanabad_bridge_washout_risk" in summary
    assert summary["hassanabad_bridge_washout_risk"] is True
    assert "osm_geojson" in data

