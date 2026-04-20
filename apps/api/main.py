from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes.agent import router as agent_router
from api.routes.disease import router as disease_router
from api.routes.intake import router as intake_router
from api.routes.score import router as score_router

app = FastAPI(title="Lumina API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://*.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(intake_router)
app.include_router(score_router)
app.include_router(agent_router)
app.include_router(disease_router)


@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}
