"""
ExerciseDB API Integration Service
Fetches exercise data from ExerciseDB via RapidAPI
Premium API with 5,000+ exercises (V2 dataset)
"""
import httpx
import os
from typing import List, Dict, Optional
from functools import lru_cache

# RapidAPI ExerciseDB V1 endpoint
EXERCISEDB_BASE_URL = "https://exercisedb-api1.p.rapidapi.com/api/v1"
RAPIDAPI_KEY = os.getenv("EXERCISEDB_RAPIDAPI_KEY", "01a44cbd89msh864c4e87aba2d22p10f83cjsn2bea18eb05ec")

class ExerciseDBService:
    """Service for fetching exercise data from ExerciseDB API via RapidAPI"""
    
    def __init__(self):
        self.base_url = EXERCISEDB_BASE_URL
        self.timeout = 10.0
        self.headers = {
            "x-rapidapi-key": RAPIDAPI_KEY,
            "x-rapidapi-host": "exercisedb-api1.p.rapidapi.com"
        }
    
    async def get_exercises(
        self,
        offset: int = 0,
        limit: int = 20,
        search: Optional[str] = None
    ) -> Dict:
        """
        Get exercises with pagination and optional search
        
        Args:
            offset: Number of exercises to skip
            limit: Maximum number of exercises to return (max 100)
            search: Optional search query for fuzzy matching
            
        Returns:
            Dict with success, metadata (pagination), and data (exercises list)
        """
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            params = {
                "offset": offset,
                "limit": min(limit, 100)  # API max is 100
            }
            
            if search:
                params["search"] = search
            
            response = await client.get(
                f"{self.base_url}/exercises",
                params=params,
                headers=self.headers
            )
            response.raise_for_status()
            return response.json()
    
    async def search_exercises(
        self,
        query: str,
        offset: int = 0,
        limit: int = 20,
        threshold: float = 0.3
    ) -> Dict:
        """
        Search exercises with fuzzy matching
        
        Args:
            query: Search term (fuzzy matched against name, muscles, equipment, body parts)
            offset: Number of results to skip
            limit: Maximum number of results (max 100)
            threshold: Fuzzy search threshold (0 = exact match, 1 = very loose)
            
        Returns:
            Dict with success, metadata, and data
        """
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            params = {
                "search": query,
                "offset": offset,
                "limit": min(limit, 100)
            }
            
            response = await client.get(
                f"{self.base_url}/exercises/search",
                params=params,
                headers=self.headers
            )
            response.raise_for_status()
            return response.json()
    
    async def filter_exercises(
        self,
        offset: int = 0,
        limit: int = 20,
        search: Optional[str] = None,
        muscles: Optional[List[str]] = None,
        equipment: Optional[List[str]] = None,
        body_parts: Optional[List[str]] = None,
        sort_by: str = "name",
        sort_order: str = "asc"
    ) -> Dict:
        """
        Advanced filtering of exercises by multiple criteria
        Uses the search endpoint with filters
        
        Args:
            offset: Number to skip
            limit: Max results (max 100)
            search: Fuzzy search term
            muscles: List of target muscles to filter by
            equipment: List of equipment types to filter by
            body_parts: List of body parts to filter by
            sort_by: Field to sort by
            sort_order: asc or desc
            
        Returns:
            Dict with success, metadata, and data
        """
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            params = {
                "offset": offset,
                "limit": min(limit, 100)
            }
            
            # Use search if provided, otherwise get all exercises
            if search:
                params["search"] = search
                endpoint = f"{self.base_url}/exercises/search"
            else:
                endpoint = f"{self.base_url}/exercises"
            
            # Add filters as query params
            if muscles:
                params["targetMuscles"] = ",".join(muscles)
            if equipment:
                params["equipments"] = ",".join(equipment)
            if body_parts:
                params["bodyParts"] = ",".join(body_parts)
            
            response = await client.get(
                endpoint,
                params=params,
                headers=self.headers
            )
            response.raise_for_status()
            return response.json()
    
    async def get_exercise_by_id(self, exercise_id: str) -> Dict:
        """
        Get a single exercise by its ID
        
        Args:
            exercise_id: Unique exercise identifier
            
        Returns:
            Dict with success and data (exercise object)
        """
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(
                f"{self.base_url}/exercises/{exercise_id}",
                headers=self.headers
            )
            response.raise_for_status()
            return response.json()
    
    async def get_exercises_by_muscle(
        self,
        muscle_name: str,
        offset: int = 0,
        limit: int = 20,
        include_secondary: bool = False
    ) -> Dict:
        """
        Get exercises targeting a specific muscle
        Uses filter approach with targetMuscles parameter
        
        Args:
            muscle_name: Target muscle name (e.g., "pectoralis major", "biceps")
            offset: Number to skip
            limit: Max results
            include_secondary: Include exercises where muscle is secondary target
            
        Returns:
            Dict with success, metadata, and data
        """
        return await self.filter_exercises(
            offset=offset,
            limit=limit,
            muscles=[muscle_name]
        )
    
    async def get_exercises_by_equipment(
        self,
        equipment_name: str,
        offset: int = 0,
        limit: int = 20
    ) -> Dict:
        """
        Get exercises using specific equipment
        Uses filter approach with equipments parameter
        
        Args:
            equipment_name: Equipment name (e.g., "dumbbell", "barbell", "cable")
            offset: Number to skip
            limit: Max results
            
        Returns:
            Dict with success, metadata, and data
        """
        return await self.filter_exercises(
            offset=offset,
            limit=limit,
            equipment=[equipment_name]
        )
    
    async def get_exercises_by_body_part(
        self,
        body_part_name: str,
        offset: int = 0,
        limit: int = 20
    ) -> Dict:
        """
        Get exercises targeting a specific body part
        Uses filter approach with bodyParts parameter
        
        Args:
            body_part_name: Body part name (e.g., "chest", "upper arms", "back")
            offset: Number to skip
            limit: Max results
            
        Returns:
            Dict with success, metadata, and data
        """
        return await self.filter_exercises(
            offset=offset,
            limit=limit,
            body_parts=[body_part_name]
        )
    
    @lru_cache(maxsize=1)
    async def get_all_body_parts(self) -> List[str]:
        """
        Get list of all available body parts
        Cached since this rarely changes
        
        Returns:
            List of body part names
        """
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(
                f"{self.base_url}/bodyparts",
                headers=self.headers
            )
            response.raise_for_status()
            result = response.json()
            # V1 API returns array of objects with bodyPart field
            if isinstance(result, dict) and "data" in result:
                return [bp.get("bodyPart", bp) for bp in result.get("data", [])]
            # Or might return direct array
            return [bp.get("bodyPart", bp) if isinstance(bp, dict) else bp for bp in result]
    
    @lru_cache(maxsize=1)
    async def get_all_equipment(self) -> List[str]:
        """
        Get list of all available equipment types
        Cached since this rarely changes
        
        Returns:
            List of equipment names
        """
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(
                f"{self.base_url}/equipments",
                headers=self.headers
            )
            response.raise_for_status()
            result = response.json()
            # V1 API returns array of objects with equipment field
            if isinstance(result, dict) and "data" in result:
                return [eq.get("equipment", eq) for eq in result.get("data", [])]
            # Or might return direct array
            return [eq.get("equipment", eq) if isinstance(eq, dict) else eq for eq in result]
    
    @lru_cache(maxsize=1)
    async def get_all_muscles(self) -> List[str]:
        """
        Get list of all available muscle names
        Cached since this rarely changes
        
        Returns:
            List of muscle names
        """
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(
                f"{self.base_url}/muscles",
                headers=self.headers
            )
            response.raise_for_status()
            result = response.json()
            # V1 API returns array of objects with muscle field
            if isinstance(result, dict) and "data" in result:
                return [muscle.get("muscle", muscle) for muscle in result.get("data", [])]
            # Or might return direct array
            return [muscle.get("muscle", muscle) if isinstance(muscle, dict) else muscle for muscle in result]


# Singleton instance
_exercisedb_service: Optional[ExerciseDBService] = None

def get_exercisedb_service() -> ExerciseDBService:
    """Get the singleton ExerciseDB service instance"""
    global _exercisedb_service
    if _exercisedb_service is None:
        _exercisedb_service = ExerciseDBService()
    return _exercisedb_service
