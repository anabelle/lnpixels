# Test the Payment Flow

## 1. Generate an invoice first
Write-Host "1. Generating invoice..." -ForegroundColor Yellow

$pixels = @(
    @{ x = 0; y = 0; color = "#ff0000"; letter = "A" },
    @{ x = 5; y = 10; color = "#00ff00" },
    @{ x = 15; y = 20; color = "#000000" }
)

$invoiceBody = @{ pixels = $pixels } | ConvertTo-Json -Depth 3

try {
    $invoiceResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/invoices/pixels" -Method POST -Body $invoiceBody -ContentType "application/json"
    Write-Host "✅ Invoice created:" -ForegroundColor Green
    Write-Host "  Payment ID: $($invoiceResponse.id)"
    Write-Host "  Amount: $($invoiceResponse.amount) sats"
    Write-Host "  Invoice: $($invoiceResponse.invoice)"
    
    # Store for payment simulation
    $paymentId = $invoiceResponse.id
    
    Write-Host "`n2. Simulating payment..." -ForegroundColor Yellow
    
    # Create pixel updates for payment simulation
    $pixelUpdates = @(
        @{ x = 0; y = 0; color = "#ff0000"; letter = "A"; price = 100 },
        @{ x = 5; y = 10; color = "#00ff00"; letter = $null; price = 10 },
        @{ x = 15; y = 20; color = "#000000"; letter = $null; price = 1 }
    )
    
    $paymentBody = @{
        paymentId = $paymentId
        pixelUpdates = $pixelUpdates
    } | ConvertTo-Json -Depth 3
    
    $paymentResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/test-payment" -Method POST -Body $paymentBody -ContentType "application/json"
    Write-Host "✅ Payment simulated:" -ForegroundColor Green
    Write-Host "  Payment ID: $($paymentResponse.paymentId)"
    Write-Host "  Pixels Updated: $($paymentResponse.pixelsUpdated)"
    
    Write-Host "`n🎉 Payment flow test completed successfully!" -ForegroundColor Green
    Write-Host "WebSocket events should have been emitted for pixel updates and payment confirmation." -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Test failed: $($_.Exception.Message)" -ForegroundColor Red
}
