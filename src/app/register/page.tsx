"use client"

import { useState } from "react"
import { CiMail, CiUser } from "react-icons/ci"
import { useRouter } from "next/navigation"

import { AuthShell } from "@/components/auth-shell"
import { PasswordInput } from "@/components/password-input"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export default function Register() {
  const [form, setForm] = useState({ email: "", password: "", confirmPassword: "", name: "" })
  const [error, setError] = useState("")
  const router = useRouter()
  const passwordsMatch = form.confirmPassword === "" || form.password === form.confirmPassword
  const passwordScore = [
    form.password.length >= 8,
    /[a-z]/.test(form.password) && /[A-Z]/.test(form.password),
    /\d/.test(form.password),
    /[^A-Za-z0-9]/.test(form.password),
  ].filter(Boolean).length
  const passwordLevel = ["", "Weak", "Fair", "Good", "Strong"][passwordScore]

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!passwordsMatch) return
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: form.email, password: form.password, name: form.name }),
    })

    if (response.ok) router.push("/dashboard")
    else setError((await response.json()).error)
  }

  return (
    <AuthShell>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <a href="/" className="mb-3 flex w-full justify-center">
          <img className="size-12 dark:invert" src="/logo.svg" alt="Aphelion home" />
        </a>
        <div className="mb-4 text-center">
          <h1 className="text-balance text-3xl font-semibold tracking-tight">Create your account</h1>
          <p className="mt-2 text-pretty text-muted-foreground">Set up your secure Aphelion identity.</p>
        </div>
        <form onSubmit={submit}>
          <FieldGroup className="gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="name">Name</FieldLabel>
                <div className="relative">
                  <CiUser className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input id="name" autoComplete="name" className="pl-10" placeholder="Your name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
                </div>
              </Field>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <div className="relative">
                  <CiMail className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input id="email" type="email" autoComplete="email" className="pl-10" placeholder="you@example.com" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
                </div>
              </Field>
            </div>
            <Field data-invalid={!!error}>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <PasswordInput id="password" autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required aria-invalid={!!error} />
              {form.password && (
                <div className="flex items-center gap-2" aria-live="polite">
                  <div className="grid flex-1 grid-cols-4 gap-1" aria-hidden="true">
                    {[1, 2, 3, 4].map((step) => <span key={step} className={step <= passwordScore ? "h-1 rounded-full bg-foreground" : "h-1 rounded-full bg-muted"} />)}
                  </div>
                  <span className="w-10 text-right text-xs text-muted-foreground">{passwordLevel}</span>
                </div>
              )}
              {error && <FieldError>{error}</FieldError>}
            </Field>
            <Field data-invalid={!passwordsMatch}>
              <FieldLabel htmlFor="confirm-password">Confirm password</FieldLabel>
              <PasswordInput id="confirm-password" autoComplete="new-password" value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} required aria-invalid={!passwordsMatch} />
              {!passwordsMatch && <FieldError>Passwords do not match</FieldError>}
            </Field>
            <Button type="submit" className="w-full" disabled={!passwordsMatch}>Create account</Button>
          </FieldGroup>
        </form>
        <p className="mt-5 text-center text-sm text-muted-foreground">Already have an account? <a className="font-medium text-foreground underline underline-offset-4" href="/login">Sign in</a></p>
      </div>
    </AuthShell>
  )
}
