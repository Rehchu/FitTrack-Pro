import os
import tempfile
from pathlib import Path

# Use a temporary SQLite file for tests so all modules share the same DB across multiple SQLAlchemy engines
test_db_path = Path('test_backend.db')
if test_db_path.exists():
    try:
        test_db_path.unlink()
    except Exception:
        pass
os.environ.setdefault("DATABASE_URL", f"sqlite:///{test_db_path}")

from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_health():
    resp = client.get('/health')
    assert resp.status_code == 200
    assert resp.json().get('status') == 'ok'

def test_create_client_and_pdf():
    # Create a client
    resp = client.post('/clients', json={'name': 'Test User', 'email': 'test@example.com'})
    assert resp.status_code == 200
    data = resp.json()
    client_id = data['id']

    # Create a workout
    resp2 = client.post(f'/clients/{client_id}/workouts', json={'title': 'Test Workout'})
    assert resp2.status_code == 200

    # Request PDF
    resp3 = client.post(f'/clients/{client_id}/pdf')
    assert resp3.status_code == 200
    assert resp3.headers['content-type'] == 'application/pdf' or 'pdf' in resp3.headers.get('content-type', '')


def test_weights_and_avatar():
    # Create a client
    resp = client.post('/clients', json={'name': 'Avatar User', 'email': 'avatar@example.com'})
    assert resp.status_code == 200
    client_id = resp.json()['id']

    # Add a weight entry
    resp2 = client.post(f'/clients/{client_id}/weights', json={'weight': 85})
    assert resp2.status_code == 200

    # Get avatar PNG
    resp3 = client.get(f'/clients/{client_id}/avatar')
    assert resp3.status_code == 200
    assert 'image/png' in resp3.headers.get('content-type', '')


def test_award_and_list_achievements():
    # Create a client
    resp = client.post('/clients', json={'name': 'Achiever', 'email': 'achiever@example.com'})
    assert resp.status_code == 200
    client_id = resp.json()['id']

    # Award achievement
    resp2 = client.post(f'/clients/{client_id}/achievements', json={'name': 'First Session', 'description': 'Completed first session'})
    assert resp2.status_code == 200
    aid = resp2.json()['id']

    # List achievements
    resp3 = client.get(f'/clients/{client_id}/achievements')
    assert resp3.status_code == 200
    data = resp3.json()
    assert any(a['id'] == aid for a in data)


def test_pdf_with_embedded_avatar():
    # Create client
    resp = client.post('/clients', json={'name': 'PDF Avatar', 'email': 'pdfavatar@example.com'})
    client_id = resp.json()['id']
    # Add weight
    client.post(f'/clients/{client_id}/weights', json={'weight': 72})
    # Request PDF with embed_avatar param
    resp2 = client.post(f'/clients/{client_id}/pdf?embed_avatar=true')
    assert resp2.status_code == 200
    assert 'application/pdf' in resp2.headers.get('content-type', '')


def test_meal_tracking():
    # Create a client
    resp = client.post('/clients', json={'name': 'Meal User', 'email': 'mealuser@example.com'})
    assert resp.status_code == 200
    client_id = resp.json()['id']

    # Create a meal with items
    meal_data = {
        'name': 'Breakfast',
        'date': '2025-10-29',
        'notes': 'Morning meal',
        'items': [
            {
                'name': 'Oatmeal',
                'quantity': '1 cup',
                'calories': 150,
                'protein': 5,
                'carbs': 27,
                'fat': 3
            },
            {
                'name': 'Banana',
                'quantity': '1 medium',
                'calories': 105,
                'protein': 1,
                'carbs': 27,
                'fat': 0.4
            }
        ]
    }
    resp2 = client.post(f'/clients/{client_id}/meals', json=meal_data)
    assert resp2.status_code == 200
    meal = resp2.json()
    assert meal['name'] == 'Breakfast'
    assert meal['total_nutrients']['calories'] == 255  # 150 + 105

    # List meals for client
    resp3 = client.get(f'/clients/{client_id}/meals')
    assert resp3.status_code == 200
    meals = resp3.json()
    assert len(meals) == 1
    assert meals[0]['id'] == meal['id']


def test_measurements():
    # Create a client
    resp = client.post('/clients', json={'name': 'Measurement User', 'email': 'measureuser@example.com'})
    assert resp.status_code == 200
    client_id = resp.json()['id']

    # Add a measurement (without photos for simplicity)
    measurement_data = {
        'date': '2025-10-29',
        'weight': 75.5,
        'body_fat': 15.2,
        'chest': 100,
        'waist': 80,
        'hips': 95,
        'notes': 'First measurement'
    }
    # Note: Measurement endpoint might expect FormData for photos, but should accept JSON too
    # This is a simplified test
    resp2 = client.post(f'/clients/{client_id}/measurements', json=measurement_data)
    assert resp2.status_code in (200, 201)
    # Fetch latest measurements
    resp3 = client.get(f'/clients/{client_id}/measurements')
    assert resp3.status_code == 200
    data = resp3.json()
    assert isinstance(data, list)
    assert any(m.get('weight') == 75.5 for m in data)


def test_share_profile_and_public_view():
    # Create a client
    resp = client.post('/clients', json={'name': 'Share User', 'email': 'shareuser@example.com'})
    assert resp.status_code == 200
    client_id = resp.json()['id']

    # Generate share link via legacy desktop-friendly endpoint (no auth)
    resp2 = client.post(f'/clients/{client_id}/share', json={'client_email': 'shareuser@example.com', 'expires_days': 7})
    assert resp2.status_code == 200
    payload = resp2.json()
    assert 'share_url' in payload and 'token' in payload
    token = payload['token']

    # Access public profile using token
    resp3 = client.get(f'/public/profile/{token}')
    assert resp3.status_code == 200
    body = resp3.json()
    assert 'client' in body and 'measurements' in body and 'achievements' in body

