"use client"

import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const savedTheme = localStorage.getItem("theme")
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    const initialDark = savedTheme === "dark" || (!savedTheme && systemPrefersDark)

    setIsDark(initialDark)
    document.documentElement.classList.toggle("dark", initialDark)

    console.log("[v0] Theme toggle initialized - isDark:", initialDark)
  }, [])

  const handleToggle = () => {
    console.log("[v0] Theme toggle clicked, current isDark:", isDark)
    const newIsDark = !isDark

    setIsDark(newIsDark)
    document.documentElement.classList.toggle("dark", newIsDark)
    localStorage.setItem("theme", newIsDark ? "dark" : "light")

    console.log("[v0] Theme toggled to:", newIsDark ? "dark" : "light")
  }

  if (!mounted) {
    return (
      <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
        <Sun className="h-4 w-4" />
      </Button>
    )
  }

  console.log("[v0] ThemeToggle render - mounted:", mounted, "isDark:", isDark)

  return (
    <Button size="sm" variant="ghost" onClick={handleToggle} className="h-8 w-8 p-0">
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
