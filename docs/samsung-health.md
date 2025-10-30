# Samsung Health integration (server-side)

This project includes a first step for ingesting Samsung Health data via webhooks. Native/mobile apps (Android) or middleware can POST their collected events to the backend, and the server will persist payloads for later processing and aggregation.

## Endpoints

- POST /integrations/shealth/webhook
  - Body: arbitrary JSON Samsung Health payload(s)
  - Action: Stores the raw payload in the `SHealthData` table for auditing and offline processing.

- POST /integrations/shealth/import_for_client/{client_id}
  - Body: arbitrary JSON Samsung Health payload(s)
  - Action: Same as webhook, but associates the data with a specific client to enable user-level imports.

## Data model

- `SHealthData` ORM model with fields: id, client_id (nullable), received_at, source, payload (JSON).

## Suggested native side flow

1. Use Samsung Health Stack SDK (Android) to collect permissions and read user metrics: steps, heart rate, sleep, workouts.
2. Serialize events batched by day (or per-event), and send JSON to the backend webhook endpoints above.
3. Include `client_id` in the request path (or payload) if you already know which client in FitTrack Pro the data is mapped to.

## Processing roadmap

- Parse `SHealthData.payload` to extract metrics and store normalized rows (DailyMetrics, Workouts, HeartRateSamples).
- Aggregate into daily stats for dashboard charts.
- Optionally surface trainer alerts (e.g., unusually low sleep, prolonged inactivity).

## Local testing

```powershell
# Post a sample payload
iwr -UseBasicParsing -Method Post -ContentType 'application/json' `
  -Body '{"source":"debug","steps":[{"date":"2025-10-28","count":8421}]}' `
  http://localhost:8000/integrations/shealth/webhook
```

Note: On Windows PowerShell use backticks for line continuation; escaping quotes as needed.
