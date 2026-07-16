'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'

import { PasswordInput } from '@/components/password-input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'

export function AdminUnlock() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    const response = await fetch('/api/admin/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password }) })
    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      setError(payload?.error || 'Unable to unlock the admin panel')
      return
    }
    router.refresh()
  }

  return <main className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-md items-center px-5 py-12">
    <form className="w-full" onSubmit={submit}>
      <Card>
        <CardHeader>
          <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground">ADMIN ACCESS</p>
          <CardTitle>Unlock control panel</CardTitle>
          <CardDescription>Enter the separate admin access password configured on this server.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={Boolean(error)}>
              <FieldLabel htmlFor="admin-access-password">Admin access password</FieldLabel>
              <PasswordInput id="admin-access-password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" aria-invalid={Boolean(error)} aria-describedby={error ? 'admin-access-error' : undefined} required />
              {error && <FieldError id="admin-access-error" aria-live="polite">{error}</FieldError>}
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter><Button type="submit" className="w-full">Unlock admin</Button></CardFooter>
      </Card>
    </form>
  </main>
}
