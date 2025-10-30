param(
    [Parameter(Mandatory=$true)][string]$StoreId,
    [string]$SecretsFile = "secrets-generated.json"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $SecretsFile)) {
    Write-Host "Secrets file not found: $SecretsFile" -ForegroundColor Yellow
    exit 1
}

try {
    $json = Get-Content -Raw $SecretsFile | ConvertFrom-Json
} catch {
    Write-Host ("Failed to read {0}: {1}" -f $SecretsFile, $_.Exception.Message) -ForegroundColor Red
    exit 1
}

$props = $json.PSObject.Properties

foreach ($p in $props) {
    $name = $p.Name
    $val = [string]$p.Value
    Write-Host "Putting secret '$name' into store $StoreId..." -ForegroundColor Cyan
    wrangler secrets-store secret create $StoreId --name $name --value $val --scopes "workers" --remote | Out-Host
}

Write-Host "All secrets pushed to store $StoreId" -ForegroundColor Green
