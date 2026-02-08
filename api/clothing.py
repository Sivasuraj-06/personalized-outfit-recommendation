import os
import io
import cv2
import uuid
import shutil
import numpy as np
from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ultralytics import YOLO
from sklearn.cluster import KMeans
from matplotlib import colors as mcolors
import models
from database import SessionLocal

router = APIRouter()
UPLOAD_DIR = "static/uploads"


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class ClothingBase(BaseModel):
    id: Optional[int] = None
    item_type: str
    color: str
    is_available: bool = True
    image_url: Optional[str] = None

    class Config:
        from_attributes = True


item_type_model = YOLO("best.pt")
clothing_detector = YOLO("yolo11n.pt")


def extract_dominant_color(image: np.ndarray, clusters: int = 3) -> str:
    pixels = cv2.cvtColor(image, cv2.COLOR_BGR2RGB).reshape(-1, 3)
    pixels = pixels[np.mean(pixels, axis=1) > 20]
    if len(pixels) == 0:
        return "unknown"
    kmeans = KMeans(n_clusters=clusters, n_init=10, random_state=42)
    labels = kmeans.fit_predict(pixels)
    dominant_rgb = kmeans.cluster_centers_[np.bincount(labels).argmax()]
    closest_color = "unknown"
    min_distance = float("inf")
    for name, hex_value in mcolors.cnames.items():
        r, g, b = tuple(int(hex_value[i : i + 2], 16) for i in (1, 3, 5))
        distance = np.linalg.norm(dominant_rgb - np.array([r, g, b]))
        if distance < min_distance:
            min_distance = distance
            closest_color = name
    return closest_color


@router.post("/analyze-image")
async def analyze_clothing_image(image: UploadFile = File(...)):
    image_bytes = await image.read()
    image_array = np.frombuffer(image_bytes, np.uint8)
    image_np = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
    if image_np is None:
        raise HTTPException(status_code=400, detail="Invalid image file")
    item_result = item_type_model.predict(image_np, imgsz=224, conf=0.9)
    item_index = int(item_result[0].probs.top1)
    item_type = item_type_model.names[item_index]
    detection_result = clothing_detector.predict(image_np, imgsz=224, conf=0.25)
    boxes = detection_result[0].boxes
    if not boxes:
        raise HTTPException(status_code=404, detail="Clothing not detected")
    largest_box = max(
        boxes,
        key=lambda box: (box.xyxy[0][2] - box.xyxy[0][0])
        * (box.xyxy[0][3] - box.xyxy[0][1]),
    )
    x1, y1, x2, y2 = map(int, largest_box.xyxy[0])
    clothing_crop = image_np[y1:y2, x1:x2]
    color = extract_dominant_color(clothing_crop)
    success, encoded_image = cv2.imencode(".jpg", clothing_crop)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to encode image")
    return StreamingResponse(
        io.BytesIO(encoded_image.tobytes()),
        media_type="image/jpeg",
        headers={"Item-Type": item_type, "Color": color},
    )


@router.post("/")
def create_clothing_item(
    item_type: str = Form(...),
    color: str = Form(...),
    image: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    image_filename = None
    if image:
        ext = os.path.splitext(image.filename)[1]
        image_filename = f"{uuid.uuid4().hex}{ext}"
        file_path = os.path.join(UPLOAD_DIR, image_filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
    clothing_item = models.ClothingItem(
        item_type=item_type, color=color, is_available=True, image_url=image_filename
    )
    db.add(clothing_item)
    db.commit()
    db.refresh(clothing_item)
    return {"message": "Clothing item created"}


@router.get("/", response_model=List[ClothingBase])
def read_clothing_items(db: Session = Depends(get_db), skip: int = 0, limit: int = 100):
    items = db.query(models.ClothingItem).offset(skip).limit(limit).all()
    return [
        ClothingBase(
            id=item.id,
            item_type=item.item_type,
            color=item.color,
            is_available=item.is_available,
            image_url=f"/static/uploads/{item.image_url}" if item.image_url else None,
        )
        for item in items
    ]


@router.get("/{item_id}", response_model=ClothingBase)
def read_clothing_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(models.ClothingItem).filter_by(id=item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Clothing item not found")
    return ClothingBase(
        id=item.id,
        item_type=item.item_type,
        color=item.color,
        is_available=item.is_available,
        image_url=f"/static/uploads/{item.image_url}" if item.image_url else None,
    )


@router.put("/{item_id}")
def update_clothing_item(
    item_id: int,
    item_type: str = Form(...),
    color: str = Form(...),
    is_available: bool = Form(True),
    image: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    item = db.query(models.ClothingItem).filter_by(id=item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Clothing item not found")
    item.item_type = item_type
    item.color = color
    item.is_available = is_available
    if image:
        if item.image_url:
            old_file_path = os.path.join(UPLOAD_DIR, item.image_url)
            if os.path.exists(old_file_path):
                os.remove(old_file_path)
        ext = os.path.splitext(image.filename)[1]
        image_filename = f"{uuid.uuid4().hex}{ext}"
        file_path = os.path.join(UPLOAD_DIR, image_filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
        item.image_url = image_filename
    db.commit()
    db.refresh(item)
    return {"message": "Clothing item updated"}


@router.delete("/{item_id}")
def delete_clothing_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(models.ClothingItem).filter_by(id=item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Clothing item not found")
    if item.image_url:
        file_path = os.path.join(UPLOAD_DIR, item.image_url)
        if os.path.exists(file_path):
            os.remove(file_path)
    db.delete(item)
    db.commit()
    return {"message": "Clothing item deleted"}


@router.patch("/{item_id}/toggle-availability")
def toggle_clothing_availability(item_id: int, db: Session = Depends(get_db)):
    item = db.query(models.ClothingItem).filter_by(id=item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Clothing item not found")
    item.is_available = not item.is_available
    db.commit()
    db.refresh(item)
    return {"message": "Clothing availability updated"}
