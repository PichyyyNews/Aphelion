"use client"

import { useState } from "react"
import { FaGithub } from "react-icons/fa"
import { FcGoogle } from "react-icons/fc"
import { CiMail } from "react-icons/ci"
import { useRouter } from "next/navigation"

import { AuthShell } from "@/components/auth-shell"
import { PasswordInput } from "@/components/password-input"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const router = useRouter()

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    })

    if (response.ok) router.push("/dashboard")
    else setError((await response.json()).error)
  }

  return (
    <AuthShell>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <a href="/" className="mb-5 flex w-full justify-center">
          <img className="size-14 dark:invert" src="/logo.svg" alt="Aphelion home" />
        </a>
        <div className="mb-6 text-center">
          <h1 className="text-balance text-3xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-2 text-pretty text-muted-foreground">Sign in to continue to your Aphelion account.</p>
        </div>
        <form onSubmit={submit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <div className="relative">
                <CiMail className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input id="email" type="email" autoComplete="email" className="pl-10" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
              </div>
            </Field>
            <Field data-invalid={!!error}>
              <div className="flex items-center justify-between gap-3">
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <a className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground" href="/login">Forgot password?</a>
              </div>
              <PasswordInput id="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required aria-invalid={!!error} />
              {error && <FieldError>{error}</FieldError>}
            </Field>
            <Button type="submit" className="w-full">Sign in</Button>
            <FieldSeparator className="-my-1 text-xs [&>[data-slot=separator]]:bg-border/60">or continue with</FieldSeparator>
            <div className="grid grid-cols-2 gap-3">
              <a className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border text-sm font-medium hover:bg-muted" href="/api/auth/oauth/github">
                <FaGithub aria-hidden="true" />
                GitHub
              </a>
              <a className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border text-sm font-medium hover:bg-muted" href="/api/auth/oauth/google">
                <FcGoogle aria-hidden="true" />
                Google
              </a>
            </div>
          </FieldGroup>
        </form>
        <p className="mt-8 text-center text-sm text-muted-foreground">New to Aphelion? <a className="font-medium text-foreground underline underline-offset-4" href="/register">Create your account</a></p>
      </div>
    </AuthShell>
  )
}
