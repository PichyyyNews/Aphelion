"use client"

import { useEffect, useState } from "react"
import { CiDark, CiLight } from "react-icons/ci"

import { cn } from "@/lib/utils"

function getSystemTheme() {
  if (typeof window === "undefined") return "light"

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

export function ThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme")
    const theme = savedTheme === "dark" || savedTheme === "light" ? savedTheme : getSystemTheme()

    document.documentElement.classList.toggle("dark", theme === "dark")
    setDark(theme === "dark")
  }, [])

  function onThemeChange(enabled: boolean) {
    document.documentElement.classList.toggle("dark", enabled)
    localStorage.setItem("theme", enabled ? "dark" : "light")
    setDark(enabled)
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      className="relative inline-flex h-9 w-[4.5rem] items-center rounded-full border bg-muted p-1 text-muted-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      onClick={() => onThemeChange(!dark)}
    >
      <CiLight className="absolute left-2 size-4" aria-hidden="true" />
      <CiDark className="absolute right-2 size-4" aria-hidden="true" />
      <span
        className={cn(
          "relative z-10 flex size-7 items-center justify-center rounded-full bg-background text-foreground shadow-sm transition-transform duration-200 ease-out",
          dark ? "translate-x-9" : "translate-x-0"
        )}
      >
        {dark ? <CiDark aria-hidden="true" /> : <CiLight aria-hidden="true" />}
      </span>
    </button>
  )
}
