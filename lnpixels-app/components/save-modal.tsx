"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { QrCode, Copy, Check, Zap } from "lucide-react"
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
  const { pixels } = usePixelStore()

  const pricingBreakdown = pixels.map((pixel) => {
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
    if (pixel.lastSoldAmount) {
      const overwritePrice = pixel.lastSoldAmount * 2
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
      lastSoldAmount: pixel.lastSoldAmount,
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
      // For now, we'll create individual invoices for each pixel
      // In the future, we could optimize this with bulk invoice creation
      const invoicePromises = pixels.map(async (pixel) => {
        try {
          const response = await fetch('http://localhost:3001/api/invoices', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              x: pixel.x,
              y: pixel.y,
              color: pixel.color,
              letter: pixel.letter,
            }),
          });

          if (!response.ok) {
            throw new Error(`Failed to create invoice for pixel (${pixel.x}, ${pixel.y})`);
          }

          return await response.json();
        } catch (error) {
          console.error(`Error creating invoice for pixel (${pixel.x}, ${pixel.y}):`, error);
          throw error;
        }
      });

      const invoiceResults = await Promise.allSettled(invoicePromises);

      // Check if all invoices were created successfully
      const failedInvoices = invoiceResults.filter(result => result.status === 'rejected');
      if (failedInvoices.length > 0) {
        throw new Error(`Failed to create ${failedInvoices.length} invoice(s)`);
      }

      // For simplicity, use the first invoice's data
      // In a real implementation, you might want to handle multiple invoices
      const firstInvoice = (invoiceResults[0] as PromiseFulfilledResult<any>).value;

      setInvoice(firstInvoice.invoice);

      // Generate a simple QR code placeholder (you might want to use a QR code library)
      const qrCodeData = `lightning:${firstInvoice.invoice}`;
      setQrCode(qrCodeData);

    } catch (error) {
      console.error("Failed to generate invoice:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to generate invoice"
      setError(errorMessage)
      // Fallback to mock invoice if API fails
      const mockInvoice = `lnbc${totalCost}u1p...mock_invoice_for_${totalPixels}_pixels`
      const mockQrCode = `data:image/svg+xml;base64,${btoa(`<svg>Mock QR Code for ${mockInvoice}</svg>`)}`

      setInvoice(mockInvoice)
      setQrCode(mockQrCode)
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

          {/* Error Display */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Generate Invoice */}
          {!invoice && (
            <Button onClick={generateInvoice} disabled={loading} className="w-full">
              {loading ? "Generating..." : "Generate Lightning Invoice"}
            </Button>
          )}

          {/* Invoice Display */}
          {invoice && (
            <Card className="p-4 space-y-4">
              <div className="text-center">
                <div className="w-48 h-48 mx-auto bg-muted rounded-lg flex items-center justify-center">
                  <QrCode className="h-24 w-24 text-muted-foreground" />
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
                Scan QR code or copy invoice to pay with your Lightning wallet
              </div>
            </Card>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent">
              Cancel
            </Button>
            {invoice && <Button className="flex-1">I've Paid</Button>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
