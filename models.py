from sqlalchemy import Boolean, Column, Integer, String
from database import Base


class ClothingItem(Base):
    __tablename__ = "clothing_items"

    id = Column(Integer, primary_key=True, index=True)
    image_url = Column(String(255), nullable=True)
    item_type = Column(String(50), nullable=False, index=True)
    color = Column(String(30), nullable=False, index=True)
    is_available = Column(Boolean, nullable=False, default=True)
