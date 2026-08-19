from fastapi import FastAPI

app = FastAPI(
    title="MIXORA API",
    description="Local-first AI Customer Operations Platform",
    version="0.1.0",
)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "mixora-api",
        "version": "0.1.0",
    }