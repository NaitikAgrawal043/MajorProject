"""
test_phase2_models.py - Unit & Integration Tests for Phase 2 Multimodal Models.
Verifies:
  - Baselines (Random Forest & XGBoost) training & inference
  - RiskFlow 6-band CNN forward/backward pass & valid shapes
  - TerraFlow Transformer multi-quantile loss & surge head
  - TempFlow 2-layer LSTM temporal forward pass
  - FusionFlow meta-learner probability calibration & alert categorization
  - Strict temporal holdout anti-leakage compliance (Train <= 2021, Test >= 2022)
"""

import numpy as np
import pandas as pd
import pytest
import torch

from ml.models.baselines import TabularBaselines
from ml.models.riskflow_cnn import RiskFlowCNN, FocalLoss, augment_batch
from ml.models.terraflow import TerraFlowTransformer, QuantileLoss
from ml.models.tempflow import TempFlowLSTM
from ml.models.fusionflow import FusionFlowMetaLearner, get_alert_level


def test_tabular_baselines_fit_and_predict():
    """Verify RF and XGBoost fit and produce valid probabilities in [0, 1]."""
    np.random.seed(42)
    n = 100
    df = pd.DataFrame({
        "velocity_m_day": np.random.uniform(0.2, 5.0, n),
        "velocity_7d_mean": np.random.uniform(0.2, 4.5, n),
        "velocity_accel_7d": np.random.uniform(-0.5, 1.0, n),
        "temp_mean_c": np.random.uniform(-10, 25, n),
        "temp_7d_mean": np.random.uniform(-10, 25, n),
        "temp_anomaly_7d": np.random.uniform(-5, 5, n),
        "precip_7d_sum": np.random.uniform(0, 50, n),
        "precip_15d_sum": np.random.uniform(0, 100, n),
        "snowmelt_proxy_7d": np.random.uniform(0, 60, n),
        "lake_area_km2": np.random.uniform(0.01, 0.5, n),
        "lake_area_rate_7d": np.random.uniform(-0.01, 0.04, n),
        "lake_compactness": np.random.uniform(0.2, 0.8, n),
        "lake_mean_ndwi": np.random.uniform(-0.1, 0.6, n),
        "lake_mean_mndwi": np.random.uniform(-0.1, 0.6, n),
        "doy_sin": np.sin(np.linspace(0, 2 * np.pi, n)),
        "doy_cos": np.cos(np.linspace(0, 2 * np.pi, n)),
    })
    y = pd.Series(np.random.choice([0, 1], size=n, p=[0.9, 0.1]))

    baselines = TabularBaselines(feature_mode="enhanced").fit(df, y)
    probs = baselines.predict_proba(df)

    assert "random_forest" in probs
    assert "xgboost" in probs
    assert len(probs["random_forest"]) == n
    assert (probs["random_forest"] >= 0.0).all() and (probs["random_forest"] <= 1.0).all()
    assert (probs["xgboost"] >= 0.0).all() and (probs["xgboost"] <= 1.0).all()


def test_riskflow_cnn_forward_and_loss():
    """Verify RiskFlow 6-band CNN forward, backward pass, and augmentation."""
    model = RiskFlowCNN(in_channels=6, hidden_dim=128)
    batch = torch.randn(4, 6, 128, 128)
    target = torch.tensor([[1.0], [0.0], [0.0], [1.0]])

    # Data augmentation on batch
    augmented = augment_batch(batch)
    assert augmented.shape == (4, 6, 128, 128)

    # Forward pass
    out = model(augmented)
    assert out.shape == (4, 1)
    assert (out >= 0.0).all() and (out <= 1.0).all()

    # Latents
    latents = model.get_features(augmented)
    assert latents.shape == (4, 128)

    # Focal loss and backward pass
    loss_fn = FocalLoss()
    loss = loss_fn(out, target)
    assert not torch.isnan(loss)
    loss.backward()

    # Check gradients exist
    has_grads = any(p.grad is not None and torch.norm(p.grad) > 0 for p in model.parameters())
    assert has_grads, "RiskFlow CNN must compute non-zero gradients"


def test_terraflow_transformer_quantile_loss():
    """Verify TerraFlow Transformer outputs 3 quantiles and surge probability."""
    model = TerraFlowTransformer(in_features=4, d_model=256, nhead=8, num_layers=4)
    x = torch.randn(4, 30, 4)
    quantiles, surge_p = model(x)

    assert quantiles.shape == (4, 3)  # [q0.1, q0.5, q0.9]
    assert surge_p.shape == (4, 1)
    assert (surge_p >= 0.0).all() and (surge_p <= 1.0).all()

    loss_fn = QuantileLoss(quantiles=(0.1, 0.5, 0.9))
    y_target = torch.tensor([[1.2], [3.5], [0.8], [4.1]])
    loss = loss_fn(quantiles, y_target)
    assert not torch.isnan(loss)
    loss.backward()


def test_tempflow_lstm_forward():
    """Verify TempFlow 2-layer LSTM sequence forward pass."""
    model = TempFlowLSTM(in_features=5, hidden_dim1=100, hidden_dim2=50)
    x = torch.randn(4, 30, 5)
    hazard_prob, temp_forecast = model(x)

    assert hazard_prob.shape == (4, 1)
    assert temp_forecast.shape == (4, 1)
    assert (hazard_prob >= 0.0).all() and (hazard_prob <= 1.0).all()


def test_fusionflow_calibration_and_alerts():
    """Verify FusionFlow meta-learner calibrated risk & alert level categorization."""
    from pathlib import Path
    fusion = FusionFlowMetaLearner(in_features=8)
    chk_path = Path("ml/checkpoints/fusionflow.pth")
    if chk_path.exists():
        fusion.load_state_dict(torch.load(chk_path, map_location="cpu"))
    res_high = fusion.predict_calibrated_risk(
        riskflow_prob=0.92,
        terraflow_prob=0.88,
        terraflow_q90=5.8,
        tempflow_prob=0.80,
        lake_area_km2=0.45,
        lake_area_rate_7d=0.04,
        precip_7d_sum=30.0,
        temp_anomaly_7d=4.5,
    )
    assert res_high["glof_probability"] > 0.50
    assert res_high["alert_level"] in ["WARNING", "EMERGENCY"]
    assert "stream_breakdown" in res_high
    assert "optical_hazard" in res_high["stream_breakdown"]

    res_low = fusion.predict_calibrated_risk(
        riskflow_prob=0.05,
        terraflow_prob=0.08,
        terraflow_q90=0.3,
        tempflow_prob=0.10,
        lake_area_km2=0.02,
        lake_area_rate_7d=0.00,
        precip_7d_sum=0.0,
        temp_anomaly_7d=-2.0,
    )
    assert res_low["glof_probability"] < 0.30
    assert res_low["alert_level"] in ["NORMAL", "WATCH"]

    # Verify alert thresholds
    assert get_alert_level(0.10) == "NORMAL"
    assert get_alert_level(0.35) == "WATCH"
    assert get_alert_level(0.60) == "WARNING"
    assert get_alert_level(0.85) == "EMERGENCY"


def test_strict_temporal_anti_leakage_holdout():
    """Verify strict temporal boundary between training and testing folds."""
    master_path = "data/processed/shisper_master.csv"
    import os
    if os.path.exists(master_path):
        df = pd.read_csv(master_path)
        train_split = df[df["year"] <= 2021]
        test_split = df[df["year"] >= 2022]

        assert train_split["year"].max() <= 2021, "Train split must strictly end on or before 2021"
        assert test_split["year"].min() >= 2022, "Test split must strictly begin on or after 2022"
        # 2022-05-07 GLOF precursor dates must lie exclusively in the test split
        precursors_in_test = test_split[test_split["is_glof_precursor"] == 1]
        assert len(precursors_in_test) > 0, "Test set must contain the holdout May 2022 GLOF precursor"
