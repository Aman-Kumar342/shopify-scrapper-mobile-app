# PowerShell script to check environment and clear cache
Write-Host "=== Environment Check ===" -ForegroundColor Cyan

# Check if backend is running
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/health" -Method GET -TimeoutSec 5
    Write-Host "✓ Backend is running on http://localhost:3000" -ForegroundColor Green
    Write-Host "  Status: $($response.status), Time: $($response.timestamp)"
} catch {
    Write-Host "✗ Backend is NOT running or not accessible" -ForegroundColor Red
    Write-Host "  Error: $_"
}

Write-Host ""
Write-Host "=== Clearing Expo Cache ===" -ForegroundColor Cyan

# Clear Expo cache
npx expo start --clear
