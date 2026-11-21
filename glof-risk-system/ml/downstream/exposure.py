"""
exposure.py - Spatial Asset Exposure Engine.
Intersects HAND inundation scenarios (low, medium, high) with OSM downstream assets.
Calculates:
  - Exposed buildings & settlement populations
  - Exposed road network length (km) along Karakoram Highway
  - Vulnerable and inundated bridge crossings (specifically Hassanabad Bridge)
"""

import json
import logging
from pathlib import Path
from typing import Dict, List, Optional
import geopandas as gpd
from shapely.geometry import shape

logger = logging.getLogger(__name__)

SCENARIO_FILES = {
    "low": "data/scenarios/low_risk_2m.geojson",
    "medium": "data/scenarios/medium_risk_5m.geojson",
    "high": "data/scenarios/high_risk_10m.geojson",
}
OSM_DEFAULT_PATH = "data/raw/osm_downstream_hunza.geojson"


def calculate_exposure(
    scenario_path: Path,
    osm_path: Path = Path(OSM_DEFAULT_PATH),
) -> Dict:
    """
    Perform spatial intersection between an inundation scenario polygon and OSM assets.
    """
    if not scenario_path.exists():
        raise FileNotFoundError(f"Scenario GeoJSON not found: {scenario_path}")
    if not osm_path.exists():
        raise FileNotFoundError(f"OSM assets GeoJSON not found: {osm_path}")

    # Load scenario inundation polygon
    with open(scenario_path, "r", encoding="utf-8") as f:
        scen_data = json.load(f)
    scen_features = scen_data.get("features", [])
    if not scen_features:
        return {"error": "Empty scenario features"}

    inundation_geom = shape(scen_features[0]["geometry"])
    scenario_props = scen_features[0].get("properties", {})

    # Load OSM assets
    with open(osm_path, "r", encoding="utf-8") as f:
        osm_data = json.load(f)

    exposed_roads = []
    exposed_bridges = []
    exposed_buildings = []
    exposed_settlements = []

    total_road_km = 0.0
    kkh_flooded_km = 0.0

    for feat in osm_data.get("features", []):
        props = feat.get("properties", {})
        geom = shape(feat["geometry"])

        # Spatial intersection test
        if inundation_geom.intersects(geom):
            intersection = inundation_geom.intersection(geom)

            # Check if road
            if "highway" in props and props["highway"] is not None:
                # Approximate line length in degrees to kilometers (~111 km/deg in Karakoram)
                length_km = round(intersection.length * 111.0, 2)
                if length_km > 0.01:
                    total_road_km += length_km
                    is_kkh = "Karakoram" in props.get("name", "") or props.get("highway") == "trunk"
                    if is_kkh:
                        kkh_flooded_km += length_km

                    exposed_roads.append({
                        "id": props.get("id"),
                        "name": props.get("name", "Unnamed Road"),
                        "highway": props.get("highway"),
                        "flooded_length_km": length_km,
                    })

            # Check if bridge
            if props.get("bridge") == "yes" or "Bridge" in props.get("name", ""):
                is_hassanabad = "Hassanabad" in props.get("name", "")
                exposed_bridges.append({
                    "id": props.get("id"),
                    "name": props.get("name", "Bridge Crossing"),
                    "is_hassanabad_bridge": is_hassanabad,
                    "status": "IMMINENT_STRUCTURAL_WASHOUT" if is_hassanabad and "10m" in scenario_props.get("scenario", "") else "THREATENED",
                    "criticality": props.get("criticality", "HIGH"),
                })

            # Check if building
            if "building" in props and props["building"] is not None:
                exposed_buildings.append({
                    "id": props.get("id"),
                    "name": props.get("name", "Structure"),
                    "type": "residential" if "Residential" in props.get("name", "") else "commercial_utility",
                })

            # Check if settlement point
            if "place" in props and props["place"] is not None:
                exposed_settlements.append({
                    "name": props.get("name"),
                    "place": props.get("place"),
                    "population": props.get("population"),
                })

    return {
        "scenario": scenario_props.get("scenario", "Unknown"),
        "hand_threshold_m": scenario_props.get("threshold_m", 0.0),
        "inundated_area_km2": scenario_props.get("inundated_area_km2", 0.0),
        "summary": {
            "total_exposed_roads_km": round(total_road_km, 2),
            "kkh_flooded_km": round(kkh_flooded_km, 2),
            "exposed_bridge_count": len(exposed_bridges),
            "exposed_building_count": len(exposed_buildings),
            "threatened_settlements_count": len(exposed_settlements),
            "hassanabad_bridge_washout_risk": any(b.get("is_hassanabad_bridge") for b in exposed_bridges),
        },
        "details": {
            "bridges": exposed_bridges,
            "roads": exposed_roads,
            "buildings": exposed_buildings,
            "settlements": exposed_settlements,
        },
    }


def evaluate_all_scenarios(
    scenarios_dir: Path = Path("data/scenarios"),
    osm_path: Path = Path(OSM_DEFAULT_PATH),
) -> Dict[str, Dict]:
    """Calculate and log exposure metrics for all 3 scenarios."""
    results = {}
    for scen_key, file_rel in SCENARIO_FILES.items():
        scen_file = Path(file_rel)
        if scen_file.exists():
            exposure = calculate_exposure(scen_file, osm_path=osm_path)
            results[scen_key] = exposure
            logger.info(
                f"Exposure for {scen_key}: {exposure['summary']['total_exposed_roads_km']} km roads, "
                f"{exposure['summary']['exposed_bridge_count']} bridges, "
                f"{exposure['summary']['exposed_building_count']} buildings."
            )
    return results


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    res = evaluate_all_scenarios()
    print("Exposure results:", json.dumps(res, indent=2))

