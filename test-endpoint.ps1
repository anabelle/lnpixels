$body = @{
    pixels = @(
        @{
            x = 0
            y = 0
            color = "#ff0000"
            letter = "A"
        },
        @{
            x = 5
            y = 10
            color = "#00ff00"
        },
        @{
            x = 15
            y = 20
            color = "#000000"
        }
    )
} | ConvertTo-Json -Depth 3

Write-Host "Testing new /invoices/pixels endpoint..."
Write-Host "Payload: $body"

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/invoices/pixels" -Method POST -Body $body -ContentType "application/json"
    Write-Host "Response: $($response | ConvertTo-Json -Depth 3)"
    Write-Host "Expected amount: 111 sats (100 + 10 + 1)"
    Write-Host "Actual amount: $($response.amount) sats"
    if ($response.amount -eq 111) {
        Write-Host "✅ Test PASSED" -ForegroundColor Green
    } else {
        Write-Host "❌ Test FAILED" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Test FAILED: $($_.Exception.Message)" -ForegroundColor Red
}
