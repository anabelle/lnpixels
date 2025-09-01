"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { QrCode, Copy, Check, Zap, CheckCircle } from "lucide-react"
import QRCode from "react-qr-code"
import { usePixelStore } from "@/hooks/use-pixel-store"

interface SaveModalProps {
  isOpen: boolean
  onClose: () => void
  totalPixels: number
  totalCost: number
}

export function SaveModal({ isOpen, onClose, totalPixels, totalCost }: SaveModalProps) {
  const [invoice, setInvoice] = useState<string>("")
  const [qrCode, setQrCode] = useState<string>("")
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentId, setPaymentId] = useState<string>("")
  const [pixelUpdates, setPixelUpdates] = useState<any[]>([])
  const [quoteId, setQuoteId] = useState<string>("")
  const [paymentConfirmed, setPaymentConfirmed] = useState(false)
  const { pixels, clearCanvas, getNewPixels, markNewPixelsAsExisting } = usePixelStore()

  // Check if we're in development mode
  const isDev = process.env.NODE_ENV === 'development'

  // Listen for payment confirmations
  useEffect(() => {
    if (!isOpen) return

    const handlePaymentConfirmed = (event: CustomEvent) => {
      console.log('Payment confirmed:', event.detail)
      if (event.detail.paymentId === paymentId) {
        setPaymentConfirmed(true)
        // Mark the new pixels as existing since they've been paid for
        markNewPixelsAsExisting()
        // Auto-close modal after 2 seconds (keep pixels on canvas)
        setTimeout(() => {
          // Don't clear the canvas - pixels should remain visible after purchase
          onClose()
          // Reset modal states only
          setInvoice("")
          setPaymentId("")
          setPixelUpdates([])
          setQuoteId("")
          setPaymentConfirmed(false)
          setError(null)
        }, 2000)
      }
    }

    // Listen for payment confirmations via window events (from WebSocket hook)
    window.addEventListener('payment.confirmed', handlePaymentConfirmed as EventListener)

    return () => {
      window.removeEventListener('payment.confirmed', handlePaymentConfirmed as EventListener)
    }
  }, [isOpen, paymentId, clearCanvas, onClose])

  // Helper function to simulate payment (dev only)
  const simulatePayment = async () => {
    // In dev, allow simulation if we have a paymentId and either a quoteId or pixelUpdates
    if (!paymentId || (!quoteId && !pixelUpdates.length)) return

    try {
      const response = await fetch('http://localhost:3000/api/test-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          quoteId
            ? { paymentId, quoteId }
            : { paymentId, pixelUpdates }
        ),
      })

      if (!response.ok) {
        throw new Error('Failed to simulate payment')
      }

      const result = await response.json()
      console.log('Payment simulation result:', result)
    } catch (error) {
      console.error('Failed to simulate payment:', error)
      setError('Failed to simulate payment')
    }
  }

  // Calculate pricing breakdown only for new pixels
  const newPixels = getNewPixels()
  const pricingBreakdown = newPixels.map((pixel) => {
    // Calculate base pixel type price
    let basePrice: number
    let pixelType: string
    if (pixel.letter) {
      basePrice = 100
      pixelType = "Letter"
    } else if (pixel.color === "#000000") {
      basePrice = 1
      pixelType = "Black"
    } else {
      basePrice = 10
      pixelType = "Color"
    }

    // Calculate actual cost (including overwrite rule)
    let actualCost = basePrice
    let isOverwrite = false
    if (pixel.sats) {
      const overwritePrice = Math.round(pixel.sats * 2)
      if (overwritePrice > basePrice) {
        actualCost = overwritePrice
        isOverwrite = true
      }
    }

    return {
      x: pixel.x,
      y: pixel.y,
      pixelType,
      basePrice,
      actualCost,
      isOverwrite,
      lastSoldAmount: pixel.sats ? Math.round(pixel.sats) : pixel.sats,
      color: pixel.color,
      letter: pixel.letter,
    }
  })

  // Group pixels by type and cost for cleaner display
  const groupedPixels = pricingBreakdown.reduce(
    (groups, pixel) => {
      const key = `${pixel.pixelType}-${pixel.actualCost}-${pixel.isOverwrite ? "overwrite" : "new"}`
      if (!groups[key]) {
        groups[key] = {
          pixelType: pixel.pixelType,
          actualCost: pixel.actualCost,
          isOverwrite: pixel.isOverwrite,
          count: 0,
          pixels: [],
          color: pixel.color,
          letter: pixel.letter,
        }
      }
      groups[key].count++
      groups[key].pixels.push(pixel)
      return groups
    },
    {} as Record<string, any>,
  )

  const summary = pricingBreakdown.reduce(
    (acc, item) => {
      acc.totalCost += item.actualCost
      acc.newPixels += item.isOverwrite ? 0 : 1
      acc.overwritePixels += item.isOverwrite ? 1 : 0
      return acc
    },
    { totalCost: 0, newPixels: 0, overwritePixels: 0 },
  )

  const generateInvoice = async () => {
    setLoading(true)
    setError(null)
    try {
      console.log('Generating invoice for pixels:', newPixels.length);
      
      // Use the new bulk pixels endpoint
      const requestBody = {
        pixels: newPixels.map(pixel => ({
          x: pixel.x,
          y: pixel.y,
          color: pixel.color,
          letter: pixel.letter,
        }))
      };
      console.log('Request body:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch('http://localhost:3000/api/invoices/pixels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', response.status, response.statusText);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          console.error('Server error response:', errorData);
          errorMessage = errorData?.error || errorMessage;
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
        }
        console.error('Invoice generation failed:', errorMessage);
        throw new Error(errorMessage);
      }

      const invoiceData = await response.json();
      console.log('Invoice generated successfully:', invoiceData);

      setInvoice(invoiceData.invoice);
      setPaymentId(invoiceData.id);
  if (invoiceData.quoteId) setQuoteId(invoiceData.quoteId);
      
      // Store pixel updates for payment simulation with individual pixel prices
      const updates = newPixels.map(pixel => {
        // Calculate individual pixel price (same logic as in openSaveModal)
        let basePrice: number
        if (pixel.letter) {
          basePrice = 100 // Color + letter = 100 sats
        } else if (pixel.color === "#000000") {
          basePrice = 1 // Black pixel = 1 sat
        } else {
          basePrice = 10 // Color pixel = 10 sats
        }

        // Apply overwrite rule if pixel has purchase history
        let actualPrice = basePrice
        if (pixel.sats) {
          const overwritePrice = Math.round(pixel.sats * 2)
          actualPrice = Math.max(basePrice, overwritePrice)
        }

        return {
          x: pixel.x,
          y: pixel.y,
          color: pixel.color,
          letter: pixel.letter || null,
          price: Math.round(actualPrice) // Ensure integer satoshi values
        }
      });
      setPixelUpdates(updates);

  // Generate QR data for the Lightning invoice
  const qrCodeData = `lightning:${invoiceData.invoice}`
  setQrCode(qrCodeData)

    } catch (error) {
      console.error("Failed to generate invoice:", error)
      console.error("Error type:", typeof error)
      console.error("Error constructor:", error?.constructor?.name)
      
      let errorMessage = "Failed to generate invoice"
      
      if (error instanceof Error) {
        errorMessage = error.message
        console.log("Using Error.message:", errorMessage)
      } else if (typeof error === 'string') {
        errorMessage = error
        console.log("Using string error:", errorMessage)
      } else if (error && typeof error === 'object') {
        console.log("Error object keys:", Object.keys(error))
        // Try to extract a meaningful message
        if ('message' in error && typeof error.message === 'string') {
          errorMessage = error.message
          console.log("Using error.message:", errorMessage)
        } else if ('error' in error && typeof error.error === 'string') {
          errorMessage = error.error
          console.log("Using error.error:", errorMessage)
        } else {
          // Try to stringify for debugging
          try {
            const stringified = JSON.stringify(error, null, 2)
            console.log("Stringified error:", stringified)
            errorMessage = stringified.length > 200 ? stringified.substring(0, 200) + "..." : stringified
          } catch (stringifyError) {
            console.error("Failed to stringify error:", stringifyError)
            errorMessage = "Unknown error occurred"
          }
        }
      } else {
        console.log("Unexpected error type, using fallback")
      }
      
      setError(errorMessage)
      // Fallback to mock invoice if API fails
  const mockInvoice = `lnbc${totalCost}u1p...mock_invoice_for_${totalPixels}_pixels`
  setInvoice(mockInvoice)
  setQrCode(`lightning:${mockInvoice}`)
    } finally {
      setLoading(false)
    }
  }

  const copyInvoice = async () => {
    await navigator.clipboard.writeText(invoice)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Save Your Creation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card className="p-4">
            <div className="space-y-3">
              <div className="text-sm font-medium">Pricing Breakdown:</div>

              {/* Summary */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span>New pixels:</span>
                  <span>{summary.newPixels}</span>
                </div>
                <div className="flex justify-between">
                  <span>Overwrite pixels:</span>
                  <span>{summary.overwritePixels}</span>
                </div>
              </div>

              <div className="max-h-32 overflow-y-auto space-y-1">
                {Object.values(groupedPixels).map((group: any, index) => (
                  <div key={index} className="text-xs py-1 border-b border-muted/30">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm border" style={{ backgroundColor: group.color }} />
                        <span>
                          {group.pixelType} pixels × {group.count}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className={`font-mono ${group.isOverwrite ? "text-orange-600" : ""}`}>
                          {group.actualCost * group.count} sats
                        </div>
                        {group.count > 1 && (
                          <div className="text-[10px] text-muted-foreground">{group.actualCost} sats each</div>
                        )}
                      </div>
                    </div>
                    {group.isOverwrite && (
                      <div className="mt-1 ml-5 text-[10px] text-orange-600/80 italic">
                        Overwrite pricing: 2× last sold ({group.pixels[0].lastSoldAmount} sats) = {group.actualCost}{" "}
                        sats
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="border-t pt-2 flex justify-between font-medium">
                <span>Total Cost:</span>
                <span className="font-mono">{totalCost} sats</span>
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <div>• Base prices: Black (1 sat), Color (10 sats), Letter (100 sats)</div>
                <div>• Overwrite rule: Pay 2x last sold amount or base price, whichever is higher</div>
              </div>
            </div>
          </Card>

          {/* Payment Success State */}
          {paymentConfirmed && (
            <Card className="p-4 bg-green-50 border-green-200">
              <div className="flex items-center gap-3 text-green-800">
                <CheckCircle className="h-6 w-6" />
                <div>
                  <div className="font-semibold">Payment Confirmed!</div>
                  <div className="text-sm">Your pixels have been saved to the canvas.</div>
                </div>
              </div>
            </Card>
          )}

          {/* Error Display */}
          {error && !paymentConfirmed && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Generate Invoice */}
          {!invoice && !paymentConfirmed && (
            <>
              {newPixels.length === 0 ? (
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-muted-foreground">No new pixels to save. Draw some pixels first!</p>
                </div>
              ) : (
                <Button onClick={generateInvoice} disabled={loading} className="w-full">
                  {loading ? "Generating..." : "Generate Lightning Invoice"}
                </Button>
              )}
            </>
          )}

          {/* Invoice Display */}
          {invoice && !paymentConfirmed && (
            <Card className="p-4 space-y-4">
              <div className="text-center">
                <div className="w-48 h-48 mx-auto bg-white rounded-lg flex items-center justify-center p-2">
                  {qrCode ? (
                    <QRCode value={qrCode} size={176} style={{ height: '176px', width: '176px' }} />
                  ) : (
                    <QrCode className="h-24 w-24 text-muted-foreground" />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Lightning Invoice</Label>
                <div className="flex gap-2">
                  <Input value={invoice} readOnly className="font-mono text-xs" />
                  <Button size="sm" variant="outline" onClick={copyInvoice}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="text-xs text-muted-foreground text-center">
                Pay this invoice with your Lightning wallet. Payment will be automatically confirmed.
              </div>

              {/* Dev-only simulation button */}
              {isDev && (
                <div className="border-t pt-4">
                  <div className="text-xs text-orange-600 mb-2 text-center">
                    Development Mode - Simulate Payment
                  </div>
                  <Button 
                    onClick={simulatePayment} 
                    variant="outline" 
                    size="sm" 
                    className="w-full border-orange-200 text-orange-600 hover:bg-orange-50"
                  >
                    🧪 Simulate Payment (Dev Only)
                  </Button>
                </div>
              )}
            </Card>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent">
              {paymentConfirmed ? "Close" : "Cancel"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
