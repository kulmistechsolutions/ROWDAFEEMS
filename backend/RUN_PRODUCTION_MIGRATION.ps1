# PowerShell script to run migration on production database from local machine
# For Render Free Plan users (no Shell access)

Write-Host "🚀 Production Migration Helper (Free Render Plan)" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script will help you run the migration on production database." -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠️  IMPORTANT: You need the production DATABASE_URL from Render Dashboard" -ForegroundColor Red
Write-Host "   1. Go to: https://dashboard.render.com" -ForegroundColor White
Write-Host "   2. Click: bakend-rowdafeems → Environment tab" -ForegroundColor White
Write-Host "   3. Copy the DATABASE_URL value" -ForegroundColor White
Write-Host ""

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "❌ .env file not found!" -ForegroundColor Red
    exit 1
}

# Backup current .env if backup doesn't exist
if (-not (Test-Path ".env.local.backup")) {
    Copy-Item ".env" ".env.local.backup"
    Write-Host "✅ Backed up current .env to .env.local.backup" -ForegroundColor Green
} else {
    Write-Host "ℹ️  .env.local.backup already exists" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📝 Step 1: Enter Production DATABASE_URL from Render Dashboard" -ForegroundColor Cyan
Write-Host "   (The URL should start with: postgresql://...)" -ForegroundColor Gray
Write-Host ""

$productionUrl = Read-Host "Enter Production DATABASE_URL"

if ([string]::IsNullOrWhiteSpace($productionUrl)) {
    Write-Host "❌ DATABASE_URL cannot be empty!" -ForegroundColor Red
    exit 1
}

if (-not $productionUrl.StartsWith("postgresql://")) {
    Write-Host "⚠️  Warning: DATABASE_URL doesn't look like a PostgreSQL URL" -ForegroundColor Yellow
    $confirm = Read-Host "Continue anyway? (y/n)"
    if ($confirm -ne "y") {
        exit 1
    }
}

# Read current .env
$envContent = Get-Content ".env"

# Replace DATABASE_URL line
$newContent = $envContent | ForEach-Object {
    if ($_ -match "^DATABASE_URL=") {
        "DATABASE_URL=$productionUrl"
    } else {
        $_
    }
}

# Write updated content
$newContent | Set-Content ".env"

Write-Host ""
Write-Host "✅ Updated DATABASE_URL in .env" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Step 2: Running migration on production database..." -ForegroundColor Cyan
Write-Host ""

# Run migration
node scripts/run-migration-branch.js

$migrationSuccess = $LASTEXITCODE -eq 0

if ($migrationSuccess) {
    Write-Host ""
    Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🔍 Step 3: Verifying migration..." -ForegroundColor Cyan
    Write-Host ""
    
    node scripts/verify-branch-migration.js
    
    Write-Host ""
    Write-Host "🔄 Step 4: Restoring local .env..." -ForegroundColor Cyan
    Write-Host ""
    
    # Restore local .env
    if (Test-Path ".env.local.backup") {
        Copy-Item ".env.local.backup" ".env" -Force
        Write-Host "✅ Local .env restored" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "🎉 All done!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Summary:" -ForegroundColor Cyan
    Write-Host "   ✅ Migration applied to production database" -ForegroundColor Green
    Write-Host "   ✅ Local .env restored to original database" -ForegroundColor Green
    Write-Host ""
    Write-Host "   Next: Check your production app - the error should be gone!" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "❌ Migration failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔄 Restoring local .env..." -ForegroundColor Yellow
    
    # Restore local .env even if migration failed
    if (Test-Path ".env.local.backup") {
        Copy-Item ".env.local.backup" ".env" -Force
        Write-Host "✅ Local .env restored" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "💡 Tips:" -ForegroundColor Yellow
    Write-Host "   - Check that the DATABASE_URL is correct" -ForegroundColor White
    Write-Host "   - Verify the database allows connections from your IP" -ForegroundColor White
    Write-Host "   - Check Render logs for any database connection issues" -ForegroundColor White
    
    exit 1
}

