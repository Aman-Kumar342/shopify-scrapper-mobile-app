# Run this script to set Android SDK environment variables for the current session
# Or add these to your system environment variables permanently

# Common Android SDK paths - modify if yours is different
$androidSdkPaths = @(
    "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk",
    "C:\Program Files\Android\Sdk",
    "C:\Android\Sdk",
    "$env:LOCALAPPDATA\Android\Sdk"
)

$foundSdk = $null
foreach ($path in $androidSdkPaths) {
    if (Test-Path $path) {
        $foundSdk = $path
        break
    }
}

if ($foundSdk) {
    Write-Host "Found Android SDK at: $foundSdk" -ForegroundColor Green
    
    # Set environment variables for current session
    $env:ANDROID_HOME = $foundSdk
    $env:ANDROID_SDK_ROOT = $foundSdk
    
    # Add to PATH if not already there
    $platformTools = Join-Path $foundSdk "platform-tools"
    $tools = Join-Path $foundSdk "tools"
    
    $env:PATH = "$platformTools;$tools;$env:PATH"
    
    Write-Host "Environment variables set for this session!" -ForegroundColor Green
    Write-Host "ANDROID_HOME = $env:ANDROID_HOME"
    
    # Test adb
    try {
        $adbVersion = & "$platformTools\adb.exe" version
        Write-Host "ADB is working: $adbVersion" -ForegroundColor Green
    } catch {
        Write-Host "Warning: ADB not found or not working" -ForegroundColor Yellow
    }
} else {
    Write-Host "Android SDK not found in common locations!" -ForegroundColor Red
    Write-Host "Please install Android Studio or set ANDROID_HOME manually."
}

# To set permanently, run these commands as Administrator:
# [Environment]::SetEnvironmentVariable("ANDROID_HOME", "$foundSdk", "User")
# [Environment]::SetEnvironmentVariable("ANDROID_SDK_ROOT", "$foundSdk", "User")
