param(
  [Parameter(Position = 0)]
  [int]$Port = 3000
)

$ErrorActionPreference = "Stop"

Set-Location -LiteralPath $PSScriptRoot

Write-Host "LinguaAI dev startup" -ForegroundColor Cyan
Write-Host "Port: $Port"

$connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
$processIds = @($connections | Select-Object -ExpandProperty OwningProcess -Unique | Where-Object { $_ -gt 0 })

foreach ($processId in $processIds) {
  $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
  if ($process) {
    Write-Host "Stopping process $processId ($($process.ProcessName)) on port $Port..." -ForegroundColor Yellow
    Stop-Process -Id $processId -Force
  }
}

for ($i = 0; $i -lt 20; $i++) {
  $stillListening = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  if (-not $stillListening) {
    break
  }

  Start-Sleep -Milliseconds 250
}

$stillListening = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($stillListening) {
  throw "Port $Port is still occupied. Please close the process manually and retry."
}

Write-Host "Starting Next.js dev server on http://localhost:$Port ..." -ForegroundColor Green
npm run dev -- -p $Port
