"""
riskflow_cnn.py - RiskFlow 6-Band PyTorch CNN for Optical GLOF Hazard Detection.
Input shape: (B, 6, 128, 128) representing [B02, B03, B04, B08, B11, B12].
Architecture:
  - 3 Conv2D + ReLU + MaxPool blocks (32, 64, 128 filters)
  - Global / Adaptive Pooling -> Linear(128) -> Dropout(0.5) -> Linear(1) -> Sigmoid
"""

import logging
from typing import Optional, Tuple
import torch
import torch.nn as nn
import torch.nn.functional as F

logger = logging.getLogger(__name__)


class RiskFlowCNN(nn.Module):
    """
    6-band Sentinel-2 Optical Convolutional Neural Network for GLOF Hazard Prediction.
    """

    def __init__(self, in_channels: int = 6, hidden_dim: int = 128, dropout_rate: float = 0.5):
        super().__init__()
        # Block 1: (B, 6, 128, 128) -> (B, 32, 64, 64)
        self.block1 = nn.Sequential(
            nn.Conv2d(in_channels, 32, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=2, stride=2),
        )

        # Block 2: (B, 32, 64, 64) -> (B, 64, 32, 32)
        self.block2 = nn.Sequential(
            nn.Conv2d(32, 64, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=2, stride=2),
        )

        # Block 3: (B, 64, 32, 32) -> (B, 128, 16, 16)
        self.block3 = nn.Sequential(
            nn.Conv2d(64, 128, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(128),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=2, stride=2),
        )

        # Adaptive pooling & Classifier
        self.adaptive_pool = nn.AdaptiveAvgPool2d((4, 4))
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Linear(128 * 4 * 4, hidden_dim),
            nn.ReLU(inplace=True),
            nn.Dropout(p=dropout_rate),
            nn.Linear(hidden_dim, 1),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Forward pass.
        Args:
          x: Tensor of shape (B, 6, 128, 128)
        Returns:
          Probability tensor of shape (B, 1) in [0.0, 1.0]
        """
        feat = self.block1(x)
        feat = self.block2(feat)
        feat = self.block3(feat)
        pooled = self.adaptive_pool(feat)
        logits = self.classifier(pooled)
        return torch.sigmoid(logits)

    def get_features(self, x: torch.Tensor) -> torch.Tensor:
        """Extract intermediate 128-d latent representation for multimodal fusion."""
        feat = self.block1(x)
        feat = self.block2(feat)
        feat = self.block3(feat)
        pooled = self.adaptive_pool(feat)
        flat = torch.flatten(pooled, 1)
        # Pass through first linear layer
        h = self.classifier[1](flat)
        h = self.classifier[2](h)
        return h


class FocalLoss(nn.Module):
    """
    Binary Focal Loss for severe class imbalance.
    FL(p_t) = -alpha_t * (1 - p_t)^gamma * log(p_t)
    """

    def __init__(self, alpha: float = 0.85, gamma: float = 2.0):
        super().__init__()
        self.alpha = alpha
        self.gamma = gamma

    def forward(self, pred_probs: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        eps = 1e-7
        p = torch.clamp(pred_probs, eps, 1.0 - eps)
        pt = p * targets + (1.0 - p) * (1.0 - targets)
        w = self.alpha * targets + (1.0 - self.alpha) * (1.0 - targets)
        focal_weight = w * ((1.0 - pt) ** self.gamma)
        loss = -focal_weight * torch.log(pt)
        return torch.mean(loss)


def augment_batch(images: torch.Tensor) -> torch.Tensor:
    """
    Random spatial augmentations applied ONLY on training fold:
      - Random horizontal flips
      - Random vertical flips
      - Random 90 degree rotations
    """
    # Random horizontal flip
    if torch.rand(1).item() > 0.5:
        images = torch.flip(images, dims=[-1])
    # Random vertical flip
    if torch.rand(1).item() > 0.5:
        images = torch.flip(images, dims=[-2])
    # Random rotation by 90, 180, or 270 deg
    k = torch.randint(0, 4, (1,)).item()
    if k > 0:
        images = torch.rot90(images, k, dims=[-2, -1])
    return images


if __name__ == "__main__":
    model = RiskFlowCNN()
    dummy_input = torch.randn(4, 6, 128, 128)
    out = model(dummy_input)
    print(f"RiskFlow output shape: {out.shape}, values: {out.squeeze().tolist()}")
    latents = model.get_features(dummy_input)
    print(f"Latents shape: {latents.shape}")

