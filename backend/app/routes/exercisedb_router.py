"""
ExerciseDB Router - Proxy endpoints to ExerciseDB API
Provides exercise database access with 1,300+ exercises
"""
from fastapi import APIRouter, Query, HTTPException
from typing import Optional, List
from ..exercisedb_service import get_exercisedb_service

router = APIRouter(prefix="/exercisedb", tags=["exercisedb"])

@router.get("/exercises")
async def get_exercises(
    offset: int = Query(0, ge=0, description="Number of exercises to skip"),
    limit: int = Query(20, ge=1, le=100, description="Maximum exercises to return (max 100)"),
    search: Optional[str] = Query(None, description="Optional search query for fuzzy matching")
):
    """
    Get exercises with pagination and optional search
    
    Returns exercises from ExerciseDB API (1,300+ exercises)
    Each exercise includes: id, name, gifUrl, equipment, bodyParts, targetMuscles, 
    secondaryMuscles, instructions
    """
    try:
        service = get_exercisedb_service()
        return await service.get_exercises(offset=offset, limit=limit, search=search)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch exercises: {str(e)}")


@router.get("/exercises/search")
async def search_exercises(
    q: str = Query(..., description="Search term (fuzzy matched against name, muscles, equipment, body parts)"),
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    threshold: float = Query(0.3, ge=0, le=1, description="Fuzzy search threshold (0=exact, 1=loose)")
):
    """
    Search exercises with fuzzy matching
    
    Perfect for when users don't know exact terms.
    Example: "chest push" will match "Barbell Bench Press", "Push-up", etc.
    """
    try:
        service = get_exercisedb_service()
        return await service.search_exercises(
            query=q,
            offset=offset,
            limit=limit,
            threshold=threshold
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@router.get("/exercises/filter")
async def filter_exercises(
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None, description="Fuzzy search term"),
    muscles: Optional[str] = Query(None, description="Comma-separated target muscles (e.g., 'pectoralis major,triceps')"),
    equipment: Optional[str] = Query(None, description="Comma-separated equipment (e.g., 'dumbbell,barbell')"),
    body_parts: Optional[str] = Query(None, description="Comma-separated body parts (e.g., 'chest,upper arms')"),
    sort_by: str = Query("name", description="Field to sort by (name, targetMuscles, bodyParts, equipments)"),
    sort_order: str = Query("asc", description="Sort order (asc or desc)")
):
    """
    Advanced filtering of exercises by multiple criteria
    
    Combine search with muscle, equipment, and body part filters.
    Example: search="press" + muscles="pectoralis major" + equipment="barbell"
    """
    try:
        service = get_exercisedb_service()
        
        # Parse comma-separated lists
        muscles_list = muscles.split(",") if muscles else None
        equipment_list = equipment.split(",") if equipment else None
        body_parts_list = body_parts.split(",") if body_parts else None
        
        return await service.filter_exercises(
            offset=offset,
            limit=limit,
            search=search,
            muscles=muscles_list,
            equipment=equipment_list,
            body_parts=body_parts_list,
            sort_by=sort_by,
            sort_order=sort_order
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Filter failed: {str(e)}")


@router.get("/exercises/{exercise_id}")
async def get_exercise_by_id(exercise_id: str):
    """
    Get a single exercise by its unique ID
    
    Returns full exercise details including instructions, GIF URL, target muscles, etc.
    """
    try:
        service = get_exercisedb_service()
        return await service.get_exercise_by_id(exercise_id)
    except Exception as e:
        if "404" in str(e):
            raise HTTPException(status_code=404, detail=f"Exercise {exercise_id} not found")
        raise HTTPException(status_code=500, detail=f"Failed to fetch exercise: {str(e)}")


@router.get("/muscles/{muscle_name}/exercises")
async def get_exercises_by_muscle(
    muscle_name: str,
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    include_secondary: bool = Query(False, description="Include exercises where muscle is secondary target")
):
    """
    Get exercises targeting a specific muscle
    
    Examples: "pectoralis major", "biceps brachii", "quadriceps"
    Set include_secondary=true to also include exercises where the muscle is a secondary target
    """
    try:
        service = get_exercisedb_service()
        return await service.get_exercises_by_muscle(
            muscle_name=muscle_name,
            offset=offset,
            limit=limit,
            include_secondary=include_secondary
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch exercises: {str(e)}")


@router.get("/equipments/{equipment_name}/exercises")
async def get_exercises_by_equipment(
    equipment_name: str,
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100)
):
    """
    Get exercises using specific equipment
    
    Examples: "dumbbell", "barbell", "cable", "kettlebell", "bodyweight"
    """
    try:
        service = get_exercisedb_service()
        return await service.get_exercises_by_equipment(
            equipment_name=equipment_name,
            offset=offset,
            limit=limit
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch exercises: {str(e)}")


@router.get("/bodyparts/{body_part_name}/exercises")
async def get_exercises_by_body_part(
    body_part_name: str,
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100)
):
    """
    Get exercises targeting a specific body part
    
    Examples: "chest", "back", "upper arms", "shoulders", "legs"
    """
    try:
        service = get_exercisedb_service()
        return await service.get_exercises_by_body_part(
            body_part_name=body_part_name,
            offset=offset,
            limit=limit
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch exercises: {str(e)}")


@router.get("/metadata/bodyparts")
async def get_all_body_parts():
    """
    Get list of all available body parts
    
    Use this to populate filter dropdowns in the UI
    """
    try:
        service = get_exercisedb_service()
        body_parts = await service.get_all_body_parts()
        return {"success": True, "data": body_parts}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch body parts: {str(e)}")


@router.get("/metadata/equipments")
async def get_all_equipment():
    """
    Get list of all available equipment types
    
    Use this to populate filter dropdowns in the UI
    """
    try:
        service = get_exercisedb_service()
        equipment = await service.get_all_equipment()
        return {"success": True, "data": equipment}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch equipment: {str(e)}")


@router.get("/metadata/muscles")
async def get_all_muscles():
    """
    Get list of all available muscle names
    
    Use this to populate filter dropdowns in the UI
    """
    try:
        service = get_exercisedb_service()
        muscles = await service.get_all_muscles()
        return {"success": True, "data": muscles}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch muscles: {str(e)}")
