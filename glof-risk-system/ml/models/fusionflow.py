"""
fusionflow.py - FusionFlow Multimodal Meta-Learner.
Fuses RiskFlow optical hazard, TerraFlow velocity surges, TempFlow climate trajectories,
and physical lake area dynamics into a calibrated final GLOF hazard score.
"""

import logging
from typing import Dict, Optional, Tuple, Union
import numpy as np
import torch
import torch.nn as nn

logger = logging.getLogger(__name__)

# Alert Level thresholds
ALERT_NORMAL = "NORMAL"        # [0.00, 0.25)
ALERT_WATCH = "WATCH"          # [0.25, 0.50)
ALERT_WARNING = "WARNING"      # [0.50, 0.75)
ALERT_EMERGENCY = "EMERGENCY"  # [0.75, 1.00]


def get_alert_level(prob: float) -> str:
    """Map calibrated probability to decision alert level."""
    if prob >= 0.75:
        return ALERT_EMERGENCY
    elif prob >= 0.50:
        return ALERT_WARNING
    elif prob >= 0.25:
        return ALERT_WATCH
    return ALERT_NORMAL


class FusionFlowMetaLearner(nn.Module):
    """
    Multimodal calibrated meta-learner fusing optical, glaciological, meteorological,
    and lake geometry streams.
    """

    def __init__(self, in_features: int = 8, hidden_dim: int = 32):
        super().__init__()
        # Input features:
        # 0: riskflow_cnn_prob
        # 1: terraflow_surge_prob
        # 2: terraflow_q90_velocity
        # 3: tempflow_hazard_prob
        # 4: lake_area_km2
        # 5: lake_area_rate_7d
        # 6: precip_7d_sum
        # 7: temp_anomaly_7d
        self.net = nn.Sequential(
            nn.Linear(in_features, hidden_dim),
            nn.ReLU(),
            nn.BatchNorm1d(hidden_dim),
            nn.Dropout(0.2),
            nn.Linear(hidden_dim, 16),
            nn.ReLU(),
            nn.Linear(16, 1),
            nn.Sigmoid(),
        )

        # Baseline weighted calibration priors
        # [riskflow, terraflow_prob, terraflow_q90, tempflow, lake_area, lake_rate, precip, temp_anom]
        self.default_weights = np.array([0.22, 0.18, 0.12, 0.14, 0.16, 0.10, 0.05, 0.03], dtype=np.float32)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        x: (B, 8)
        Returns:
          calibrated_risk: (B, 1) in [0.0, 1.0]
        """
        return self.net(x)

    def predict_calibrated_risk(
        self,
        riskflow_prob: float,
        terraflow_prob: float,
        terraflow_q90: float,
        tempflow_prob: float,
        lake_area_km2: float,
        lake_area_rate_7d: float,
        precip_7d_sum: float,
        temp_anomaly_7d: float,
    ) -> Dict[str, Union[float, str, Dict[str, float]]]:
        """
        Inference helper computing calibrated GLOF probability, stream breakdown,
        and operational alert level.
        """
        # Normalize continuous features for safe bounded fusion
        norm_q90 = min(1.0, max(0.0, terraflow_q90 / 6.0))
        norm_lake = min(1.0, max(0.0, lake_area_km2 / 0.6))
        norm_lake_rate = min(1.0, max(0.0, (lake_area_rate_7d + 0.01) / 0.05))
        norm_precip = min(1.0, max(0.0, precip_7d_sum / 50.0))
        norm_temp_anom = min(1.0, max(0.0, (temp_anomaly_7d + 5.0) / 15.0))

        feat_vector = np.array([
            riskflow_prob,
            terraflow_prob,
            norm_q90,
            tempflow_prob,
            norm_lake,
            norm_lake_rate,
            norm_precip,
            norm_temp_anom,
        ], dtype=np.float32)

        # Baseline physical ensemble calculation
        ensemble_p = float(np.dot(feat_vector, self.default_weights))

        self.eval()
        with torch.no_grad():
            tensor_in = torch.from_numpy(feat_vector).unsqueeze(0)
            try:
                nn_p = float(self.forward(tensor_in).squeeze().item())
                pred_p = 0.4 * ensemble_p + 0.6 * nn_p
            except Exception:
                pred_p = ensemble_p

        pred_p = round(min(0.99, max(0.01, pred_p)), 4)
        alert_level = get_alert_level(pred_p)

        # Attribution breakdown for decision makers
        breakdown = {
            "optical_hazard": round(float(riskflow_prob), 3),
            "glacier_velocity_surge": round(float(terraflow_prob * 0.6 + norm_q90 * 0.4), 3),
            "lake_expansion_dynamics": round(float(norm_lake * 0.7 + norm_lake_rate * 0.3), 3),
            "climate_thermal_driver": round(float(tempflow_prob * 0.7 + norm_temp_anom * 0.3), 3),
            "precipitation_accumulation": round(float(norm_precip), 3),
        }

        return {
            "glof_probability": pred_p,
            "alert_level": alert_level,
            "stream_breakdown": breakdown,
        }


if __name__ == "__main__":
    fusion = FusionFlowMetaLearner()
    res = fusion.predict_calibrated_risk(
        riskflow_prob=0.88,
        terraflow_prob=0.82,
        terraflow_q90=5.4,
        tempflow_prob=0.75,
        lake_area_km2=0.48,
        lake_area_rate_7d=0.035,
        precip_7d_sum=22.0,
        temp_anomaly_7d=4.2,
    )
    print("FusionFlow Output:", res)
