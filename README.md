# AI-Based Multimodal GLOF Prediction & Downstream Risk Assessment System
*Extending the IceWatch & GLOFNet Architecture for Glacier Hazards & Hydrodynamic Inundation Modeling*

See [glof-risk-system/README.md](file:///c:/Users/agraw/Desktop/major/glof-risk-system/README.md) for the complete documentation.

### Quick Start
```bash
cd glof-risk-system

# Run tests
pytest tests/ -v

# Run FastAPI backend
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000

# Run Next.js dashboard
cd frontend && npm run dev
```
- Dashboard: http://localhost:3000
- API Docs: http://127.0.0.1:8000/docs

