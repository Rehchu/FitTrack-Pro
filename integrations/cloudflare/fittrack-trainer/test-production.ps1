# FitTrack Trainer Portal - Production Testing Script
# Run this script to test all major endpoints and features

$base = "https://fittrack-trainer.rehchu1.workers.dev"
Write-Host "Testing FitTrack Trainer Portal at: $base" -ForegroundColor Cyan
Write-Host ""

# Generate random test data
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$testEmail = "trainer.test$timestamp@fittrack.local"
$testClientEmail = "client.test$timestamp@fittrack.local"

# Test 1: Register Trainer
Write-Host "Test 1: Registering trainer..." -ForegroundColor Yellow
try {
    $body = @{
        name = "Test Trainer $timestamp"
        businessName = "Test Gym $timestamp"
        email = $testEmail
        password = "TestPass123!"
    } | ConvertTo-Json

    $response = Invoke-WebRequest -Uri "$base/api/auth/register" -Method POST -ContentType 'application/json' -Body $body -SessionVariable 'session'
    Write-Host "[OK] Registration successful" -ForegroundColor Green
    Write-Host "  Email: $testEmail" -ForegroundColor Gray
} catch {
    Write-Host "[FAIL] Registration failed: $_" -ForegroundColor Red
    exit
}

# Test 2: Login
Write-Host "`nTest 2: Logging in..." -ForegroundColor Yellow
try {
    $body = @{
        email = $testEmail
        password = "TestPass123!"
    } | ConvertTo-Json

    $response = Invoke-WebRequest -Uri "$base/api/auth/login" -Method POST -ContentType 'application/json' -Body $body -WebSession $session
    Write-Host "[OK] Login successful" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Login failed: $_" -ForegroundColor Red
    exit
}

# Test 3: Get Clients (should be empty)
Write-Host "`nTest 3: Fetching clients..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$base/api/clients" -WebSession $session
    $data = $response.Content | ConvertFrom-Json
    Write-Host "[OK] Clients retrieved: $($data.clients.Count) clients" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Failed to fetch clients: $_" -ForegroundColor Red
}

# Test 4: Add Client
Write-Host "`nTest 4: Adding client..." -ForegroundColor Yellow
try {
    $body = @{
        name = "Test Client $timestamp"
        email = $testClientEmail
        password = "ClientPass123!"
    } | ConvertTo-Json

    $response = Invoke-WebRequest -Uri "$base/api/clients" -Method POST -ContentType 'application/json' -Body $body -WebSession $session
    $clientData = $response.Content | ConvertFrom-Json
    $clientId = $clientData.client_id
    Write-Host "[OK] Client added successfully" -ForegroundColor Green
    Write-Host "  Client ID: $clientId" -ForegroundColor Gray
    Write-Host "  Email: $testClientEmail" -ForegroundColor Gray
} catch {
    Write-Host "[FAIL] Failed to add client: $_" -ForegroundColor Red
    exit
}

# Test 5: Add Measurement
Write-Host "`nTest 5: Adding measurement..." -ForegroundColor Yellow
try {
    $body = @{
        client_id = $clientId
        weight_lbs = 180.5
        body_fat_pct = 22.5
        height_in = 70.0
        neck_in = 15.5
        chest_in = 42.0
        waist_in = 34.0
        hips_in = 38.0
        bicep_in = 14.5
        thigh_in = 22.0
        calf_in = 15.0
        resting_hr = 68
        bp_systolic = 120
        bp_diastolic = 80
        steps = 8500
        notes = "Initial baseline measurement"
    } | ConvertTo-Json

    $response = Invoke-WebRequest -Uri "$base/api/measurements" -Method POST -ContentType 'application/json' -Body $body -WebSession $session
    Write-Host "[OK] Measurement added successfully" -ForegroundColor Green
    Write-Host "  Weight: 180.5 lbs, Body Fat: 22.5%, Waist: 34 in" -ForegroundColor Gray
} catch {
    Write-Host "[FAIL] Failed to add measurement: $_" -ForegroundColor Red
}

# Test 6: Get Measurements
Write-Host "`nTest 6: Fetching measurements..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$base/api/measurements?clientId=$clientId" -WebSession $session
    $data = $response.Content | ConvertFrom-Json
    Write-Host "[OK] Measurements retrieved: $($data.measurements.Count) entries" -ForegroundColor Green
    if ($data.measurements.Count -gt 0) {
        $latest = $data.measurements[0]
        Write-Host "  Latest: Weight=$($latest.weight_lbs) lbs, Waist=$($latest.waist_in) in" -ForegroundColor Gray
    }
} catch {
    Write-Host "[FAIL] Failed to fetch measurements: $_" -ForegroundColor Red
}

# Test 7: Assign Quest
Write-Host "`nTest 7: Assigning quest..." -ForegroundColor Yellow
try {
    $body = @{
        client_id = $clientId
        title = "Lose 10 lbs"
        quest_type = "weight_loss"
        target_value = 10
        target_unit = "lbs"
        difficulty = "medium"
        xp_reward = 200
    } | ConvertTo-Json

    $response = Invoke-WebRequest -Uri "$base/api/quests" -Method POST -ContentType 'application/json' -Body $body -WebSession $session
    Write-Host "[OK] Quest assigned successfully" -ForegroundColor Green
    Write-Host "  Quest: Lose 10 lbs" -ForegroundColor Gray
} catch {
    Write-Host "[FAIL] Failed to assign quest: $_" -ForegroundColor Red
}

# Test 8: Get Quests
Write-Host "`nTest 8: Fetching quests..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$base/api/quests?clientId=$clientId" -WebSession $session
    $data = $response.Content | ConvertFrom-Json
    Write-Host "[OK] Quests retrieved: $($data.quests.Count) active quests" -ForegroundColor Green
    if ($data.quests.Count -gt 0) {
        foreach ($quest in $data.quests) {
            $progress = [Math]::Round($quest.progress_percentage)
            Write-Host "  - $($quest.title) [$($quest.difficulty)] - Progress: $progress%" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "[FAIL] Failed to fetch quests: $_" -ForegroundColor Red
}

# Test 9: Create Workout
Write-Host "`nTest 9: Creating workout..." -ForegroundColor Yellow
try {
    $scheduledDate = (Get-Date).AddDays(1).ToString("yyyy-MM-dd")
    $body = @{
        client_id = $clientId
        title = "Upper Body Day"
        scheduled_at = $scheduledDate
    } | ConvertTo-Json

    $response = Invoke-WebRequest -Uri "$base/api/workouts" -Method POST -ContentType 'application/json' -Body $body -WebSession $session
    Write-Host "[OK] Workout created successfully" -ForegroundColor Green
    Write-Host "  Scheduled: $scheduledDate" -ForegroundColor Gray
} catch {
    Write-Host "[FAIL] Failed to create workout: $_" -ForegroundColor Red
}

# Test 10: Create Meal Plan
Write-Host "`nTest 10: Creating meal plan..." -ForegroundColor Yellow
try {
    $meals = @{
        breakfast = @{ name = "Protein Breakfast"; calories = 450; protein = 30 }
        lunch = @{ name = "Balanced Lunch"; calories = 650; protein = 40 }
        dinner = @{ name = "Light Dinner"; calories = 550; protein = 35 }
        snacks = @{ name = "Healthy Snacks"; calories = 200; protein = 15 }
    }
    
    $body = @{
        client_id = $clientId
        name = "High Protein Plan"
        description = "2000 calorie high-protein meal plan"
        meals = $meals
    } | ConvertTo-Json -Depth 3

    $response = Invoke-WebRequest -Uri "$base/api/meal-plans" -Method POST -ContentType 'application/json' -Body $body -WebSession $session
    Write-Host "[OK] Meal plan created successfully" -ForegroundColor Green
    Write-Host "  Plan: High Protein Plan (2000 cal)" -ForegroundColor Gray
} catch {
    Write-Host "[FAIL] Failed to create meal plan: $_" -ForegroundColor Red
}

# Test 11: Get Analytics
Write-Host "`nTest 11: Fetching analytics..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$base/api/analytics/summary" -WebSession $session
    $data = $response.Content | ConvertFrom-Json
    Write-Host "[OK] Analytics retrieved successfully" -ForegroundColor Green
    Write-Host "  Clients: $($data.clients)" -ForegroundColor Gray
    Write-Host "  Active Quests: $($data.quests)" -ForegroundColor Gray
    Write-Host "  Completed Quests: $($data.completed_quests)" -ForegroundColor Gray
    Write-Host "  Measurements: $($data.measurements)" -ForegroundColor Gray
    Write-Host "  Meal Plans: $($data.meal_plans)" -ForegroundColor Gray
} catch {
    Write-Host "[FAIL] Failed to fetch analytics: $_" -ForegroundColor Red
}

# Test 12: Logout
Write-Host "`nTest 12: Logging out..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$base/api/auth/logout" -Method POST -WebSession $session
    Write-Host "[OK] Logout successful" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Logout failed: $_" -ForegroundColor Red
}

# Summary
Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "TEST SUMMARY" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Test account created:" -ForegroundColor White
Write-Host "  Trainer Email: $testEmail" -ForegroundColor Gray
Write-Host "  Trainer Password: TestPass123!" -ForegroundColor Gray
Write-Host "  Client Email: $testClientEmail" -ForegroundColor Gray
Write-Host "  Client ID: $clientId" -ForegroundColor Gray
Write-Host ""
Write-Host "You can now login at: $base/login" -ForegroundColor Yellow
Write-Host "Use the trainer credentials above to access the portal." -ForegroundColor Yellow
Write-Host ""
Write-Host "All tests completed!" -ForegroundColor Green
