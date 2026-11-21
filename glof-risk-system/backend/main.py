"""
FastAPI Backend Application for Multimodal GLOF Prediction & Downstream Risk Assessment.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routes import router

app = FastAPI(
    title="GLOF Risk & Downstream Inundation Intelligence System",
    description="Operational decision-support API for Shisper Glacier & Hunza Valley GLOF early warning.",
    version="1.0.0",
)

# Enable CORS for frontend Next.js application
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")


@app.get("/")
def root():
    return {
        "system": "GLOF Risk Early Warning & Inundation System",
        "study_area": "Shisper Glacier & Hunza Valley, Karakoram",
        "docs_url": "/docs",
        "version": "1.0.0",
    }

