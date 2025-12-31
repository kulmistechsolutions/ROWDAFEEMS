# PowerShell script to update .env with production DATABASE_URL
# Run this script, then run the migration

Write-Host "🔧 Updating .env with Production DATABASE_URL" -ForegroundColor Cyan
Write-Host ""

# Production DATABASE_URL from Render
$productionUrl = "postgresql://neondb_owner:npg_4WfekCnjYB0y@ep-young-frog-ad81qczu-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "❌ .env file not found!" -ForegroundColor Red
    exit 1
}

# Backup current .env if backup doesn't exist
if (-not (Test-Path ".env.local.backup")) {
    Copy-Item ".env" ".env.local.backup"
    Write-Host "✅ Backed up current .env to .env.local.backup" -ForegroundColor Green
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

Write-Host "✅ Updated DATABASE_URL in .env" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next step: Run the migration:" -ForegroundColor Yellow
Write-Host "   node scripts/run-migration-branch.js" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  After migration, restore local .env with:" -ForegroundColor Yellow
Write-Host "   cp .env.local.backup .env" -ForegroundColor White
Write-Host ""

