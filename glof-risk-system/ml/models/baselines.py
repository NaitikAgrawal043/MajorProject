"""
baselines.py - Tabular Baselines (Random Forest & XGBoost) for GLOF Hazard Prediction.
Provides training, prediction, and feature importance analysis.
"""

import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
import xgboost as xgb

logger = logging.getLogger(__name__)

BASE_ICEWATCH_FEATURES = [
    "velocity_m_day",
    "velocity_7d_mean",
    "temp_mean_c",
    "temp_7d_mean",
]

ENHANCED_FEATURES = [
    "velocity_m_day",
    "velocity_7d_mean",
    "velocity_accel_7d",
    "temp_mean_c",
    "temp_anomaly_7d",
    "precip_7d_sum",
    "precip_15d_sum",
    "snowmelt_proxy_7d",
    "lake_area_km2",
    "lake_area_rate_7d",
    "lake_compactness",
    "lake_mean_ndwi",
    "lake_mean_mndwi",
    "doy_sin",
    "doy_cos",
]


class TabularBaselines:
    """
    Manages Random Forest and XGBoost classifiers for GLOF precursor prediction.
    """

    def __init__(self, feature_mode: str = "enhanced"):
        self.feature_mode = feature_mode
        self.feature_cols = ENHANCED_FEATURES if feature_mode == "enhanced" else BASE_ICEWATCH_FEATURES
        self.rf_model: Optional[RandomForestClassifier] = None
        self.xgb_model: Optional[xgb.XGBClassifier] = None

    def fit(self, X_train: pd.DataFrame, y_train: pd.Series) -> "TabularBaselines":
        X = X_train[self.feature_cols].values
        y = y_train.values

        # Calculate imbalance weight
        neg_count = np.sum(y == 0)
        pos_count = np.sum(y == 1)
        scale_pos_weight = float(neg_count) / max(1.0, float(pos_count))

        # 1. Random Forest
        self.rf_model = RandomForestClassifier(
            n_estimators=150,
            max_depth=6,
            class_weight="balanced",
            random_state=42,
            n_jobs=-1,
        )
        self.rf_model.fit(X, y)

        # 2. XGBoost
        self.xgb_model = xgb.XGBClassifier(
            n_estimators=150,
            max_depth=5,
            learning_rate=0.05,
            scale_pos_weight=scale_pos_weight,
            eval_metric="logloss",
            random_state=42,
            n_jobs=-1,
        )
        self.xgb_model.fit(X, y)

        logger.info(f"Fitted RF and XGBoost on {len(X)} samples ({pos_count} positive precursors).")
        return self

    def predict_proba(self, X_test: pd.DataFrame) -> Dict[str, np.ndarray]:
        X = X_test[self.feature_cols].values
        rf_proba = self.rf_model.predict_proba(X)[:, 1] if self.rf_model else np.zeros(len(X))
        xgb_proba = self.xgb_model.predict_proba(X)[:, 1] if self.xgb_model else np.zeros(len(X))
        return {
            "random_forest": rf_proba,
            "xgboost": xgb_proba,
        }

    def save(self, output_dir: Path, prefix: str = "tabular") -> None:
        output_dir.mkdir(parents=True, exist_ok=True)
        if self.rf_model:
            joblib.dump(self.rf_model, output_dir / f"{prefix}_rf.joblib")
        if self.xgb_model:
            joblib.dump(self.xgb_model, output_dir / f"{prefix}_xgb.joblib")

    def load(self, output_dir: Path, prefix: str = "tabular") -> None:
        rf_path = output_dir / f"{prefix}_rf.joblib"
        xgb_path = output_dir / f"{prefix}_xgb.joblib"
        if rf_path.exists():
            self.rf_model = joblib.load(rf_path)
        if xgb_path.exists():
            self.xgb_model = joblib.load(xgb_path)

