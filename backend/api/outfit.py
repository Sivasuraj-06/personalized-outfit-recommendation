from datetime import date, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
import models
from database import SessionLocal
from api.auth import get_current_user
from data import generate_dummy_outfits

router = APIRouter(dependencies=[Depends(get_current_user)])


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class ClothingMini(BaseModel):
    id: int
    item_type: str
    color: str
    image_url: str | None
    is_available: bool

    class Config:
        from_attributes = True


class OutfitCreate(BaseModel):
    date: date
    top_id: int
    bottom_id: int


class OutfitBase(BaseModel):
    date: date
    top: ClothingMini
    bottom: ClothingMini

    class Config:
        from_attributes = True


@router.post("/")
def save_outfits(
    outfits: List[OutfitCreate],
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    clothing_ids = set()
    for outfit in outfits:
        clothing_ids.add(outfit.top_id)
        clothing_ids.add(outfit.bottom_id)
    valid_items = (
        db.query(models.ClothingItem)
        .filter(
            models.ClothingItem.id.in_(clothing_ids),
            models.ClothingItem.user_id == current_user.id,
        )
        .all()
    )
    valid_ids = {item.id for item in valid_items}
    if clothing_ids != valid_ids:
        raise HTTPException(status_code=400, detail="Invalid clothing data(s)")
    for outfit_data in outfits:
        existing = (
            db.query(models.Outfit)
            .filter_by(date=outfit_data.date, user_id=current_user.id)
            .first()
        )
        if existing:
            existing.top_id = outfit_data.top_id
            existing.bottom_id = outfit_data.bottom_id
        else:
            new_outfit = models.Outfit(
                date=outfit_data.date,
                top_id=outfit_data.top_id,
                bottom_id=outfit_data.bottom_id,
                user_id=current_user.id,
            )
            db.add(new_outfit)
    db.commit()
    return {"message": "Outfits saved"}


@router.get("/week", response_model=List[OutfitBase])
def get_week_outfits(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    today = date.today()
    end_date = today + timedelta(days=6)
    outfits = (
        db.query(models.Outfit)
        .filter(
            models.Outfit.user_id == current_user.id,
            models.Outfit.date >= today,
            models.Outfit.date <= end_date,
        )
        .order_by(models.Outfit.date)
        .all()
    )
    return outfits


@router.get("/generate", response_model=List[OutfitBase])
def generate_outfits(
    city: Optional[str] = None,
    current_user: models.User = Depends(get_current_user),
):
    return generate_dummy_outfits()
