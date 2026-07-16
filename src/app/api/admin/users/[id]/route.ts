import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'

const statusSchema = z.object({ status: z.enum(['ACTIVE', 'SUSPENDED', 'BANNED', 'PENDING']) })
const roleSchema = z.object({ role: z.enum(['USER', 'ADMIN']) })

async function canChangeAdmin(adminId: string, targetId: string) {
  if (adminId === targetId) return { ok: false, error: 'You cannot change your own admin access' }
  const adminCount = await db.user.count({ where: { role: 'ADMIN' } })
  const target = await db.user.findUnique({ where: { id: targetId }, select: { role: true } })
  if (!target) return { ok: false, error: 'User not found' }
  if (target.role === 'ADMIN' && adminCount <= 1) return { ok: false, error: 'At least one admin must remain' }
  return { ok: true, target }
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const user = await db.user.findUnique({ where: { id: params.id }, include: { loginActivities: { orderBy: { createdAt: 'desc' }, take: 20 } } })
  return user ? NextResponse.json(user) : NextResponse.json({ error: 'User not found' }, { status: 404 })
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  const status = statusSchema.safeParse(body)
  const role = roleSchema.safeParse(body)
  if (!status.success && !role.success) return NextResponse.json({ error: 'Invalid update' }, { status: 400 })

  const safety = await canChangeAdmin(admin.id, params.id)
  if (!safety.ok) return NextResponse.json({ error: safety.error }, { status: 400 })
  const data = status.success ? { status: status.data.status } : { role: role.data!.role }
  const action = status.success ? `STATUS_${status.data.status}` : `ROLE_${role.data!.role}`
  const [user] = await db.$transaction([
    db.user.update({ where: { id: params.id }, data }),
    db.auditLog.create({ data: { adminId: admin.id, targetUserId: params.id, action, metadata: data } }),
  ])
  return NextResponse.json(user)
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const safety = await canChangeAdmin(admin.id, params.id)
  if (!safety.ok) return NextResponse.json({ error: safety.error }, { status: 400 })
  await db.$transaction([
    db.session.deleteMany({ where: { userId: params.id } }),
    db.account.deleteMany({ where: { userId: params.id } }),
    db.loginActivity.deleteMany({ where: { userId: params.id } }),
    db.auditLog.deleteMany({ where: { OR: [{ adminId: params.id }, { targetUserId: params.id }] } }),
    db.user.delete({ where: { id: params.id } }),
    db.auditLog.create({ data: { adminId: admin.id, action: 'DELETE', metadata: { targetUserId: params.id } } }),
  ])
  return NextResponse.json({ ok: true })
}
