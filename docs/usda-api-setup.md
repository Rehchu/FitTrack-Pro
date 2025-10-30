# USDA FoodData Central API - Setup & Documentation

## Overview
FitTrack Pro is now integrated with the USDA FoodData Central API, providing access to nutritional data for over 1 million foods.

## API Configuration

### API Key
Your USDA API Key has been configured in the backend:
- **API Key**: `uH2TDQWthtdFvLn6Bz4wXe2VLBBGwA3SbeHPnGkJ`
- **Rate Limits**: 1,000 requests per hour (3,600x improvement over DEMO_KEY)

### Environment Configuration
The API key is stored in:
- `backend/.env` (active backend)
- `installer/build/backend/.env` (for packaged installer)

```env
# USDA FoodData Central API - Nutritional data for 1M+ foods
# API Key from: https://fdc.nal.usda.gov/api-key-signup.html
# Docs: https://fdc.nal.usda.gov/api-spec/fdc_api.html
USDA_API_KEY=uH2TDQWthtdFvLn6Bz4wXe2VLBBGwA3SbeHPnGkJ
```

## API Documentation

### Official Resources
- **API Specification**: https://fdc.nal.usda.gov/api-spec/fdc_api.html
- **Developer Guide**: https://fdc.nal.usda.gov/api-guide.html
- **Data.gov Docs**: https://api.data.gov/docs/developer-manual/
- **OpenAPI YAML**: `c:\Users\Rehchu\Downloads\fdc_api.yaml`
- **OpenAPI JSON**: `c:\Users\Rehchu\Downloads\fdc_api.json`

### Base URL
```
https://api.nal.usda.gov/fdc/v1
```

### Authentication
All requests require an API key passed as a query parameter:
```
?api_key=uH2TDQWthtdFvLn6Bz4wXe2VLBBGwA3SbeHPnGkJ
```

## FitTrack Pro Integration

### Backend Endpoints

#### 1. Search Foods
```http
GET /usda/search?q=chicken+breast&page_size=20&page_number=1
```

**Parameters**:
- `q` (required): Search query (e.g., "chicken breast", "brown rice")
- `page_size` (optional): Results per page (1-200, default: 20)
- `page_number` (optional): Page number (default: 1)

**Response**:
```json
{
  "query": "chicken breast",
  "totalHits": 1234,
  "currentPage": 1,
  "totalPages": 62,
  "foods": [
    {
      "fdcId": 171477,
      "description": "Chicken, broilers or fryers, breast, meat only, raw",
      "brandOwner": null,
      "servingSize": 100,
      "servingSizeUnit": "g",
      "calories": 120,
      "protein": 22.5,
      "carbs": 0,
      "fat": 2.6,
      "fiber": 0,
      "sodium": 63
    }
  ]
}
```

#### 2. Get Food Details
```http
GET /usda/food/{fdc_id}
```

**Parameters**:
- `fdc_id` (required): Food Data Central ID

**Response**:
```json
{
  "fdcId": 171477,
  "description": "Chicken, broilers or fryers, breast, meat only, raw",
  "brandOwner": null,
  "ingredients": "Chicken breast",
  "servingSize": 100,
  "servingSizeUnit": "g",
  "calories": 120,
  "protein": 22.5,
  "carbs": 0,
  "fat": 2.6,
  "fiber": 0,
  "sodium": 63
}
```

### Frontend Integration

The USDA API is integrated into the **MealBuilder** component:

**File**: `desktop-app/src/renderer/MealBuilder.jsx`

**Features**:
- Search USDA database for foods
- Add custom food items (manual nutritional entry)
- Track quantity, unit, and macros
- Real-time total calculations (calories, protein, carbs, fat, fiber)
- Save meal plans to backend

**Usage**:
1. Open a client profile in FitTrack Pro
2. Navigate to the "Meals" tab
3. Click "+ Create Meal Plan"
4. Search for foods using the USDA database
5. Add foods to the meal plan
6. Adjust quantities and serving sizes
7. Save the meal plan

### Data Types Included

The USDA API searches across multiple data types:
- **Survey (FNDDS)**: Foods from dietary surveys
- **Foundation**: Core foods with detailed nutrient data
- **Branded**: Packaged food products with brand information

### Nutrient Data

The integration extracts and simplifies these key nutrients:
- **Calories** (Energy)
- **Protein** (g)
- **Carbohydrates** (g)
- **Fat** (Total Lipid, g)
- **Fiber** (g)
- **Sodium** (mg)

## Rate Limits & Best Practices

### Rate Limits
- **With API Key**: 1,000 requests/hour
- **DEMO_KEY**: 30 requests/hour

### Best Practices
1. **Cache Results**: Store frequently searched foods locally
2. **Batch Requests**: Use POST endpoints for multiple food lookups
3. **Error Handling**: Gracefully handle rate limit errors (429 status)
4. **User Feedback**: Show loading states during API calls

### Monitoring Usage
Monitor your API usage at: https://fdc.nal.usda.gov/api-key-manage.html

## Testing

### Test Backend Endpoint
```bash
# Test search
curl "http://localhost:8000/usda/search?q=chicken+breast&page_size=5"

# Test food details
curl "http://localhost:8000/usda/food/171477"
```

### Test in FitTrack Pro
1. Start backend: `cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000`
2. Run FitTrack Pro desktop app
3. Create or open a client profile
4. Click "+ Create Meal Plan"
5. Search for "chicken breast"
6. Verify results display with nutritional data

## Troubleshooting

### API Key Not Working
- Verify API key is in `backend/.env`
- Restart backend server after updating `.env`
- Check backend logs for USDA API errors

### Rate Limit Exceeded
- Error 429: Too many requests
- Solution: Reduce request frequency or upgrade API tier
- Fallback: Allow manual entry of nutritional data

### No Results Found
- Verify search query spelling
- Try broader search terms (e.g., "chicken" instead of "organic free-range chicken breast")
- Check USDA API status: https://fdc.nal.usda.gov/

### Backend Connection Issues
- Ensure backend is running on http://localhost:8000
- Check firewall settings
- Verify CORS configuration in `backend/app/main.py`

## Future Enhancements

### Planned Features
1. **Caching Layer**: Store popular foods locally to reduce API calls
2. **Barcode Scanner**: Scan product barcodes to look up foods by UPC
3. **Meal Templates**: Save common meals for quick reuse
4. **Nutritional Goals**: Set daily targets and track progress
5. **Recipe Builder**: Combine multiple foods into custom recipes

### Advanced API Features
- **Autocomplete**: Use USDA search with `pageSize=5` for quick suggestions
- **Filtering**: Filter by data type, brand, or nutrient ranges
- **Sorting**: Sort results by popularity, relevance, or nutritional content

## Support & Resources

### USDA Support
- **Contact**: https://nal.altarama.com/reft100.aspx?key=FoodData
- **License**: Creative Commons 0 1.0 Universal
- **Updates**: Database updated regularly with new foods

### FitTrack Pro Support
- Check `docs/v1.2-complete-guide.md` for full feature documentation
- Review `FEATURE_CHECKLIST.md` for implementation status
- See `docs/meal-builder-guide.md` for meal planning tutorials

## API Response Examples

### Branded Food Example
```json
{
  "fdcId": 534358,
  "description": "GREEK YOGURT",
  "brandOwner": "Chobani, LLC",
  "servingSize": 150,
  "servingSizeUnit": "g",
  "calories": 100,
  "protein": 17,
  "carbs": 6,
  "fat": 0,
  "fiber": 0,
  "sodium": 65
}
```

### Survey Food Example
```json
{
  "fdcId": 167512,
  "description": "Egg, whole, cooked, fried",
  "brandOwner": null,
  "servingSize": 46,
  "servingSizeUnit": "g",
  "calories": 90,
  "protein": 6.3,
  "carbs": 0.4,
  "fat": 7,
  "fiber": 0,
  "sodium": 94
}
```

### Foundation Food Example
```json
{
  "fdcId": 171287,
  "description": "Nuts, almonds",
  "brandOwner": null,
  "servingSize": 100,
  "servingSizeUnit": "g",
  "calories": 579,
  "protein": 21.15,
  "carbs": 21.55,
  "fat": 49.93,
  "fiber": 12.5,
  "sodium": 1
}
```

---

**Last Updated**: October 29, 2025  
**API Version**: v1  
**Integration Status**: ✅ Active and tested
