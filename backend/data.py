from datetime import date, timedelta


def generate_dummy_outfits():
    today = date.today()
    return [
        {
            "date": today + timedelta(days=i),
            "top": {
                "id": 1 + i * 2,
                "item_type": "Shirt",
                "color": "blue",
                "image_url": None,
                "is_available": True,
            },
            "bottom": {
                "id": 2 + i * 2,
                "item_type": "Jeans",
                "color": "black",
                "image_url": None,
                "is_available": True,
            },
        }
        for i in range(7)
    ]
