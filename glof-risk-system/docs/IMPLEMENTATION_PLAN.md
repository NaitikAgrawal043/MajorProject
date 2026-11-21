# AI-Based Multimodal GLOF Prediction & Downstream Risk Assessment
## Master Implementation Plan & Architectural Roadmap

### System Overview & Objectives
This research prototype extends the IceWatch/GLOFNet architecture to establish an end-to-end early warning and downstream risk assessment platform for Glacial Lake Outburst Floods (GLOFs), specifically tailored to **Shisper Glacier & the downstream Hunza Valley** (Karakoram, Pakistan; `[74.45, 36.25, 74.75, 36.50]`).

The system couples:
1. **Multimodal Early Warning Forecasting**:
   - 6-band Sentinel-2 optical imagery + NDWI/MNDWI lake surface dynamics.
   - NASA ITS_LIVE satellite radar glacier surface velocity time-series.
   - ERA5-Land daily historical meteorological records (temperature extremes, liquid precipitation, snowmelt/snowfall).
   - Multimodal late-fusion meta-learner (FusionFlow) combining specialized neural models and decision tree baselines.
2. **DEM-Based Hydrodynamic Downstream Modeling**:
   - 30m Copernicus DEM flow direction and Height Above Nearest Drainage (HAND) inundation scenario generator.
   - Inundation contours for Low (2m), Medium (5m), and High (10m) water levels along the Hunza River corridor (Hassanabad to Aliabad).
3. **Downstream Asset Exposure & Impact Engine**:
   - Zero-auth OpenStreetMap extraction of buildings, critical road corridors (Karakoram Highway / N-35), and bridges (including the historically damaged Hassanabad Bridge).
   - Exact spatial intersection computing exposed population settlements, road length ($km$), and vulnerable structures.
4. **Full-Stack Operational Decision Support Platform**:
   - High-throughput FastAPI asynchronous backend serving risk probabilities, time-series, and inundation/exposure GeoJSON layers.
   - Interactive Next.js (TypeScript + Tailwind CSS + Leaflet + Recharts) dashboard with temporal date scrubbing, scenario simulation, and multi-sensor synchrony.

---

## 5-Phase Detailed Implementation Roadmap

### Phase 1: Data Ingestion & Feature Engineering (`ml/data_pipeline/`)
- **Objectives:**
  - Build zero-auth API ingestion clients for:
    - Microsoft Planetary Computer STAC (`pystac-client`): Sentinel-2 L2A optical scenes (`B02, B03, B04, B08, B11, B12, SCL`) and Copernicus 30m DEM.
    - NASA ITS_LIVE: Glacier surface velocity time-series for Shisper Glacier (`36.41°N, 74.61°E`) with robust public endpoint streaming and resilient fallback schema.
    - Open-Meteo Historical Archive API: Daily `temperature_2m_max`, `temperature_2m_min`, `precipitation_sum`, `snowfall_sum` (`2018-01-01` to `2024-12-31`).
    - OpenStreetMap Overpass API: Downstream critical assets (roads, bridges, settlements) in GeoJSON.
  - Compute optical lake dynamics:
    - Normalized Difference Water Index: $NDWI = \frac{B03 - B08}{B03 + B08}$
    - Modified NDWI: $MNDWI = \frac{B03 - B11}{B03 + B11}$
    - Cloud filtering ($<40\%$ scene cover using Scene Classification Layer `SCL`).
    - Lake surface area ($km^2$), change rate ($\Delta A / \Delta t$), and perimeter compactness index.
  - Feature harmonization:
    - Daily master tabular dataset (`data/processed/shisper_master.csv`).
    - Cyclical day-of-year temporal features: $\sin(2\pi \cdot \text{doy} / 365.25)$, $\cos(2\pi \cdot \text{doy} / 365.25)$.
    - Rolling 7/15/30-day cumulative precipitation and temperature anomalies ($\Delta T_{roll}$).
    - Extract standardized $128 \times 128 \times 6$ Sentinel-2 spatial patches saved as model-ready numpy tensors (`.npy`).
- **Verification & Testing:**
  - Automated tests verifying data integrity, zero NaNs in processed feature matrices, CRS alignment (WGS84 `EPSG:4326` and UTM Zone 43N `EPSG:32643`), and ground truth label alignment around known Shisper GLOFs (`2019-06-22`, `2020-05-29`, `2021-05-17`, `2022-05-07`).

---

### Phase 2: Multimodal Modeling, Baselines & Ablation (`ml/models/`, `ml/train.py`, `ml/evaluate.py`)
- **Objectives:**
  - **Strict Anti-Leakage Protocol**:
    - Temporal holdout splitting: Train set `2018-01-01` to `2021-12-31`; Test set `2022-01-01` to `2024-12-31` (evaluating on the un-seen May 2022 GLOF).
    - Image augmentations (random spatial flips, rotations) applied strictly to the training fold.
    - High-imbalance mitigation: Class-weighted Binary Cross-Entropy with focal penalty.
  - **Architectures**:
    1. **Baselines (`ml/models/baselines.py`)**: Random Forest & XGBoost classifiers trained on tabular hydrometeorological and lake dynamics features.
    2. **RiskFlow (`ml/models/riskflow_cnn.py`)**: 6-channel PyTorch CNN ($6 \times 128 \times 128$) featuring 3 Conv2D+ReLU+MaxPool blocks (channels 32, 64, 128), Dense(128), Dropout(0.5), Sigmoid hazard head.
    3. **TerraFlow (`ml/models/terraflow.py`)**: PyTorch Transformer Encoder (4 layers, 8 heads, $d_{model}=256$) with Quantile Loss ($q_{0.1}, q_{0.5}, q_{0.9}$) on 30-day surface velocity sequences.
    4. **TempFlow (`ml/models/tempflow.py`)**: 2-layer LSTM ($100 \to 50$ units, dropout 0.2) processing 30-day rolling meteorological trajectories.
    5. **FusionFlow (`ml/models/fusionflow.py`)**: Multimodal meta-learner fusing optical hazard logit, velocity surge forecast, temperature anomaly, lake expansion velocity, and accumulated rainfall into calibrated probability $P(\text{GLOF}) \in [0.0, 1.0]$.
  - **Evaluation & Ablation**:
    - Metrics: Precision, Recall, F1-Score, PR-AUC, ROC-AUC, and Velocity MAE.
    - Ablation comparison: Baseline vs. Base IceWatch features vs. Multimodal Enhanced (+ Lake Dynamics + Rainfall).
    - Checkpoint persistence in `ml/checkpoints/` and automated report generation (`docs/EVALUATION_REPORT.md`).
- **Verification & Testing:**
  - Forward/backward pass unit tests for all PyTorch models.
  - Test temporal split enforcement and metric calculation scripts.

---

### Phase 3: Downstream Inundation & Exposure Engine (`ml/downstream/`)
- **Objectives:**
  - **HAND Hydrological Routing (`hand_model.py`)**:
    - Process Copernicus 30m DEM over the Hunza River corridor downstream of Shisper terminus (`Hassanabad` to `Aliabad`).
    - Compute D8 flow direction, flow accumulation, and channel drainage network.
    - Derive Height Above Nearest Drainage (HAND) raster grid.
    - Generate 3 distinct flood scenario polygons stored as GeoJSON in `data/scenarios/`:
      - `low_risk_2m.geojson`: HAND $\le 2\text{m}$ (minor river swell / baseline discharge).
      - `medium_risk_5m.geojson`: HAND $\le 5\text{m}$ (moderate breach / 2021-scale surge).
      - `high_risk_10m.geojson`: HAND $\le 10\text{m}$ (catastrophic moraine/ice dam collapse / 2022 Hassanabad Bridge washout scale).
  - **Downstream Asset Exposure Engine (`exposure.py`)**:
    - Perform spatial intersection of inundation polygons with OSM vector layers.
    - Quantify exposed assets:
      - Building/settlement footprints affected.
      - Flooded road segment lengths ($km$) along N-35 Karakoram Highway.
      - Threatened bridge crossings (including Hassanabad Bridge at `36.312°N, 74.595°E`).
- **Verification & Testing:**
  - Pytest verification for valid GeoJSON topology, valid bounding boxes, non-negative inundation areas, and accurate intersection counts.

---

### Phase 4: FastAPI Backend Architecture (`backend/`)
- **Objectives:**
  - Build high-performance, asynchronous REST API using FastAPI:
    - `GET /api/risk/summary?date=YYYY-MM-DD`: Returns multimodal GLOF probability, alert level (`Low`, `Medium`, `High`, `Critical`), and component attribution scores.
    - `GET /api/timeseries`: Serves historical and forecasted glacier velocity, temperature, rainfall, and lake area time-series for frontend charting.
    - `GET /api/inundation/{scenario}`: Serves optimized GeoJSON for `low`, `medium`, or `high` scenario polygons.
    - `GET /api/exposure/{scenario}`: Returns detailed tabular and geospatial exposure metrics for roads, bridges, and settlements.
    - `GET /api/health`: Healthcheck and system status.
  - CORS configuration for local frontend communication.
- **Verification & Testing:**
  - Pytest test suite using `TestClient(app)` validating status codes (200 OK), response schemas, and error handling for invalid dates/scenarios.

---

### Phase 5: Interactive Decision-Support Dashboard (`frontend/`)
- **Objectives:**
  - Develop Next.js (React 19 / App Router, TypeScript, Tailwind CSS) dashboard:
    - **Top KPI Banner**: Current GLOF Risk Probability, Dynamic Alert Badge (`NORMAL`, `WATCH`, `WARNING`, `EMERGENCY`), Current Lake Area ($km^2$), and Exposed Infrastructure Count.
    - **Interactive Geospatial Map**: Leaflet / React-Leaflet integration rendering:
      - Shisper Glacier boundary and supraglacial/ice-dammed lake polygon.
      - Toggleable Low (2m), Medium (5m), and High (10m) HAND inundation layers.
      - Vector overlays of exposed OSM roads, Hassanabad bridge marker, and settlements.
    - **Date & Scenario Replay Simulator**: Date slider enabling scrubbing through historical precursor windows (specifically May 2022 GLOF) to inspect real-time risk evolution.
    - **Multimodal Time-Series Analytics**: Interactive Recharts components displaying synchronized trends:
      - Glacier Velocity (ITS_LIVE) + Quantile forecast intervals.
      - Max/Min Temperature & Freezing Level proxy.
      - Cumulative 7-day Precipitation.
      - NDWI/MNDWI Lake Surface Expansion.
- **Verification & Testing:**
  - Frontend production build verification (`npm run build`).
  - End-to-end integration test verifying FastAPI + Next.js data transfer and interactive responsiveness.

---

## Directory Organization & File Manifest
```text
glof-risk-system/
├── docs/
│   ├── IMPLEMENTATION_PLAN.md
│   └── EVALUATION_REPORT.md
├── data/
│   ├── raw/                  # Downloaded Sentinel-2 patches, DEM, CSVs, OSM GeoJSONs
│   ├── processed/            # Harmonized daily feature tables, 128x128x6 numpy tensors
│   └── scenarios/            # Pre-computed HAND inundation GeoJSONs (Low, Medium, High)
├── ml/
│   ├── data_pipeline/        # Ingestion, cloud masking, NDWI/MNDWI extractor, harmonizer
│   ├── models/
│   │   ├── baselines.py      # Random Forest & XGBoost baselines
│   │   ├── riskflow_cnn.py   # PyTorch 6-band CNN (RiskFlow)
│   │   ├── terraflow.py      # PyTorch Transformer with Quantile Loss
│   │   ├── tempflow.py       # PyTorch 2-layer LSTM
│   │   └── fusionflow.py     # Multimodal feature/probability fusion meta-learner
│   ├── train.py              # Strict temporal holdout training
│   ├── evaluate.py           # Evaluation & ablation metrics generator
│   └── downstream/
│       ├── hand_model.py     # DEM flow routing & HAND scenario generator
│       └── exposure.py       # Spatial intersection with OSM assets
├── backend/
│   ├── main.py               # FastAPI entrypoint
│   └── routes.py             # API endpoints
├── frontend/                 # Next.js TypeScript + Tailwind dashboard
├── tests/                    # Pytest test suite
├── requirements.txt
└── README.md
```

