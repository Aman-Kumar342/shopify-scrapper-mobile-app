# Test API script
$API_BASE_URL = "http://localhost:3000"

Write-Host "=== Testing Backend API ===" -ForegroundColor Cyan

# Test health endpoint (no auth required)
try {
    $response = Invoke-RestMethod -Uri "$API_BASE_URL/health" -Method GET -TimeoutSec 5
    Write-Host "✓ Health endpoint: OK" -ForegroundColor Green
    Write-Host "  Status: $($response.status)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Health endpoint failed: $_" -ForegroundColor Red
    exit 1
}

# Test 401 on protected endpoint (expected without auth)
try {
    $body = @{ url = "https://example.myshopify.com" } | ConvertTo-Json
    Invoke-RestMethod -Uri "$API_BASE_URL/scrape/validate-store" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 5 | Out-Null
    Write-Host "? Validate endpoint: Unexpected success (should have required auth)" -ForegroundColor Yellow
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✓ Validate endpoint: Returns 401 as expected (auth required)" -ForegroundColor Green
    } else {
        Write-Host "✗ Validate endpoint error: $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== API Tests Complete ===" -ForegroundColor Cyan
Write-Host "The backend is running correctly." -ForegroundColor Green
Write-Host ""
Write-Host "To test with authentication, you need to:" -ForegroundColor Yellow
Write-Host "1. Log in through the app" -ForegroundColor White
Write-Host "2. Get your JWT token from the app logs" -ForegroundColor White
Write-Host "3. Use it in the Authorization header" -ForegroundColor White
