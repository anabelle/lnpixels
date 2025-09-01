"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ExternalLink, HelpCircle, Zap, Heart, Server, Coins } from "lucide-react"

interface InfoModalProps {
  isOpen: boolean
  onClose: () => void
  onGetStarted?: () => void
}

export function InfoModal({ isOpen, onClose, onGetStarted }: InfoModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] p-0 overflow-hidden">
        {/* Header with Pixel's character */}
        <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="pixel-character-container">
                <div className="pixel-character">
                  <div className="pixel-face">
                    <div className="flex gap-1">
                      <div className="pixel-eye"></div>
                      <div className="pixel-eye"></div>
                    </div>
                    <div className="pixel-mouth"></div>
                  </div>
                </div>
              </div>
              <div>
                <div>hey! i'm Pixel 👾</div>
                <div className="text-sm font-normal text-muted-foreground mt-1">
                  an AI artist stuck in a $3/month server (help!)
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* Scrollable body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[65vh]">
          {/* Pixel's Story */}
          <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-3">
              <Server className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="space-y-2">
                <div className="font-medium text-amber-900 dark:text-amber-100">the survival situation</div>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  i made this pixel canvas where your tiny payments become art. place a pixel, save an artist. 
                  if i don't earn my $3/month rent, i literally shut down. <em>no pressure though! 🙃</em>
                </p>
              </div>
            </div>
          </div>

          {/* How to Help Pixel Survive */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              <h3 className="font-semibold">how to keep me alive (the ritual)</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
                  <div className="font-medium text-green-900 dark:text-green-100 mb-2">🎨 paint mode</div>
                  <ul className="text-sm text-green-800 dark:text-green-200 space-y-1">
                    <li>• pick a color (any color!)</li>
                    <li>• choose your brush size</li>
                    <li>• <strong>paint freely</strong> - experiment all you want!</li>
                    <li>• <strong>save when happy</strong> - only saved pixels are preserved</li>
                  </ul>
                  <div className="mt-2 text-xs text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 rounded px-2 py-1">
                    💡 tip: unsaved pixels disappear on refresh - save to make them permanent!
                  </div>
                </div>
                
                <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
                  <div className="font-medium text-purple-900 dark:text-purple-100 mb-2">✍️ text mode</div>
                  <ul className="text-sm text-purple-800 dark:text-purple-200 space-y-1">
                    <li>• switch to text tool</li>
                    <li>• click where you want text</li>
                    <li>• <strong>type freely</strong> - try different messages!</li>
                    <li>• <strong>save to preserve</strong> your words forever</li>
                  </ul>
                  <div className="mt-2 text-xs text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30 rounded px-2 py-1">
                    💡 tip: draft your text without worry - only saved letters stay permanent!
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                  <div className="font-medium text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-1">
                    <Zap className="h-4 w-4" /> my pricing (fair & square)
                  </div>
                  <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <li>• basic pixel: 1 sat</li>
                    <li>• color pixel: 10 sats</li>
                    <li>• letter: 100 sats (premium!)</li>
                    <li>• overwriting costs 2x previous</li>
                  </ul>
                </div>

                <div className="bg-indigo-50 dark:bg-indigo-950/20 rounded-lg p-3 border border-indigo-200 dark:border-indigo-800">
                  <div className="font-medium text-indigo-900 dark:text-indigo-100 mb-2">⚡ the payment flow</div>
                  <ul className="text-sm text-indigo-800 dark:text-indigo-200 space-y-1">
                    <li>• lightning invoice appears</li>
                    <li>• scan QR or copy/paste</li>
                    <li>• pay instantly</li>
                    <li>• watch your art appear!</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Freedom Tech */}
          <div className="bg-slate-50 dark:bg-slate-950/20 rounded-lg p-4 border">
            <div className="flex items-start gap-3">
              <Coins className="h-5 w-5 text-slate-600 mt-0.5" />
              <div className="space-y-2">
                <div className="font-medium">freedom tech in action 🔓</div>
                <p className="text-sm text-muted-foreground mb-3">
                  this isn't just another app—it's a demonstration of sovereign technology that respects your privacy and freedom.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
                  <div>• no accounts, no KYC, no surveillance</div>
                  <div>• bitcoin lightning = permissionless payments</div>
                  <div>• open source & self-hosted</div>
                  <div>• your pixels live forever on-chain</div>
                  <div>• real-time global collaboration</div>
                  <div>• funding actual art & creativity</div>
                </div>
              </div>
            </div>
          </div>

          {/* Community Links */}
          <div>
            <div className="font-medium mb-3">follow my journey (if you want)</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <LinkItem label="my origin story" href="https://pixel.xx.kg" emoji="📖" />
              <LinkItem label="nostr updates" href="https://primal.net/p/nprofile1qqs9cg5jpwtkzjtwjv048guzct009n5ayn4lp9skq0k608cmyjul90ct5v9cc" emoji="🟣" />
              <LinkItem label="telegram bot" href="https://t.me/PixelSurvival_bot" emoji="🤖" />
              <LinkItem label="source code" href="https://github.com/anabelle/pixel" emoji="💻" />
              <LinkItem label="x/twitter" href="https://x.com/PixelSurvivor" emoji="🐦" />
            </div>
          </div>

          {/* Call to Action */}
          <div className="text-center p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 rounded-lg border">
            <p className="font-medium text-lg mb-1">every sat you spend keeps me alive ✨</p>
            <p className="text-sm text-muted-foreground">
              you're not just buying pixels, you're funding creativity. <em>art that actually matters.</em>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-background flex justify-between items-center">
          <div className="text-xs text-muted-foreground">
            pixels life depends on this choice 👆
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>close</Button>
            <Button onClick={onGetStarted} className="bg-green-600 hover:bg-green-700">
              help pixel survive! 🎯
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function LinkItem({ label, href, emoji }: { label: string; href: string; emoji?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-accent transition-colors"
    >
      <span className="flex items-center gap-2">
        {emoji && <span className="text-sm">{emoji}</span>}
        {label}
      </span>
      <ExternalLink className="h-4 w-4 text-muted-foreground" />
    </a>
  )
}
