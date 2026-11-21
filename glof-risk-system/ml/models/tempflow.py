"""
tempflow.py - TempFlow 2-Layer LSTM for Climate & Hydrometeorological Trajectory Modeling.
Architecture:
  - 2-layer LSTM (Layer 1: 100 units, Layer 2: 50 units, dropout: 0.2)
  - 30-day temporal lookback over temperature extremes, precipitation pulses, and snowmelt proxies
  - Dual head: thermal risk logit (Sigmoid) and temperature forecast
"""

import logging
from typing import Tuple
import torch
import torch.nn as nn

logger = logging.getLogger(__name__)


class TempFlowLSTM(nn.Module):
    """
    2-Layer Recurrent Neural Network for meteorological precursor sequence modeling.
    """

    def __init__(
        self,
        in_features: int = 5,  # [temp_max_c, temp_min_c, precipitation_mm, snowmelt_proxy_7d, temp_anomaly_7d]
        hidden_dim1: int = 100,
        hidden_dim2: int = 50,
        dropout: float = 0.2,
    ):
        super().__init__()
        self.lstm1 = nn.LSTM(
            input_size=in_features,
            hidden_size=hidden_dim1,
            num_layers=1,
            batch_first=True,
        )
        self.dropout = nn.Dropout(p=dropout)
        self.lstm2 = nn.LSTM(
            input_size=hidden_dim1,
            hidden_size=hidden_dim2,
            num_layers=1,
            batch_first=True,
        )

        # Thermal precursor hazard head
        self.hazard_head = nn.Sequential(
            nn.Linear(hidden_dim2, 32),
            nn.ReLU(),
            nn.Dropout(p=dropout),
            nn.Linear(32, 1),
            nn.Sigmoid(),
        )

        # 7-day temperature anomaly forecast regression head
        self.forecast_head = nn.Sequential(
            nn.Linear(hidden_dim2, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
        )

    def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Args:
          x: (B, seq_len=30, in_features)
        Returns:
          hazard_prob: (B, 1) probability of climate-triggered outburst precursor
          temp_forecast: (B, 1) forecasted temperature anomaly
        """
        out, _ = self.lstm1(x)
        out = self.dropout(out)
        out, (h_n, _) = self.lstm2(out)

        # Use last hidden state from LSTM2
        last_hidden = h_n[-1]  # (B, hidden_dim2)

        hazard_prob = self.hazard_head(last_hidden)
        temp_forecast = self.forecast_head(last_hidden)

        return hazard_prob, temp_forecast

    def get_features(self, x: torch.Tensor) -> torch.Tensor:
        """Extract hidden representation (B, hidden_dim2)."""
        out, _ = self.lstm1(x)
        out = self.dropout(out)
        _, (h_n, _) = self.lstm2(out)
        return h_n[-1]


if __name__ == "__main__":
    model = TempFlowLSTM()
    dummy_x = torch.randn(8, 30, 5)
    p, f = model(dummy_x)
    print(f"TempFlow hazard prob: {p.shape}, forecast: {f.shape}")

