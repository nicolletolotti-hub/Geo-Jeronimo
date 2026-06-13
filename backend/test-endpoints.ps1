param([int]$Duration = 60)

$bp = "C:\Users\User\OneDrive\READET~1\GEOJER~1\backend"
$job = Start-Job -ScriptBlock {
    param($p)
    Set-Location -LiteralPath $p
    node src/server.js 2>&1
} -ArgumentList $bp

Start-Sleep -Seconds 8

Write-Output "=== Testing endpoints ==="

# Health
try {
    $health = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method Get -ErrorAction Stop
    Write-Output "Health: OK"
} catch {
    Write-Output "Health FAILED: $($_.Exception.Message)"
    Write-Output "Server job output: $(Receive-Job -Id $job.Id -ErrorAction SilentlyContinue)"
    Write-Output "Server job state: $((Get-Job -Id $job.Id -ErrorAction SilentlyContinue).State)"
    exit 1
}

# Login
try {
    $body = @{ email = "admin@geojeronimo.com"; password = "SuaSenha123" } | ConvertTo-Json
    $login = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method Post -Body $body -ContentType "application/json" -ErrorAction Stop
    $token = $login.token
    Write-Output "Login: OK (token: $($token.Substring(0,20))...)"
} catch [System.Net.WebException] {
    $status = $_.Exception.Response.StatusCode.value__
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $body = $reader.ReadToEnd()
    Write-Output "Login FAILED: $status - $body"
    Write-Output "Server job output: $(Receive-Job -Id $job.Id -ErrorAction SilentlyContinue)"
    exit 1
} catch {
    Write-Output "Login FAILED: $($_.Exception.Message)"
    exit 1
}

# Residence /all
Write-Output "--- Testing Residence /all ---"
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/residence/all" -Method Get -Headers @{ Authorization = "Bearer $token" } -UseBasicParsing -ErrorAction Stop
    Write-Output "Residence /all: $($response.StatusCode) - $($response.Content)"
} catch {
    Write-Output "Residence /all EXCEPTION: $($_.Exception.Message)"
    Write-Output "Exception type: $($_.Exception.GetType().FullName)"
    if ($_.Exception.Response) {
        Write-Output "Status: $($_.Exception.Response.StatusCode.value__)"
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            Write-Output "Body: $($reader.ReadToEnd())"
        } catch { Write-Output "Could not read body" }
    }
}
Write-Output "Server alive after /all: $(Invoke-RestMethod -Uri 'http://localhost:5000/api/health' -Method Get -ErrorAction SilentlyContinue | Select-Object -ExpandProperty status)"

# Residence POST (create)
Write-Output "--- Testing Residence POST ---"
try {
    $resBody = @{
        address = "Rua Teste 123"
        neighborhood = "Centro"
        residents = 3
        comorbidities = ""
        hasElderly = $true
        hasChildren = $false
        hasPregnant = $false
        hasDisabled = $false
        pets = "Nao"
        evacuationLogistics = "boat"
        shelterPlan = "sim"
        preventiveAid = ""
        floodLevel = 8
        evacuationLevel = 7
        latitude = -29.95
        longitude = -51.72
    } | ConvertTo-Json
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/residence" -Method Post -Body $resBody -ContentType "application/json" -Headers @{ Authorization = "Bearer $token" } -UseBasicParsing -ErrorAction Stop
    Write-Output "Residence POST: $($response.StatusCode) - $($response.Content)"
} catch {
    Write-Output "Residence POST EXCEPTION: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        Write-Output "Status: $($_.Exception.Response.StatusCode.value__)"
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            Write-Output "Body: $($reader.ReadToEnd())"
        } catch { Write-Output "Could not read body" }
    }
}

Write-Output "=== Error log ==="
if (Test-Path "server-error.log") { Get-Content "server-error.log" -Tail 20 }
Write-Output "=== Tests complete ==="
Write-Output "Server job state: $(Get-Job -Id $job.Id -ErrorAction SilentlyContinue | Select-Object -ExpandProperty State)"
