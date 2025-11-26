# Uber Arcade - Development Startup Script
# This script starts both frontend and backend services using Docker

param(
    [Parameter(Mandatory=$false)]
    [switch]$Build = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$Down = $false
)

$ErrorActionPreference = "Stop"

Write-Host "🎮 Uber Arcade - Development Environment" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""

# Check if Docker is running
Write-Host "🐳 Checking Docker..." -ForegroundColor Yellow
try {
    docker ps > $null 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Docker is not running"
    }
    Write-Host "✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Docker is not running" -ForegroundColor Red
    Write-Host "   Please start Docker Desktop and try again." -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Check if backend folder exists
$backendPath = "..\uberplaynow-backend"
Write-Host "📁 Checking backend folder..." -ForegroundColor Yellow
if (-not (Test-Path $backendPath)) {
    Write-Host "❌ Error: Backend folder not found at $backendPath" -ForegroundColor Red
    Write-Host "   Please ensure the backend is in the correct location." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Expected structure:" -ForegroundColor Cyan
    Write-Host "  parent-folder/" -ForegroundColor Gray
    Write-Host "  ├── uberplaynow-frontend/ (this folder)" -ForegroundColor Gray
    Write-Host "  └── uberplaynow-backend/" -ForegroundColor Gray
    Write-Host ""
    exit 1
}
Write-Host "✅ Backend folder found" -ForegroundColor Green
Write-Host ""

# Check if backend has Dockerfile
$backendDockerfile = Join-Path $backendPath "Dockerfile"
if (-not (Test-Path $backendDockerfile)) {
    Write-Host "⚠️  Warning: Backend Dockerfile not found at $backendDockerfile" -ForegroundColor Yellow
    Write-Host "   The backend needs a Dockerfile to run in Docker." -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit 1
    }
    Write-Host ""
}

# Handle shutdown
if ($Down) {
    Write-Host "🛑 Stopping services..." -ForegroundColor Yellow
    docker-compose down
    Write-Host ""
    Write-Host "✅ Services stopped" -ForegroundColor Green
    exit 0
}

# Start services
if ($Build) {
    Write-Host "🔨 Building and starting services..." -ForegroundColor Yellow
    docker-compose up --build -d
} else {
    Write-Host "🚀 Starting services..." -ForegroundColor Yellow
    docker-compose up -d
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start services" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "✅ Services Started Successfully!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Frontend:  http://localhost:8080" -ForegroundColor Cyan
Write-Host "🔌 Backend:   http://localhost:3000" -ForegroundColor Cyan
Write-Host "📡 API Proxy: http://localhost:8080/api" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Useful Commands:" -ForegroundColor Yellow
Write-Host "   View logs:     docker-compose logs -f" -ForegroundColor Gray
Write-Host "   Stop services: .\start-dev.ps1 -Down" -ForegroundColor Gray
Write-Host "   Rebuild:       .\start-dev.ps1 -Build" -ForegroundColor Gray
Write-Host ""

# Show container status
Write-Host "📊 Container Status:" -ForegroundColor Yellow
docker-compose ps

Write-Host ""
Write-Host "💡 Tip: Press Ctrl+C to view logs in real-time" -ForegroundColor Yellow
Write-Host ""

# Ask if user wants to see logs
$viewLogs = Read-Host "View live logs now? (y/n)"
if ($viewLogs -eq "y") {
    Write-Host ""
    Write-Host "Showing logs (press Ctrl+C to exit)..." -ForegroundColor Yellow
    docker-compose logs -f
}

