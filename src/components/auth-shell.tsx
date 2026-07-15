import type { ReactNode } from "react"

import { AuthGlobe } from "@/components/auth-globe"
import { Card } from "@/components/ui/card"

type AuthShellProps = {
  children: ReactNode
}

export function AuthShell({ children }: AuthShellProps) {
  return (
    <main className="flex min-h-[calc(100dvh-4rem)] items-center justify-center px-4 py-4 sm:px-6 lg:h-[calc(100dvh-4rem)] lg:py-4">
      <Card className="w-full max-w-6xl overflow-hidden border bg-card py-0 shadow-sm lg:h-full lg:grid lg:grid-cols-[minmax(0,0.95fr)_minmax(26rem,1.05fr)]">
        <div
          className="hidden h-full border-r bg-muted/45 p-8 lg:block"
          aria-hidden="true"
        >
          <AuthGlobe />
        </div>
        <div className="flex flex-col px-6 py-5 sm:px-10 sm:py-6 lg:h-full">
          {children}
        </div>
      </Card>
    </main>
  )
}
