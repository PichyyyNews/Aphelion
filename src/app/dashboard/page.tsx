import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function Dashboard(){const u=await getUser();if(!u)redirect('/login');return <main className="mx-auto max-w-5xl px-5 py-16 sm:px-8"><Card><CardHeader><p className="text-xs font-medium tracking-[0.18em] text-muted-foreground">DASHBOARD</p><CardTitle>Welcome, {u.name||u.email}</CardTitle><CardDescription>Your Aphelion identity is active.</CardDescription></CardHeader><CardContent><dl className="grid gap-4 sm:grid-cols-2"><div className="rounded-lg border p-4"><dt className="text-sm text-muted-foreground">Account</dt><dd className="mt-1 font-medium">{u.email}</dd></div><div className="rounded-lg border p-4"><dt className="text-sm text-muted-foreground">Role</dt><dd className="mt-1 font-medium">{u.role}</dd></div></dl></CardContent></Card></main>}
