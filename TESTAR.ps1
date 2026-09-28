$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
& "$PSScriptRoot\TESTAR_V1_2_10.ps1"
exit $LASTEXITCODE
