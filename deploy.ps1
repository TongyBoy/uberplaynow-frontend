# Uber Arcade Frontend Deployment Script
# Deploys to AWS S3 + CloudFront

param(
    [Parameter(Mandatory=$false)]
    [string]$Environment = "production",
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-east-1",
    
    [Parameter(Mandatory=$true)]
    [string]$APIEndpoint
)

$ErrorActionPreference = "Stop"

Write-Host "🎮 Uber Arcade Frontend Deployment" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Green
Write-Host ""

# Get stack name
$StackName = "uber-arcade-frontend-$Environment"

# Check if API endpoint is set
if (-not $APIEndpoint) {
    Write-Host "❌ Error: API endpoint is required" -ForegroundColor Red
    Write-Host "Usage: .\deploy.ps1 -APIEndpoint https://api.uberarcade.com" -ForegroundColor Yellow
    exit 1
}

# Step 1: Update API endpoint in arcade-api.js
Write-Host "📝 Updating API endpoint in arcade-api.js..." -ForegroundColor Yellow
$apiJsPath = "js\arcade-api.js"
if (Test-Path $apiJsPath) {
    $content = Get-Content $apiJsPath -Raw
    $content = $content -replace "const API_BASE_URL = '.*?';", "const API_BASE_URL = '$APIEndpoint';"
    $content | Set-Content $apiJsPath -NoNewline
    Write-Host "✅ API endpoint updated to: $APIEndpoint" -ForegroundColor Green
} else {
    Write-Host "⚠️  Warning: arcade-api.js not found" -ForegroundColor Yellow
}
Write-Host ""

# Step 2: Deploy CloudFormation stack (if not exists)
Write-Host "☁️  Checking CloudFormation stack..." -ForegroundColor Yellow
aws cloudformation describe-stacks --stack-name $StackName --region $Region 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Creating new CloudFormation stack..." -ForegroundColor Cyan
    aws cloudformation create-stack `
        --stack-name $StackName `
        --template-body file://aws-cloudfront-s3.yml `
        --parameters ParameterKey=Environment,ParameterValue=$Environment `
                     ParameterKey=APIEndpoint,ParameterValue=$APIEndpoint `
        --region $Region
    
    Write-Host "  Waiting for stack creation to complete..." -ForegroundColor Cyan
    aws cloudformation wait stack-create-complete --stack-name $StackName --region $Region
    Write-Host "✅ Stack created successfully" -ForegroundColor Green
} else {
    Write-Host "✅ Stack already exists" -ForegroundColor Green
}
Write-Host ""

# Step 3: Get S3 bucket name from stack outputs
Write-Host "📦 Getting S3 bucket name..." -ForegroundColor Yellow
$BucketName = aws cloudformation describe-stacks `
    --stack-name $StackName `
    --query 'Stacks[0].Outputs[?OutputKey==`BucketName`].OutputValue' `
    --output text `
    --region $Region

if (-not $BucketName) {
    Write-Host "❌ Failed to get bucket name from stack" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Bucket: $BucketName" -ForegroundColor Green
Write-Host ""

# Step 4: Sync files to S3
Write-Host "⬆️  Uploading files to S3..." -ForegroundColor Yellow
aws s3 sync . s3://$BucketName `
    --delete `
    --exclude ".git/*" `
    --exclude ".gitignore" `
    --exclude "*.md" `
    --exclude "*.ps1" `
    --exclude "*.yml" `
    --exclude "nginx.conf" `
    --exclude "test-*" `
    --region $Region

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to upload files to S3" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Files uploaded successfully" -ForegroundColor Green
Write-Host ""

# Step 5: Get CloudFront distribution ID
Write-Host "🌐 Getting CloudFront distribution..." -ForegroundColor Yellow
$DistributionId = aws cloudformation describe-stacks `
    --stack-name $StackName `
    --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' `
    --output text `
    --region $Region

if ($DistributionId) {
    Write-Host "✅ Distribution ID: $DistributionId" -ForegroundColor Green
    
    # Step 6: Invalidate CloudFront cache
    Write-Host "🔄 Invalidating CloudFront cache..." -ForegroundColor Yellow
    $InvalidationId = aws cloudfront create-invalidation `
        --distribution-id $DistributionId `
        --paths "/*" `
        --query 'Invalidation.Id' `
        --output text
    
    Write-Host "✅ Cache invalidation created: $InvalidationId" -ForegroundColor Green
} else {
    Write-Host "⚠️  Could not get CloudFront distribution ID" -ForegroundColor Yellow
}
Write-Host ""

# Step 7: Get website URL
Write-Host "🌍 Getting website URL..." -ForegroundColor Yellow
$WebsiteURL = aws cloudformation describe-stacks `
    --stack-name $StackName `
    --query 'Stacks[0].Outputs[?OutputKey==`WebsiteURL`].OutputValue' `
    --output text `
    --region $Region

Write-Host ""
Write-Host "===================================" -ForegroundColor Green
Write-Host "✅ Deployment Complete!" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Website URL: $WebsiteURL" -ForegroundColor Cyan
Write-Host "📦 S3 Bucket: $BucketName" -ForegroundColor Cyan
Write-Host "🔗 API Endpoint: $APIEndpoint" -ForegroundColor Cyan
Write-Host ""
Write-Host "Note: CloudFront cache invalidation may take 5-10 minutes to complete." -ForegroundColor Yellow
Write-Host ""


