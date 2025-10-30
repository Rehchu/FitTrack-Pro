import requests
import json

# Test USDA search endpoint
print("Testing USDA search endpoint...")
response = requests.get("http://127.0.0.1:8000/usda/search", params={"q": "chicken breast", "page_size": 3})
print(f"Status Code: {response.status_code}")

if response.status_code == 200:
    data = response.json()
    print(f"\n✅ USDA API is working!")
    print(f"Query: {data['query']}")
    print(f"Total Results: {data['totalHits']}")
    print(f"\nFirst 3 foods found:")
    for i, food in enumerate(data['foods'], 1):
        print(f"\n{i}. {food['description']}")
        print(f"   Calories: {food['calories']} kcal")
        print(f"   Protein: {food['protein']}g")
        print(f"   Carbs: {food['carbs']}g")
        print(f"   Fat: {food['fat']}g")
        if food.get('brandOwner'):
            print(f"   Brand: {food['brandOwner']}")
else:
    print(f"❌ Error: {response.text}")
