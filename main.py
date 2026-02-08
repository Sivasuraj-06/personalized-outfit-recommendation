import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from database import engine
import models
from api.clothing import router as clothing_router

app = FastAPI()

models.Base.metadata.create_all(bind=engine)

UPLOAD_DIR = "static/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
def read_root():
    return {"message": "Alive"}


app.include_router(clothing_router, prefix="/clothing-items", tags=["Clothing"])
