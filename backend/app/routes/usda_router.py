"""
USDA FoodData Central API Integration
Provides nutritional data for meal planning
"""
from fastapi import APIRouter, HTTPException, Query
import os
import httpx
from typing import Optional

router = APIRouter(prefix="/usda", tags=["USDA Food Data"])

# USDA FoodData Central API
# Free API - no key required for basic searches
# Docs: https://fdc.nal.usda.gov/api-guide.html
USDA_API_KEY = os.getenv("USDA_API_KEY", "DEMO_KEY")  # Get free key at https://fdc.nal.usda.gov/api-key-signup.html
USDA_BASE_URL = "https://api.nal.usda.gov/fdc/v1"


@router.get("/search")
async def search_foods(
    q: str = Query(..., description="Search query (e.g., 'chicken breast', 'brown rice')"),
    page_size: int = Query(20, ge=1, le=200),
    page_number: int = Query(1, ge=1)
):
    """
    Search USDA FoodData Central for nutritional information.
    Returns foods with calories, protein, carbs, fat, fiber, etc.
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            params = {
                "query": q,
                "dataType": ["Survey (FNDDS)", "Foundation", "Branded"],  # Most relevant datasets
                "pageSize": page_size,
                "pageNumber": page_number,
                "api_key": USDA_API_KEY
            }
            resp = await client.get(f"{USDA_BASE_URL}/foods/search", params=params)
            resp.raise_for_status()
            data = resp.json()
            
            # Parse and simplify response
            foods = []
            for food in data.get("foods", []):
                nutrients = {}
                for nutrient in food.get("foodNutrients", []):
                    name = nutrient.get("nutrientName", "").lower()
                    value = nutrient.get("value", 0)
                    
                    if "energy" in name or "calori" in name:
                        nutrients["calories"] = value
                    elif "protein" in name:
                        nutrients["protein"] = value
                    elif "carbohydrate" in name:
                        nutrients["carbs"] = value
                    elif "total lipid" in name or ("fat" in name and "fatty" not in name):
                        nutrients["fat"] = value
                    elif "fiber" in name:
                        nutrients["fiber"] = value
                    elif "sodium" in name:
                        nutrients["sodium"] = value
                
                foods.append({
                    "fdcId": food.get("fdcId"),
                    "description": food.get("description"),
                    "brandOwner": food.get("brandOwner"),
                    "servingSize": food.get("servingSize"),
                    "servingSizeUnit": food.get("servingSizeUnit", "g"),
                    "calories": nutrients.get("calories", 0),
                    "protein": nutrients.get("protein", 0),
                    "carbs": nutrients.get("carbs", 0),
                    "fat": nutrients.get("fat", 0),
                    "fiber": nutrients.get("fiber", 0),
                    "sodium": nutrients.get("sodium", 0),
                })
            
            return {
                "query": q,
                "totalHits": data.get("totalHits", 0),
                "currentPage": page_number,
                "totalPages": data.get("totalPages", 0),
                "foods": foods
            }
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"USDA API error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@router.get("/food/{fdc_id}")
async def get_food_details(fdc_id: int):
    """Get detailed nutritional information for a specific food item by FDC ID"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{USDA_BASE_URL}/food/{fdc_id}",
                params={"api_key": USDA_API_KEY}
            )
            resp.raise_for_status()
            food = resp.json()
            
            # Parse nutrients
            nutrients = {}
            for nutrient in food.get("foodNutrients", []):
                name = nutrient.get("nutrient", {}).get("name", "").lower()
                value = nutrient.get("amount", 0)
                
                if "energy" in name:
                    nutrients["calories"] = value
                elif "protein" in name:
                    nutrients["protein"] = value
                elif "carbohydrate" in name:
                    nutrients["carbs"] = value
                elif "total lipid" in name:
                    nutrients["fat"] = value
                elif "fiber" in name:
                    nutrients["fiber"] = value
                elif "sodium" in name:
                    nutrients["sodium"] = value
            
            return {
                "fdcId": food.get("fdcId"),
                "description": food.get("description"),
                "brandOwner": food.get("brandOwner"),
                "ingredients": food.get("ingredients"),
                "servingSize": food.get("servingSize"),
                "servingSizeUnit": food.get("servingSizeUnit"),
                **nutrients
            }
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"USDA API error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get food details: {str(e)}")
