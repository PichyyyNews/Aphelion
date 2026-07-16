import { NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (admin.id === params.id) return NextResponse.json({ error: 'You cannot force logout yourself' }, { status: 400 })
  await db.$transaction([
    db.session.deleteMany({ where: { userId: params.id } }),
    db.auditLog.create({ data: { adminId: admin.id, targetUserId: params.id, action: 'FORCE_LOGOUT' } }),
  ])
  return NextResponse.json({ ok: true })
}
