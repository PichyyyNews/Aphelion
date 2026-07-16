import { redirect } from 'next/navigation'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getUser } from '@/lib/auth'

export default async function HelpPage() {
  const user = await getUser()
  if (!user) redirect('/login')
  return <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8"><div className="flex flex-col gap-6"><section><p className="text-xs font-medium tracking-[0.18em] text-muted-foreground">SUPPORT</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Help center</h1><p className="mt-2 text-sm text-muted-foreground">Quick guidance for your Aphelion identity.</p></section><Card><CardHeader><CardTitle>Need help signing in?</CardTitle><CardDescription>Use Forgot password on the sign-in page, or contact your workspace administrator.</CardDescription></CardHeader><CardContent className="text-sm text-muted-foreground">For account access issues, include the email address associated with your Aphelion account.</CardContent></Card></div></main>
}
