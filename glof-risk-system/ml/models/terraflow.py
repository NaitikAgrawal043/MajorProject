"""
terraflow.py - TerraFlow Transformer Encoder for Glacier Velocity Forecasting with Quantile Loss.
Architecture:
  - Input: 30-day lookback sequences of glacier surface velocities & dynamics
  - Positional Encoding
  - 4-layer Transformer Encoder (8 attention heads, d_model=256, dim_feedforward=512)
  - Multi-Quantile Head predicting q=0.1, q=0.5, q=0.9 velocity forecast intervals
"""

import math
import logging
from typing import List, Tuple
import torch
import torch.nn as nn
import torch.nn.functional as F

logger = logging.getLogger(__name__)


class SinusoidalPositionalEncoding(nn.Module):
    """Sinusoidal positional encoding for temporal sequence modeling."""

    def __init__(self, d_model: int, max_len: int = 100):
        super().__init__()
        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
        div_term = torch.exp(torch.arange(0, d_model, 2).float() * (-math.log(10000.0) / d_model))
        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        self.register_buffer("pe", pe.unsqueeze(0))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x is (B, T, D)
        return x + self.pe[:, : x.size(1)]


class TerraFlowTransformer(nn.Module):
    """
    4-layer PyTorch Transformer Encoder for glacier surface velocity surge modeling.
    Outputs calibrated Quantile forecasts (q0.1, q0.5, q0.9).
    """

    def __init__(
        self,
        in_features: int = 4,  # [velocity_m_day, velocity_7d_mean, velocity_accel_7d, doy_sin]
        d_model: int = 256,
        nhead: int = 8,
        num_layers: int = 4,
        dim_feedforward: int = 512,
        dropout: float = 0.1,
        quantiles: Tuple[float, ...] = (0.1, 0.5, 0.9),
    ):
        super().__init__()
        self.quantiles = quantiles
        self.d_model = d_model

        self.input_proj = nn.Linear(in_features, d_model)
        self.pos_encoder = SinusoidalPositionalEncoding(d_model=d_model, max_len=120)

        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_model,
            nhead=nhead,
            dim_feedforward=dim_feedforward,
            dropout=dropout,
            batch_first=True,
            activation="gelu",
        )
        self.transformer_encoder = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)

        # Quantile prediction head: outputs [q0.1, q0.5, q0.9]
        self.quantile_head = nn.Sequential(
            nn.Linear(d_model, 128),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(128, len(quantiles)),
        )

        # Surge hazard classification head (predicting if surge is imminent)
        self.surge_classifier = nn.Sequential(
            nn.Linear(d_model, 64),
            nn.ReLU(),
            nn.Linear(64, 1),
            nn.Sigmoid(),
        )

    def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Args:
          x: (B, seq_len=30, in_features)
        Returns:
          quantiles: (B, 3) representing [q0.1, q0.5, q0.9] velocity forecast
          surge_prob: (B, 1) probability of surge acceleration
        """
        proj = self.input_proj(x) * math.sqrt(self.d_model)
        encoded = self.pos_encoder(proj)
        out = self.transformer_encoder(encoded)

        # Use last time step representation or pooled
        last_step = out[:, -1, :]  # (B, d_model)
        quantiles = self.quantile_head(last_step)
        surge_prob = self.surge_classifier(last_step)
        return quantiles, surge_prob

    def get_latent(self, x: torch.Tensor) -> torch.Tensor:
        """Extract sequence context embedding (B, d_model)."""
        proj = self.input_proj(x) * math.sqrt(self.d_model)
        encoded = self.pos_encoder(proj)
        out = self.transformer_encoder(encoded)
        return out[:, -1, :]


class QuantileLoss(nn.Module):
    """
    Multi-Quantile Pinball Loss:
    L_q(y, y_hat) = max(q * (y - y_hat), (1 - q) * (y_hat - y))
    """

    def __init__(self, quantiles: Tuple[float, ...] = (0.1, 0.5, 0.9)):
        super().__init__()
        self.quantiles = quantiles

    def forward(self, preds: torch.Tensor, target: torch.Tensor) -> torch.Tensor:
        """
        preds: (B, num_quantiles)
        target: (B, 1) or (B,)
        """
        if target.ndim == 1:
            target = target.unsqueeze(1)

        total_loss = torch.tensor(0.0, device=preds.device)
        for i, q in enumerate(self.quantiles):
            error = target - preds[:, i : i + 1]
            loss_q = torch.max((q - 1.0) * error, q * error)
            total_loss += torch.mean(loss_q)
        return total_loss / len(self.quantiles)


if __name__ == "__main__":
    model = TerraFlowTransformer()
    dummy_x = torch.randn(8, 30, 4)
    q_preds, surge_p = model(dummy_x)
    print(f"Quantiles shape: {q_preds.shape}, sample: {q_preds[0].tolist()}")
    print(f"Surge prob: {surge_p.shape}")
    loss_fn = QuantileLoss()
    dummy_y = torch.tensor([[1.5]] * 8)
    loss = loss_fn(q_preds, dummy_y)
    print(f"Quantile Loss: {loss.item():.4f}")

