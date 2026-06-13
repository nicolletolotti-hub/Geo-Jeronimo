$process = Start-Process -NoNewWindow -FilePath "node" -ArgumentList "src/server.js" -PassThru
Write-Output "Server started with PID: $($process.Id)"
