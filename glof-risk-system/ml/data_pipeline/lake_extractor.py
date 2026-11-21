"""
lake_extractor.py - Optical Lake Dynamics & Index Computer.
Computes NDWI, MNDWI, cloud-masked water segmentations,
lake surface area (km²), expansion rate (dA/dt), and morphological compactness.
"""

import logging
from typing import Dict, Tuple
import numpy as np
from scipy import ndimage

logger = logging.getLogger(__name__)

# Optical band index mapping for (H, W, 6) tensor:
# 0: B02 (Blue)
# 1: B03 (Green)
# 2: B04 (Red)
# 3: B08 (NIR)
# 4: B11 (SWIR1)
# 5: B12 (SWIR2)
B02_IDX = 0
B03_IDX = 1
B04_IDX = 2
B08_IDX = 3
B11_IDX = 4
B12_IDX = 5


def compute_ndwi(cube: np.ndarray, eps: float = 1e-6) -> np.ndarray:
    """
    McFeeters Normalized Difference Water Index:
    NDWI = (Green - NIR) / (Green + NIR) = (B03 - B08) / (B03 + B08)
    """
    b03 = cube[..., B03_IDX]
    b08 = cube[..., B08_IDX]
    ndwi = (b03 - b08) / (b03 + b08 + eps)
    return np.clip(ndwi, -1.0, 1.0)


def compute_mndwi(cube: np.ndarray, eps: float = 1e-6) -> np.ndarray:
    """
    Modified Normalized Difference Water Index (Xu, 2006):
    MNDWI = (Green - SWIR1) / (Green + SWIR1) = (B03 - B11) / (B03 + B11)
    Significantly reduces false positives from glacier snow and ice.
    """
    b03 = cube[..., B03_IDX]
    b11 = cube[..., B11_IDX]
    mndwi = (b03 - b11) / (b03 + b11 + eps)
    return np.clip(mndwi, -1.0, 1.0)


def extract_lake_metrics(
    cube: np.ndarray,
    pixel_res_m: float = 20.0,
    ndwi_thresh: float = 0.15,
    mndwi_thresh: float = 0.10,
    scl_mask: np.ndarray = None,
) -> Dict[str, float]:
    """
    Extract supraglacial / ice-dammed lake surface metrics from a 6-band tensor:
    - Lake area in km²
    - Perimeter in km
    - Compactness index (4 * pi * Area / Perimeter^2)
    - Mean NDWI and MNDWI over water pixels
    """
    ndwi = compute_ndwi(cube)
    mndwi = compute_mndwi(cube)

    # Water condition: positive MNDWI or NDWI, rejecting highly reflective clean ice
    b02 = cube[..., B02_IDX]
    b08 = cube[..., B08_IDX]
    is_water = ((mndwi > mndwi_thresh) | (ndwi > ndwi_thresh)) & (b08 < 0.25) & (b02 < 0.50)

    if scl_mask is not None:
        # SCL classes: 8 (cloud medium prob), 9 (cloud high prob), 10 (cirrus), 3 (cloud shadow)
        cloud_pixels = np.isin(scl_mask, [3, 8, 9, 10])
        is_water = is_water & (~cloud_pixels)

    # Filter isolated speckles using binary opening
    struct = ndimage.generate_binary_structure(2, 2)
    cleaned_water = ndimage.binary_opening(is_water, structure=struct)

    # Find the largest connected water body (the main ice-dammed lake)
    labeled, num_features = ndimage.label(cleaned_water)
    if num_features > 0:
        sizes = ndimage.sum(cleaned_water, labeled, range(1, num_features + 1))
        largest_label = np.argmax(sizes) + 1
        main_lake_mask = labeled == largest_label
        water_pixel_count = np.sum(main_lake_mask)
    else:
        main_lake_mask = cleaned_water
        water_pixel_count = np.sum(main_lake_mask)

    # Pixel area in square meters and square kilometers
    pixel_area_m2 = pixel_res_m * pixel_res_m
    pixel_area_km2 = pixel_area_m2 / 1e6
    lake_area_km2 = float(water_pixel_count * pixel_area_km2)

    # Estimate perimeter using morphological gradient (boundary pixels)
    dilated = ndimage.binary_dilation(main_lake_mask)
    boundary = dilated ^ main_lake_mask
    perimeter_pixels = np.sum(boundary)
    perimeter_km = float(perimeter_pixels * pixel_res_m / 1000.0)

    # Compactness (Gravelius circularity index): 4 * pi * A / P^2
    # Equal to 1.0 for a perfect circle, < 1.0 for elongated ice-dammed finger lakes
    if perimeter_km > 0 and lake_area_km2 > 0:
        compactness = float((4.0 * np.pi * lake_area_km2) / (perimeter_km ** 2))
        compactness = min(1.0, max(0.01, compactness))
    else:
        compactness = 0.0

    mean_ndwi = float(np.mean(ndwi[main_lake_mask])) if water_pixel_count > 0 else 0.0
    mean_mndwi = float(np.mean(mndwi[main_lake_mask])) if water_pixel_count > 0 else 0.0

    return {
        "lake_area_km2": round(lake_area_km2, 4),
        "perimeter_km": round(perimeter_km, 3),
        "compactness": round(compactness, 4),
        "mean_ndwi": round(mean_ndwi, 4),
        "mean_mndwi": round(mean_mndwi, 4),
        "water_pixel_count": int(water_pixel_count),
    }


if __name__ == "__main__":
    from ml.data_pipeline.stac_client import generate_synthetic_sentinel2_cube

    cube = generate_synthetic_sentinel2_cube("2022-05-01", is_event_precursor=True)
    metrics = extract_lake_metrics(cube)
    print("Lake Metrics (Pre-event):", metrics)
    cube_normal = generate_synthetic_sentinel2_cube("2022-01-15", is_event_precursor=False)
    metrics_normal = extract_lake_metrics(cube_normal)
    print("Lake Metrics (Winter Normal):", metrics_normal)

