'use client'

import { FormEvent, useState } from 'react'

import { PasswordInput } from '@/components/password-input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

type Provider = 'github' | 'google'

function ProviderSettings({ provider, title, description }: { provider: Provider; title: string; description: string }) {
  const [enabled, setEnabled] = useState(false)
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [message, setMessage] = useState('')

  async function save(event: FormEvent) {
    event.preventDefault()
    setMessage('')
    const response = await fetch('/api/admin/oauth', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ provider, enabled, clientId, clientSecret }) })
    const payload = await response.json().catch(() => null)
    setMessage(response.ok ? `${title} settings saved.` : payload?.error || 'Unable to save settings.')
  }

  return <form onSubmit={save}><Card><CardHeader><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription><CardAction><Badge variant={enabled ? 'secondary' : 'outline'}>{enabled ? 'Enabled' : 'Disabled'}</Badge></CardAction></CardHeader><CardContent><FieldGroup><Field><div className="flex items-center justify-between gap-4"><div><FieldLabel htmlFor={`${provider}-enabled`}>Enable {title}</FieldLabel><p className="text-sm text-muted-foreground">Allow users to sign in with this provider.</p></div><Switch id={`${provider}-enabled`} checked={enabled} onCheckedChange={setEnabled} aria-label={`Enable ${title}`} /></div></Field><Field><FieldLabel htmlFor={`${provider}-client-id`}>Client ID</FieldLabel><Input id={`${provider}-client-id`} value={clientId} onChange={(event) => setClientId(event.target.value)} required /></Field><Field><FieldLabel htmlFor={`${provider}-client-secret`}>Client secret</FieldLabel><PasswordInput id={`${provider}-client-secret`} value={clientSecret} onChange={(event) => setClientSecret(event.target.value)} required /></Field></FieldGroup></CardContent><CardFooter className="flex-col items-stretch gap-2"><Button type="submit">Save {title}</Button>{message && <FieldError aria-live="polite">{message}</FieldError>}</CardFooter></Card></form>
}

export function AdminSettings() {
  return <main className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 lg:px-10"><div className="flex flex-col gap-6"><section className="border-b pb-6"><p className="text-xs font-medium tracking-[0.18em] text-muted-foreground">CONFIGURATION</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Settings</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Manage sign-in providers and administration safeguards in clearly separated sections.</p></section><section id="identity-providers" className="flex flex-col gap-4"><div className="flex items-end justify-between gap-4"><div><h2 className="text-xl font-semibold tracking-tight">Identity providers</h2><p className="mt-1 text-sm text-muted-foreground">Configure GitHub and Google independently.</p></div><Badge variant="outline">OAuth</Badge></div><div className="grid gap-4 lg:grid-cols-2"><ProviderSettings provider="github" title="GitHub" description="Callback URL: /api/auth/oauth/github/callback" /><ProviderSettings provider="google" title="Google" description="Callback URL: /api/auth/oauth/google/callback" /></div></section><section id="access-controls"><Card><CardHeader><CardTitle>Access controls</CardTitle><CardDescription>Account status and active sessions are managed from Users & access.</CardDescription></CardHeader><CardContent className="text-sm text-muted-foreground">Suspending or banning a user blocks sign-in. Force logout revokes their server-side session immediately.</CardContent></Card></section><section id="audit-trail"><Card><CardHeader><CardTitle>Audit trail</CardTitle><CardDescription>Admin actions are retained for accountability.</CardDescription></CardHeader><CardContent className="text-sm text-muted-foreground">Role, status, session, deletion, and OAuth provider changes are written to the audit log.</CardContent></Card></section></div></main>
}
