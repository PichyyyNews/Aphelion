import "./globals.css"
import type { ReactNode } from "react"
import Script from "next/script"

import { AppHeader } from "@/components/app-header"
import { ThemeToggle } from "@/components/theme-toggle"
import { getUser } from "@/lib/auth"

export const metadata = {
  title: "Aphelion",
  description: "Secure identity platform",
  icons: { icon: "/logo.svg" },
}

const setInitialTheme = `
  try {
    const savedTheme = localStorage.getItem("theme");
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.classList.toggle("dark", (savedTheme === "dark" || savedTheme === "light" ? savedTheme : systemTheme) === "dark");
  } catch {
    document.documentElement.classList.remove("dark");
  }
`

export default async function Layout({ children }: { children: ReactNode }) {
  const user = await getUser()
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Script id="set-initial-theme" strategy="beforeInteractive">{setInitialTheme}</Script>
        <div className="min-h-screen bg-background">
          {user ? <AppHeader user={{ name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl }} /> : <nav className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-muted px-5 sm:px-8"><a className="flex items-center gap-3 font-semibold tracking-tight" href="/"><img className="size-7 dark:invert" src="/logo.svg" alt="Aphelion" />Aphelion</a><ThemeToggle /></nav>}
          {children}
        </div>
      </body>
    </html>
  )
}
