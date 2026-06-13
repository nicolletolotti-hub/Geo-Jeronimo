$startInfo = New-Object System.Diagnostics.ProcessStartInfo
$startInfo.FileName = "node.exe"
$startInfo.Arguments = "src/server.js"
$startInfo.WorkingDirectory = "C:\Users\User\OneDrive\Área de Trabalho\geojeronimov10\backend"
$startInfo.UseShellExecute = $true
$startInfo.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Minimized
$startInfo.CreateNoWindow = $false
$startInfo.RedirectStandardOutput = $false
$startInfo.RedirectStandardError = $false

$process = [System.Diagnostics.Process]::Start($startInfo)
Write-Output "Server started with PID: $($process.Id)"
