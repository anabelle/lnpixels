"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ExternalLink, HelpCircle, Zap } from "lucide-react"

interface InfoModalProps {
  isOpen: boolean
  onClose: () => void
  onGetStarted?: () => void
}

export function InfoModal({ isOpen, onClose, onGetStarted }: InfoModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] p-0 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              About LNPixels
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* Scrollable body */}
        <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh] sm:max-h-[65vh]">
          <p className="text-sm text-muted-foreground">
            LNPixels is a collaborative pixel canvas powered by the Lightning Network. Paint pixels, leave letters, and watch the
            global artwork evolve in real time.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg border p-3">
              <div className="font-medium mb-1">How it works</div>
              <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-1">
                <li>Pick a color and brush size</li>
                <li>Paint pixels or place a letter</li>
                <li>Click Save to purchase your changes</li>
                <li>Pay a Lightning invoice to finalize</li>
              </ul>
            </div>
            <div className="rounded-lg border p-3">
              <div className="font-medium mb-1">Pricing basics</div>
              <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-1">
                <li>
                  <span className="inline-flex items-center gap-1"><Zap className="h-3 w-3" /> Color: </span>
                  dynamic by area
                </li>
                <li>
                  <span className="inline-flex items-center gap-1"><Zap className="h-3 w-3" /> Letter: </span>
                  premium placement
                </li>
                <li>Invoices show exact sats before payment</li>
              </ul>
            </div>
          </div>

          <div>
            <div className="font-medium mb-2">Explore the ecosystem</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <LinkItem label="About Pixel" href="https://pixel.xx.kg" />
              <LinkItem label="Nostr Profile" href="https://primal.net/p/nprofile1qqs9cg5jpwtkzjtwjv048guzct009n5ayn4lp9skq0k608cmyjul90ct5v9cc" />
              <LinkItem label="Telegram Bot" href="https://t.me/PixelSurvival_bot" />
              <LinkItem label="GitHub Repo" href="https://github.com/anabelle/pixel" />
              <LinkItem label="X Profile" href="https://x.com/PixelSurvivor" />
            </div>
          </div>
        </div>

        {/* Footer pinned inside modal */}
        <div className="p-4 border-t bg-background flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button onClick={onGetStarted}>Get started</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function LinkItem({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-accent"
    >
      <span>{label}</span>
      <ExternalLink className="h-4 w-4 text-muted-foreground" />
    </a>
  )
}
