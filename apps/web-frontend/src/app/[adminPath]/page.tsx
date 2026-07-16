import { notFound } from 'next/navigation'
import { Prisma, Role, UserStatus } from '@prisma/client'

import { AdminUnlock } from '@/components/admin-unlock'
import { AdminShell } from '@/components/admin-shell'
import { AdminUserTable } from '@/components/admin-user-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getUser, hasAdminAccess } from '@/lib/auth'
import { db } from '@/lib/db'

const panelPath = process.env.ADMIN_PANEL_PATH || 'control-room'

export default async function AdminPanel({ params, searchParams }: { params: { adminPath: string }; searchParams: { q?: string; role?: string; status?: string; page?: string } }) {
  if (params.adminPath !== panelPath) notFound()
  const admin = await getUser()
  if (!admin || admin.role !== 'ADMIN') notFound()
  if (!(await hasAdminAccess(admin.id))) return <AdminUnlock />

  const q = searchParams.q?.trim() || ''
  const role: Role | undefined = searchParams.role === 'ADMIN' || searchParams.role === 'USER' ? searchParams.role : undefined
  const status: UserStatus | undefined = ['ACTIVE', 'SUSPENDED', 'BANNED', 'PENDING'].includes(searchParams.status || '') ? searchParams.status as UserStatus : undefined
  const page = Math.max(1, Number(searchParams.page || 1))
  const where: Prisma.UserWhereInput = { ...(q ? { email: { contains: q, mode: 'insensitive' as const } } : {}), ...(role ? { role } : {}), ...(status ? { status } : {}) }
  const [users, total, allUsers, newToday, blocked] = await db.$transaction([
    db.user.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * 20, take: 20, select: { id: true, email: true, name: true, role: true, status: true, createdAt: true, lastLoginAt: true, failedLoginCount: true } }),
    db.user.count({ where }),
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
    db.user.count({ where: { status: { in: ['SUSPENDED', 'BANNED'] } } }),
  ])
  const base = `/${panelPath}`
  const query = new URLSearchParams(); if (q) query.set('q', q); if (role) query.set('role', role); if (status) query.set('status', status)
  const hrefForPage = (value: number) => { const next = new URLSearchParams(query); next.set('page', String(value)); return `${base}?${next}` }

  return <AdminShell panelPath={panelPath}><main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-10"><div className="flex flex-col gap-6">
    <section className="flex flex-col justify-between gap-5 border-b pb-6 sm:flex-row sm:items-end"><div><p className="text-xs font-medium tracking-[0.18em] text-muted-foreground">IDENTITY OPERATIONS</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Users & access</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Review accounts, control access, and revoke active sessions from one audited workspace.</p></div><Badge variant="outline">{allUsers} identities</Badge></section>
    <section className="grid gap-4 md:grid-cols-3" aria-label="User overview"><Card><CardHeader><CardDescription>Total users</CardDescription><CardTitle className="text-3xl tabular-nums">{allUsers}</CardTitle><CardAction><Badge variant="secondary">Directory</Badge></CardAction></CardHeader></Card><Card><CardHeader><CardDescription>New today</CardDescription><CardTitle className="text-3xl tabular-nums">{newToday}</CardTitle><CardAction><Badge variant="outline">Today</Badge></CardAction></CardHeader></Card><Card><CardHeader><CardDescription>Restricted accounts</CardDescription><CardTitle className="text-3xl tabular-nums">{blocked}</CardTitle><CardAction><Badge variant={blocked ? 'destructive' : 'secondary'}>{blocked ? 'Review' : 'Clear'}</Badge></CardAction></CardHeader></Card></section>
    <Card><CardHeader className="border-b"><CardTitle>User directory</CardTitle><CardDescription>Changes to role, status, and sessions are recorded in the audit trail.</CardDescription><CardAction><Badge variant="outline">{total} results</Badge></CardAction></CardHeader><CardContent className="flex flex-col gap-5 pt-5"><form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_10rem_11rem_auto]"><input className="h-9 rounded-lg border bg-background px-3 text-sm" name="q" aria-label="Search users by email" defaultValue={q} placeholder="Search email"/><select className="h-9 rounded-lg border bg-background px-3 text-sm" name="role" defaultValue={role || ''} aria-label="Filter by role"><option value="">All roles</option><option value="USER">User</option><option value="ADMIN">Admin</option></select><select className="h-9 rounded-lg border bg-background px-3 text-sm" name="status" defaultValue={status || ''} aria-label="Filter by account status"><option value="">All statuses</option><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option><option value="BANNED">Banned</option><option value="PENDING">Pending</option></select><Button type="submit">Filter</Button></form><AdminUserTable users={users.map((user) => ({ ...user, createdAt: user.createdAt.toISOString(), lastLoginAt: user.lastLoginAt?.toISOString() || null }))}/><div className="flex items-center justify-between gap-3 border-t pt-4 text-sm text-muted-foreground"><span>Page {page} · {total} users</span><div className="flex gap-2">{page > 1 && <a className="inline-flex h-9 items-center rounded-lg border px-3 font-medium text-foreground transition-colors hover:bg-muted" href={hrefForPage(page - 1)}>Previous</a>}{page * 20 < total && <a className="inline-flex h-9 items-center rounded-lg border px-3 font-medium text-foreground transition-colors hover:bg-muted" href={hrefForPage(page + 1)}>Next</a>}</div></div></CardContent></Card>
  </div></main></AdminShell>
}
