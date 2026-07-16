'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type User = { id: string; email: string; name: string | null; role: 'USER' | 'ADMIN'; status: 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'PENDING'; createdAt: string; lastLoginAt: string | null; failedLoginCount: number }

const statuses: User['status'][] = ['ACTIVE', 'SUSPENDED', 'BANNED', 'PENDING']

export function AdminUserTable({ users }: { users: User[] }) {
  const [message, setMessage] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const router = useRouter()

  async function action(user: User, method: 'PATCH' | 'DELETE' | 'POST', body?: object, suffix = '') {
    const destructive = method === 'DELETE' || body && 'status' in body && (body.status === 'BANNED' || body.status === 'SUSPENDED')
    if (destructive && !window.confirm(`Confirm action for ${user.email}?`)) return
    setBusyId(user.id)
    setMessage('')
    const response = await fetch(`/api/admin/users/${user.id}${suffix}`, { method, headers: body ? { 'content-type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined })
    const payload = await response.json().catch(() => null)
    setBusyId(null)
    if (!response.ok) {
      setMessage(payload?.error || 'Action failed')
      return
    }
    setMessage('Saved')
    router.refresh()
  }

  if (!users.length) return <p className="py-8 text-center text-sm text-muted-foreground">No users match this filter.</p>

  const statusVariant = (status: User['status']) => status === 'ACTIVE' ? 'secondary' : status === 'PENDING' ? 'outline' : 'destructive'

  return <div className="flex flex-col gap-3">
    {message && <p role="status" aria-live="polite" className="text-sm text-muted-foreground">{message}</p>}
    <Table className="min-w-[820px]"><TableHeader><TableRow><TableHead>User</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead>Last login</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{users.map((user) => <TableRow key={user.id}>
      <TableCell><div className="flex flex-col gap-0.5"><span className="font-medium">{user.name || user.email}</span><span className="text-muted-foreground">{user.email}</span></div></TableCell>
      <TableCell><select aria-label={`Role for ${user.email}`} className="h-8 rounded-md border bg-background px-2 text-xs font-medium" value={user.role} disabled={busyId === user.id} onChange={(event) => action(user, 'PATCH', { role: event.target.value })}><option value="USER">User</option><option value="ADMIN">Admin</option></select></TableCell>
      <TableCell><div className="flex flex-col gap-2"><Badge variant={statusVariant(user.status)}>{user.status}</Badge><select aria-label={`Status for ${user.email}`} className="h-8 rounded-md border bg-background px-2 text-xs font-medium" value={user.status} disabled={busyId === user.id} onChange={(event) => action(user, 'PATCH', { status: event.target.value })}>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></div></TableCell>
      <TableCell className="text-muted-foreground"><div className="flex flex-col gap-0.5"><span>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}</span>{user.failedLoginCount > 0 && <span>{user.failedLoginCount} failed attempts</span>}</div></TableCell>
      <TableCell><div className="flex justify-end gap-2"><Button type="button" variant="outline" size="sm" disabled={busyId === user.id} onClick={() => action(user, 'POST', undefined, '/force-logout')}>Force logout</Button><Button type="button" variant="destructive" size="sm" disabled={busyId === user.id} onClick={() => action(user, 'DELETE')}>Delete</Button></div></TableCell>
    </TableRow>)}</TableBody></Table>
  </div>
}
