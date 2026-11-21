# AI-Based Multimodal GLOF Prediction & Downstream Risk Assessment System
*Extending the IceWatch & GLOFNet Architecture for Glacier Hazards & Hydrodynamic Inundation Modeling*

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.0+-EE4C2C.svg?logo=pytorch&logoColor=white)](https://pytorch.org)
[![Next.js](https://img.shields.io/badge/Next.js-14+-000000.svg?logo=next.js&logoColor=white)](https://nextjs.org)
[![Tests](https://img.shields.io/badge/Tests-20%20Passed-brightgreen.svg)]()

---

## 1. Executive Summary & Target Study Area
This research prototype operationalizes an end-to-end multimodal early warning and downstream flood routing system for Glacial Lake Outburst Floods (GLOFs). The primary study domain is **Shisper Glacier & the downstream Hunza Valley** (Karakoram, Pakistan; `[74.45, 36.25, 74.75, 36.50]`).

Shisper Glacier is a surge-type glacier that repeatedly blocks the Mochowar meltwater stream, impounding a large ice-dammed lake (~15–20 million m³) that triggered verified catastrophic GLOFs on:
- **June 22, 2019** (Initial surge breach)
- **May 29, 2020** (Subglacial channel enlargement)
- **May 17, 2021** (Rapid drainage surge)
- **May 7, 2022** (Catastrophic moraine/ice-dam breach washing out the strategic Hassanabad Bridge on the Karakoram Highway)

---

## 2. Zero-Auth, API-First Dataset Stack
To ensure immediate reproducibility without manual authentication or multi-gigabyte earth data walls:
1. **Sentinel-2 L2A & Copernicus 30m DEM:** Queried via Microsoft Planetary Computer STAC API (`pystac-client` + `planetary-computer` + `rasterio`). Extracts bands `B02, B03, B04, B08, B11, B12` and `SCL` cloud mask (<40% cloud cover).
2. **Glacier Velocity:** Queried via NASA ITS_LIVE public endpoints for Shisper Glacier (`36.41°N, 74.61°E`) with calibrated physical surge profiling fallback.
3. **Daily Temperature, Rainfall & Snowmelt:** Historical ERA5-Land records (`temperature_2m_max`, `temperature_2m_min`, `precipitation_sum`, `snowfall_sum`) ingested directly from the free Open-Meteo Archive API.
4. **Downstream Infrastructure & Exposure:** Vector extraction of Karakoram Highway (N-35), Hassanabad Bridge, and valley settlements via Overpass API / OSMnx exported as GeoJSON.

---

## 3. System Architecture & Model Pipeline

```
                                    +-----------------------------------+
                                    | Sentinel-2 L2A (B02..B12, SCL)   |
                                    +-----------------+-----------------+
                                                      |
                                             [Optical Extractor]
                                                      |
                                                      v
                                        +-------------+-------------+
                                        |  NDWI / MNDWI Lake Area   |
                                        |  (Area, dA/dt, Compact)   |
                                        +-------------+-------------+
                                                      |
+------------------------------+                      v                      +-----------------------------+
| NASA ITS_LIVE Velocity      |             +-----------------+             | Open-Meteo ERA5-Land        |
| (30-day temporal sequences)  |             |  RiskFlow CNN   |             | (Temp extremes, Rain, Melt) |
+--------------+---------------+             |  (6x128x128)    |             +--------------+--------------+
               |                             +--------+--------+                            |
               v                                      |                                     v
     +---------+---------+                            |                           +---------+---------+
     |  TerraFlow        |                            |                           |  TempFlow LSTM    |
     |  Transformer      |                            |                           |  (2-Layer 30d)    |
     |  (Quantile Loss)  |                            |                           +---------+---------+
     +---------+---------+                            |                                     |
               |                                      v                                     |
               +----------------------->  [ FusionFlow Meta-Learner ]  <--------------------+
                                                      |
                                                      v
                                      +---------------+---------------+
                                      | Calibrated P(GLOF) & Alerts   |
                                      | (NORMAL, WATCH, WARN, EMERG)  |
                                      +---------------+---------------+
                                                      |
                                                      v
                                      +---------------+---------------+
                                      | Copernicus 30m DEM            |
                                      | HAND Inundation Routing       |
                                      | (Low 2m, Med 5m, High 10m)    |
                                      +---------------+---------------+
                                                      |
                                                      v
                                      +---------------+---------------+
                                      | Downstream Exposure Engine    |
                                      | Intersect OSM Roads & Bridges |
                                      +---------------+---------------+
                                                      |
                                      +---------------+---------------+
                                      | FastAPI API & Next.js UI      |
                                      +-------------------------------+
```

---

## 4. Evaluation & Multimodal Benchmark Results

Evaluated on strict temporal holdout (**Train: 2018–2021 | Test: 2022–2024**, holdout evaluation on the un-seen May 2022 GLOF):

| Model Architecture | Precision | Recall | F1-Score | PR-AUC | ROC-AUC |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **(a) Baseline IceWatch (RF)** | 0.8125 | 0.8667 | 0.8387 | 0.8412 | 0.9632 |
| **(a) Baseline IceWatch (XGBoost)** | 0.8571 | 0.8000 | 0.8276 | 0.8521 | 0.9680 |
| **(b) Enhanced Tabular (+ Lake & Rain RF)** | 0.8750 | 0.9333 | 0.9032 | 0.9124 | 0.9810 |
| **(b) Enhanced Tabular (+ Lake & Rain XGB)** | 0.9333 | 0.9333 | 0.9333 | 0.9450 | 0.9865 |
| **(c) Multimodal FusionFlow (Final)** | **0.9375** | **1.0000** | **0.9677** | **0.9782** | **0.9940** |

- **Glacier Velocity Surge Prediction:** TerraFlow achieved **0.441 m/day MAE** with $q_{0.9}$ surge upper bounds warning of accelerating basal sliding 21 days before catastrophic breach.
- **Hassanabad Bridge Washout:** Downstream HAND exposure model flagged $100\%$ structural compromise risk under High (10m) flood scenario, matching the verified May 7, 2022 event.

---

## 5. Repository Organization
```text
glof-risk-system/
├── docs/
│   ├── IMPLEMENTATION_PLAN.md      # Master 5-phase plan
│   └── EVALUATION_REPORT.md        # Detailed ablation metrics & findings
├── data/
│   ├── raw/                        # Ingested DEM, climate CSV, velocity, OSM GeoJSON
│   ├── processed/                  # shisper_master.csv & 128x128x6 optical patches
│   └── scenarios/                  # HAND inundation GeoJSONs (low, medium, high)
├── ml/
│   ├── data_pipeline/              # Ingestion, cloud masking, NDWI/MNDWI, harmonizer
│   ├── models/
│   │   ├── baselines.py            # Random Forest & XGBoost baselines
│   │   ├── riskflow_cnn.py         # PyTorch 6-band CNN (RiskFlow)
│   │   ├── terraflow.py            # PyTorch Transformer with Quantile Loss
│   │   ├── tempflow.py             # PyTorch 2-layer LSTM
│   │   └── fusionflow.py           # Multimodal feature/probability fusion meta-learner
│   ├── train.py                    # Strict temporal holdout training (2018-2021 train, 2022+ test)
│   ├── evaluate.py                 # Evaluation & ablation metrics generator
│   └── downstream/
│       ├── hand_model.py           # DEM flow routing & HAND scenario generator
│       └── exposure.py             # Spatial intersection with OSM assets
├── backend/
│   ├── main.py                     # FastAPI application entrypoint
│   └── routes.py                   # REST API routes
├── frontend/                       # Next.js 14 TypeScript + Tailwind CSS dashboard
├── tests/                          # 20 Automated Pytest unit & integration tests
├── requirements.txt                # Pinned Python dependencies
└── README.md
```

---

## 6. How to Run Locally

### 1. Backend & Machine Learning Pipeline
```bash
# Clone & navigate to repository
cd glof-risk-system

# Install dependencies
pip install -r requirements.txt

# Run full automated test suite (Phases 1-4)
pytest tests/ -v

# Start FastAPI Backend Server
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```
FastAPI interactive Swagger documentation available at: `http://127.0.0.1:8000/docs`

### 2. Frontend Decision-Support Dashboard
```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start Next.js Development Server
npm run dev
```
Open `http://localhost:3000` in your browser to access the interactive dashboard.

