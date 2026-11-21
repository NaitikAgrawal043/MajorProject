"""
test_phase3_downstream.py - Automated Unit & Integration Tests for Phase 3 Downstream Inundation & Exposure.
Verifies:
  - D8 flow routing & HAND elevation grid calculations
  - Inundation scenario GeoJSON generation (2m, 5m, 10m HAND thresholds)
  - Monotonic inundation area scaling (Low < Medium < High)
  - Spatial intersection with OSM downstream assets (roads, bridges, settlements)
  - Identification of Hassanabad Bridge washout risk under high flood scenario
"""

import json
from pathlib import Path
import numpy as np
import pytest

from ml.downstream.hand_model import (
    compute_d8_drainage_and_hand,
    generate_all_scenarios,
    SCENARIO_THRESHOLDS,
)
from ml.downstream.exposure import calculate_exposure, evaluate_all_scenarios


def test_hand_model_d8_routing():
    """Verify D8 flow routing and HAND array computation."""
    # Synthetic sloping valley DEM
    h, w = 100, 100
    y, x = np.ogrid[:h, :w]
    # Valley bottom along column 50
    dem = 2500.0 + 5.0 * y + 30.0 * np.abs(x - 50)
    dem = dem.astype(np.float32)

    hand, stream_mask, smoothed = compute_d8_drainage_and_hand(dem)

    assert hand.shape == (100, 100)
    assert not np.isnan(hand).any(), "HAND grid must have zero NaNs"
    assert (hand >= 0.0).all(), "HAND must be non-negative"
    assert stream_mask.sum() > 0, "Drainage stream channel must be detected"
    # Channel pixels must have HAND close to zero
    assert hand[stream_mask].mean() < 2.0, "Stream channel pixels should have near-zero HAND"


def test_inundation_scenario_generation(tmp_path):
    """Verify low, medium, and high scenario GeoJSONs generation and monotonic scaling."""
    scenarios_dir = tmp_path / "scenarios"
    paths = generate_all_scenarios(output_dir=scenarios_dir)

    assert "low_risk_2m" in paths
    assert "medium_risk_5m" in paths
    assert "high_risk_10m" in paths

    areas = {}
    for name, p in paths.items():
        assert p.exists(), f"Scenario file {p} must exist"
        with open(p, "r", encoding="utf-8") as f:
            data = json.load(f)
        assert data["type"] == "FeatureCollection"
        assert len(data["features"]) > 0
        props = data["features"][0]["properties"]
        assert "inundated_area_km2" in props
        areas[name] = props["inundated_area_km2"]

    # Monotonic scaling check: Low (2m) <= Medium (5m) <= High (10m)
    assert areas["low_risk_2m"] <= areas["medium_risk_5m"], "Medium scenario must encompass Low scenario area"
    assert areas["medium_risk_5m"] <= areas["high_risk_10m"], "High scenario must encompass Medium scenario area"


def test_exposure_engine_intersection(tmp_path):
    """Verify spatial intersection of inundation scenarios with OSM assets."""
    scenarios_dir = tmp_path / "scenarios"
    generate_all_scenarios(output_dir=scenarios_dir)

    high_scen = scenarios_dir / "high_risk_10m.geojson"
    low_scen = scenarios_dir / "low_risk_2m.geojson"

    # Evaluate high scenario
    high_exp = calculate_exposure(high_scen)
    assert "summary" in high_exp
    assert high_exp["summary"]["total_exposed_roads_km"] > 0, "High scenario must intersect road network"
    assert high_exp["summary"]["exposed_bridge_count"] > 0, "High scenario must identify bridge exposure"
    assert high_exp["summary"]["hassanabad_bridge_washout_risk"] is True, "High scenario must flag Hassanabad Bridge washout"

    # Evaluate low scenario
    low_exp = calculate_exposure(low_scen)
    # Low scenario should affect fewer or equal road km than high scenario
    assert low_exp["summary"]["total_exposed_roads_km"] <= high_exp["summary"]["total_exposed_roads_km"]

