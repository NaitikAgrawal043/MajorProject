"""
test_phase1_data.py - Automated Unit & Integration Tests for Phase 1 Data Pipeline.
Verifies:
  - Non-empty datasets
  - Zero NaNs in model-ready features and tensors
  - Realistic physical limits & valid CRS metadata
  - Correct GLOF ground-truth precursor labeling
"""

import os
from pathlib import Path
import numpy as np
import pandas as pd
import pytest

from ml.data_pipeline.climate_client import fetch_open_meteo_climate
from ml.data_pipeline.velocity_client import fetch_itslive_velocity
from ml.data_pipeline.stac_client import (
    generate_synthetic_sentinel2_cube,
    fetch_or_generate_dem,
    SHISPER_BBOX,
)
from ml.data_pipeline.lake_extractor import (
    compute_ndwi,
    compute_mndwi,
    extract_lake_metrics,
)
from ml.data_pipeline.osm_client import fetch_osm_assets
from ml.data_pipeline.harmonizer import build_harmonized_dataset, VERIFIED_GLOF_DATES


def test_climate_ingestion(tmp_path):
    """Verify ERA5-Land climate series ingestion, rolling anomalies, and no NaNs."""
    cache_file = tmp_path / "test_climate.csv"
    df = fetch_open_meteo_climate(
        start_date="2020-01-01",
        end_date="2020-12-31",
        cache_path=cache_file,
    )
    assert not df.empty, "Climate dataset must not be empty"
    assert len(df) >= 365, "Must cover full year of daily records"
    assert "temp_mean_c" in df.columns
    assert "precipitation_mm" in df.columns
    assert "temp_7d_mean" in df.columns
    assert "precip_7d_sum" in df.columns
    assert not df["temp_mean_c"].isna().any(), "Temperature cannot contain NaNs"
    assert not df["precipitation_mm"].isna().any(), "Precipitation cannot contain NaNs"
    assert cache_file.exists(), "Cache file must be persisted"


def test_glacier_velocity(tmp_path):
    """Verify NASA ITS_LIVE glacier velocity series and physical bounds."""
    cache_file = tmp_path / "test_velocity.csv"
    df = fetch_itslive_velocity(
        start_date="2020-01-01",
        end_date="2020-12-31",
        cache_path=cache_file,
    )
    assert not df.empty, "Glacier velocity dataset must not be empty"
    assert "velocity_m_day" in df.columns
    assert "velocity_7d_mean" in df.columns
    assert not df["velocity_m_day"].isna().any(), "Velocity cannot contain NaNs"
    # Karakoram surging glacier speeds lie between 0.1 and 10.0 m/day
    assert (df["velocity_m_day"] >= 0.05).all(), "Glacier velocity must be non-negative"
    assert (df["velocity_m_day"] <= 12.0).all(), "Velocity exceeds physical Karakoram bounds"


def test_sentinel2_optical_patch_and_indices():
    """Verify Sentinel-2 6-band tensor generation and NDWI/MNDWI indices."""
    cube = generate_synthetic_sentinel2_cube("2021-05-15", is_event_precursor=True)
    assert cube.shape == (128, 128, 6), f"Expected shape (128, 128, 6), got {cube.shape}"
    assert not np.isnan(cube).any(), "Sentinel-2 patch must not have NaNs"
    assert (cube >= 0.0).all() and (cube <= 1.0).all(), "Reflectance must be normalized to [0, 1]"

    ndwi = compute_ndwi(cube)
    mndwi = compute_mndwi(cube)
    assert ndwi.shape == (128, 128)
    assert mndwi.shape == (128, 128)
    assert not np.isnan(ndwi).any()
    assert not np.isnan(mndwi).any()

    metrics = extract_lake_metrics(cube)
    assert "lake_area_km2" in metrics
    assert "compactness" in metrics
    assert metrics["lake_area_km2"] > 0.0, "Lake area must be positive for precursor state"
    assert 0.0 <= metrics["compactness"] <= 1.0, "Compactness must be in [0, 1]"


def test_copernicus_dem_topography(tmp_path):
    """Verify Copernicus 30m DEM elevation range, shape, and metadata."""
    dem_cache = tmp_path / "test_dem.npy"
    dem, meta = fetch_or_generate_dem(cache_path=dem_cache)
    assert dem.shape == (256, 256)
    assert not np.isnan(dem).any()
    # Hunza Valley elevation spans 2000m to 6200m
    assert meta["min_elev"] >= 2000.0, f"Min elevation too low: {meta['min_elev']}"
    assert meta["max_elev"] <= 6500.0, f"Max elevation too high: {meta['max_elev']}"
    assert meta["crs"] == "EPSG:4326"


def test_osm_downstream_exposure_assets(tmp_path):
    """Verify Downstream OSM GeoJSON extraction contains critical bridges and roads."""
    osm_cache = tmp_path / "test_osm.geojson"
    geojson = fetch_osm_assets(cache_path=osm_cache)
    assert geojson["type"] == "FeatureCollection"
    assert len(geojson["features"]) > 0, "OSM assets must contain features"

    # Verify Hassanabad Bridge and KKH presence
    names = [f["properties"].get("name", "") for f in geojson["features"]]
    has_hassanabad = any("Hassanabad" in name for name in names)
    has_kkh = any(
        "Karakoram" in f["properties"].get("name", "")
        or "KKH" in f["properties"].get("name", "")
        or f["properties"].get("highway") == "trunk"
        for f in geojson["features"]
    )
    assert has_hassanabad, "Downstream assets must include Hassanabad Bridge / area"
    assert has_kkh, "Downstream assets must include Karakoram Highway corridor"


def test_harmonized_master_dataset(tmp_path):
    """Verify full end-to-end master dataset creation, feature columns, and labeling."""
    out_dir = tmp_path / "processed"
    raw_dir = tmp_path / "raw"
    df = build_harmonized_dataset(
        start_date="2019-01-01",
        end_date="2022-12-31",
        output_dir=out_dir,
        raw_dir=raw_dir,
        generate_patches=True,
    )

    assert not df.empty
    assert (out_dir / "shisper_master.csv").exists()
    assert not df.isna().any().any(), "Harmonized master dataset must have zero NaNs"

    # Verify cyclical encodings
    assert (df["doy_sin"] >= -1.0).all() and (df["doy_sin"] <= 1.0).all()
    assert (df["doy_cos"] >= -1.0).all() and (df["doy_cos"] <= 1.0).all()

    # Verify GLOF precursor labels match verified dates
    precursor_count = df["is_glof_precursor"].sum()
    assert precursor_count > 0, "Must have positive precursor event labels"

    # Check known event date is flagged as precursor
    for event_dt in VERIFIED_GLOF_DATES:
        matching_rows = df[df["time"] == event_dt.strftime("%Y-%m-%d")]
        if not matching_rows.empty:
            assert matching_rows.iloc[0]["is_glof_precursor"] == 1
