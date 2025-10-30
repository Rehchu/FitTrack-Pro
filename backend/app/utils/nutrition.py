import os
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

# API Keys - configured with provided credentials
USDA_API_KEY = os.getenv('USDA_API_KEY', 'uH2TDQWthtdFvLn6Bz4wXe2VLBBGwA3SbeHPnGkJ')
SPOONACULAR_API_KEY = os.getenv('SPOONACULAR_API_KEY', 'd45f82e420254470801f93432e28fb7d')

try:
    import requests
except Exception:
    requests = None


def search_food(query: str) -> List[Dict[str, Any]]:
    """Search for foods using multiple APIs: TheMealDB, USDA, and Spoonacular.
    Returns a combined list of food items with nutrition data.
    """
    results = []
    
    # Search TheMealDB
    results.extend(_search_themealdb(query))
    
    # Search USDA FoodData Central
    results.extend(_search_usda(query))
    
    # Search Spoonacular
    results.extend(_search_spoonacular(query))
    
    return results


def _search_themealdb(query: str) -> List[Dict[str, Any]]:
    """Search TheMealDB for recipes and meals."""
    if requests is None:
        return []
    
    try:
        url = f'https://www.themealdb.com/api/json/v1/1/search.php'
        params = {'s': query}
        resp = requests.get(url, params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        
        results = []
        if data.get('meals'):
            for meal in data['meals'][:5]:  # Limit to 5 results
                results.append({
                    'name': meal.get('strMeal', 'Unknown'),
                    'source': 'TheMealDB',
                    'category': meal.get('strCategory', ''),
                    'area': meal.get('strArea', ''),
                    'instructions': meal.get('strInstructions', ''),
                    'thumbnail': meal.get('strMealThumb', ''),
                    'id': meal.get('idMeal', ''),
                })
        return results
    except Exception as e:
        logger.exception('TheMealDB search failed: %s', e)
        return []


def _search_usda(query: str) -> List[Dict[str, Any]]:
    """Search USDA FoodData Central for food nutrition data."""
    if requests is None or not USDA_API_KEY:
        return []
    
    try:
        url = 'https://api.nal.usda.gov/fdc/v1/foods/search'
        params = {
            'api_key': USDA_API_KEY,
            'query': query,
            'pageSize': 5
        }
        resp = requests.get(url, params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        
        results = []
        if data.get('foods'):
            for food in data['foods']:
                # Extract key nutrients
                nutrients = {}
                for nutrient in food.get('foodNutrients', []):
                    name = nutrient.get('nutrientName', '').lower()
                    value = nutrient.get('value', 0)
                    
                    if 'energy' in name or 'calorie' in name:
                        nutrients['calories'] = value
                    elif 'protein' in name:
                        nutrients['protein'] = value
                    elif 'carbohydrate' in name:
                        nutrients['carbs'] = value
                    elif 'total lipid' in name or 'fat' in name:
                        nutrients['fat'] = value
                    elif 'fiber' in name:
                        nutrients['fiber'] = value
                    elif 'sodium' in name:
                        nutrients['sodium'] = value
                
                results.append({
                    'name': food.get('description', 'Unknown'),
                    'source': 'USDA',
                    'fdcId': food.get('fdcId', ''),
                    'dataType': food.get('dataType', ''),
                    'nutrients': nutrients,
                    'servingSize': food.get('servingSize', 100),
                    'servingUnit': food.get('servingSizeUnit', 'g'),
                })
        return results
    except Exception as e:
        logger.exception('USDA search failed: %s', e)
        return []


def _search_spoonacular(query: str) -> List[Dict[str, Any]]:
    """Search Spoonacular for ingredient information."""
    if requests is None or not SPOONACULAR_API_KEY:
        return []
    
    try:
        url = 'https://api.spoonacular.com/food/ingredients/search'
        params = {
            'apiKey': SPOONACULAR_API_KEY,
            'query': query,
            'number': 5,
            'metaInformation': True
        }
        resp = requests.get(url, params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        
        results = []
        if data.get('results'):
            for ingredient in data['results']:
                results.append({
                    'name': ingredient.get('name', 'Unknown'),
                    'source': 'Spoonacular',
                    'id': ingredient.get('id', ''),
                    'image': f"https://spoonacular.com/cdn/ingredients_100x100/{ingredient.get('image', '')}",
                })
        return results
    except Exception as e:
        logger.exception('Spoonacular search failed: %s', e)
        return []


def get_nutrition_details(food_name: str, source: str = 'usda', food_id: str = None) -> Optional[Dict[str, Any]]:
    """Get detailed nutrition information for a specific food item.
    Uses natural language processing to extract nutrients.
    """
    if requests is None:
        return None
    
    # Try to get detailed nutrition from USDA if we have an ID
    if source == 'usda' and food_id and USDA_API_KEY:
        try:
            url = f'https://api.nal.usda.gov/fdc/v1/food/{food_id}'
            params = {'api_key': USDA_API_KEY}
            resp = requests.get(url, params=params, timeout=10)
            resp.raise_for_status()
            data = resp.json()
            
            nutrients = {
                'calories': 0,
                'protein': 0,
                'carbs': 0,
                'fat': 0,
                'fiber': 0,
                'sodium': 0
            }
            
            for nutrient in data.get('foodNutrients', []):
                name = nutrient.get('nutrient', {}).get('name', '').lower()
                value = nutrient.get('amount', 0)
                
                if 'energy' in name:
                    nutrients['calories'] = value
                elif 'protein' in name:
                    nutrients['protein'] = value
                elif 'carbohydrate' in name:
                    nutrients['carbs'] = value
                elif 'total lipid' in name or ('fat' in name and 'fatty' not in name):
                    nutrients['fat'] = value
                elif 'fiber' in name:
                    nutrients['fiber'] = value
                elif 'sodium' in name:
                    nutrients['sodium'] = value
            
            return {
                'name': data.get('description', food_name),
                'nutrients': nutrients,
                'serving_size': 100,
                'serving_unit': 'g'
            }
        except Exception as e:
            logger.exception('USDA detail lookup failed: %s', e)
    
    # Try Spoonacular ingredient information
    if source == 'spoonacular' and food_id and SPOONACULAR_API_KEY:
        try:
            url = f'https://api.spoonacular.com/food/ingredients/{food_id}/information'
            params = {
                'apiKey': SPOONACULAR_API_KEY,
                'amount': 100,
                'unit': 'grams'
            }
            resp = requests.get(url, params=params, timeout=10)
            resp.raise_for_status()
            data = resp.json()
            
            nutrients_list = data.get('nutrition', {}).get('nutrients', [])
            nutrients = {
                'calories': 0,
                'protein': 0,
                'carbs': 0,
                'fat': 0,
                'fiber': 0,
                'sodium': 0
            }
            
            for nutrient in nutrients_list:
                name = nutrient.get('name', '').lower()
                value = nutrient.get('amount', 0)
                
                if 'calories' in name:
                    nutrients['calories'] = value
                elif 'protein' in name:
                    nutrients['protein'] = value
                elif 'carbohydrates' in name:
                    nutrients['carbs'] = value
                elif name == 'fat':
                    nutrients['fat'] = value
                elif 'fiber' in name:
                    nutrients['fiber'] = value
                elif 'sodium' in name:
                    nutrients['sodium'] = value
            
            return {
                'name': data.get('name', food_name),
                'nutrients': nutrients,
                'serving_size': 100,
                'serving_unit': 'g'
            }
        except Exception as e:
            logger.exception('Spoonacular detail lookup failed: %s', e)
    
    return None
