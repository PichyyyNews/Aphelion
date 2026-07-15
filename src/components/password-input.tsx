"use client"

import { useState } from "react"
import { CiLock } from "react-icons/ci"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export function PasswordInput({ className, ...props }: React.ComponentProps<typeof Input>) {
  const [shown, setShown] = useState(false)

  return (
    <div className="relative">
      <CiLock
        className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        {...props}
        type={shown ? "text" : "password"}
        className={cn("pr-16 pl-10", className)}
      />
      <Button
        type="button"
        variant="ghost"
        size="xs"
        className="absolute top-1/2 right-1 -translate-y-1/2"
        aria-label={shown ? "Hide password" : "Show password"}
        onClick={() => setShown(!shown)}
      >
        {shown ? "Hide" : "Show"}
      </Button>
    </div>
  )
}
