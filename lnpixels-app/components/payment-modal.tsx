"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Zap, Copy, CheckCircle } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"

interface PixelData {
  x: number
  y: number
  color: string
  letter?: string
}

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  pixelData: PixelData | null
}

interface Invoice {
  invoice: string
  payment_hash: string
  amount: number
  id: string
  isMock: boolean
}

export function PaymentModal({ isOpen, onClose, pixelData }: PaymentModalProps) {
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [letter, setLetter] = useState("")
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [paid, setPaid] = useState(false)

  useEffect(() => {
    if (isOpen && pixelData) {
      createInvoice()
    }
  }, [isOpen, pixelData])

  const createInvoice = async () => {
    if (!pixelData) return

    setLoading(true)
    try {
      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          x: pixelData.x,
          y: pixelData.y,
          color: pixelData.color,
          letter: letter || undefined,
        }),
      })

      const data = await response.json()
      setInvoice(data)
    } catch (error) {
      console.error("Failed to create invoice:", error)
    } finally {
      setLoading(false)
    }
  }

  const copyInvoice = async () => {
    if (!invoice) return

    try {
      await navigator.clipboard.writeText(invoice.invoice)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy invoice:", error)
    }
  }

  const handleClose = () => {
    setInvoice(null)
    setLetter("")
    setPaid(false)
    setCopied(false)
    onClose()
  }

  if (!pixelData) return null

  const calculatePrice = () => {
    const basePrice = letter ? 100 : 10 // 100 sats for letter, 10 for color only
    return basePrice
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-secondary" />
            Purchase Pixel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Pixel Preview */}
          <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
            <div
              className="w-12 h-12 rounded border-2 border-border flex items-center justify-center text-lg font-mono"
              style={{ backgroundColor: pixelData.color }}
            >
              {letter}
            </div>
            <div>
              <div className="font-medium">
                Pixel ({pixelData.x}, {pixelData.y})
              </div>
              <div className="text-sm text-muted-foreground">Color: {pixelData.color}</div>
            </div>
          </div>

          {/* Letter Input */}
          <div className="space-y-2">
            <Label htmlFor="letter">Letter (optional)</Label>
            <Input
              id="letter"
              value={letter}
              onChange={(e) => setLetter(e.target.value.slice(0, 1).toUpperCase())}
              placeholder="A-Z, 0-9"
              maxLength={1}
            />
          </div>

          {/* Price */}
          <div className="flex items-center justify-between p-3 bg-secondary/10 rounded-lg">
            <span className="font-medium">Price:</span>
            <div className="flex items-center gap-1 text-lg font-bold text-secondary">
              <Zap className="h-4 w-4" />
              {calculatePrice()} sats
            </div>
          </div>

          {/* Invoice */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : invoice ? (
            <div className="space-y-4">
              {/* QR Code */}
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <QRCodeSVG value={invoice.invoice} size={200} />
              </div>

              {/* Invoice String */}
              <div className="space-y-2">
                <Label>Lightning Invoice</Label>
                <div className="flex gap-2">
                  <Input value={invoice.invoice} readOnly className="font-mono text-xs" />
                  <Button variant="outline" size="sm" onClick={copyInvoice} className="flex-shrink-0 bg-transparent">
                    {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {invoice.isMock && (
                <div className="text-xs text-muted-foreground text-center">This is a mock invoice for development</div>
              )}
            </div>
          ) : (
            <Button onClick={createInvoice} className="w-full">
              Create Invoice
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
