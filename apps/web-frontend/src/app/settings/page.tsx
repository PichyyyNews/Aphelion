import { redirect } from 'next/navigation'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getUser } from '@/lib/auth'

export default async function SettingsPage() {
  const user = await getUser()
  if (!user) redirect('/login')
  return <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8"><div className="flex flex-col gap-6"><section><p className="text-xs font-medium tracking-[0.18em] text-muted-foreground">PREFERENCES</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Settings</h1><p className="mt-2 text-sm text-muted-foreground">Control your personal Aphelion workspace preferences.</p></section><Card><CardHeader><CardTitle>Appearance</CardTitle><CardDescription>Use the Dark mode option in your account menu to switch themes.</CardDescription></CardHeader><CardContent className="text-sm text-muted-foreground">Theme preference is saved in this browser.</CardContent></Card></div></main>
}
