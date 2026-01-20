# ARM Windows Quick Build Script for ha-weather-forecast-card
# Run: powershell -NoProfile -ExecutionPolicy Bypass -Command "& '.\build.ps1'"

param(
    [switch]$Install,
    [switch]$Build,
    [switch]$Dev,
    [switch]$Test,
    [switch]$Clean,
    [switch]$All
)

$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Ensure we stay in the correct directory
Push-Location $projectDir -StackName BuildStack

try {
    # Print current directory (verify we're in the right place)
    Write-Host "`n=== ha-weather-forecast-card Build Script ===" -ForegroundColor Cyan
    Write-Host "Project directory: $(Get-Location)" -ForegroundColor Green
    Write-Host ""

    # Configure npm for ARM Windows
    if ($Install -or $All) {
        Write-Host "Configuring npm for ARM Windows..." -ForegroundColor Yellow
        npm config set cache "C:\npm-cache"
        
        Write-Host "Installing dependencies..." -ForegroundColor Yellow
        npm install
        Write-Host "✓ Dependencies installed" -ForegroundColor Green
    }

    if ($Clean -or $All) {
        Write-Host "`nCleaning build artifacts..." -ForegroundColor Yellow
        npm run clean
        Write-Host "✓ Cleaned" -ForegroundColor Green
    }

    if ($Build -or $All) {
        Write-Host "`nBuilding production bundle..." -ForegroundColor Yellow
        npm run build
        Write-Host "✓ Build complete: dist/weather-forecast-card.js" -ForegroundColor Green
    }

    if ($Dev) {
        Write-Host "`nStarting development server..." -ForegroundColor Yellow
        npm run dev
    }

    if ($Test) {
        Write-Host "`nRunning tests..." -ForegroundColor Yellow
        npm run test
    }

    if (-not ($Install -or $Build -or $Dev -or $Test -or $Clean -or $All)) {
        Write-Host "Usage: .\build.ps1 [options]" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Options:"
        Write-Host "  -Install   Install dependencies"
        Write-Host "  -Build     Build production bundle"
        Write-Host "  -Dev       Start development server"
        Write-Host "  -Test      Run tests"
        Write-Host "  -Clean     Clean build artifacts"
        Write-Host "  -All       Clean + Install + Build"
        Write-Host ""
        Write-Host "Examples:"
        Write-Host "  .\build.ps1 -Install           # Install dependencies"
        Write-Host "  .\build.ps1 -Build             # Build production"
        Write-Host "  .\build.ps1 -All               # Full rebuild"
        Write-Host "  .\build.ps1 -Dev               # Start dev server"
    }
}
finally {
    Pop-Location -StackName BuildStack
}
