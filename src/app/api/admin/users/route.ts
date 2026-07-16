import { NextResponse } from 'next/server'
import { Prisma, Role, UserStatus } from '@prisma/client'

import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')?.trim() || ''
  const role: Role | undefined = searchParams.get('role') === 'USER' || searchParams.get('role') === 'ADMIN' ? searchParams.get('role') as Role : undefined
  const status: UserStatus | undefined = ['ACTIVE', 'SUSPENDED', 'BANNED', 'PENDING'].includes(searchParams.get('status') || '') ? searchParams.get('status') as UserStatus : undefined
  const page = Math.max(1, Number(searchParams.get('page') || 1))
  const where: Prisma.UserWhereInput = {
    ...(query ? { email: { contains: query, mode: 'insensitive' as const } } : {}),
    ...(role ? { role } : {}),
    ...(status ? { status } : {}),
  }
  const [users, total] = await db.$transaction([
    db.user.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * 20, take: 20, select: { id: true, email: true, name: true, role: true, status: true, emailVerified: true, createdAt: true, lastLoginAt: true, failedLoginCount: true } }),
    db.user.count({ where }),
  ])
  return NextResponse.json({ users, total, page, pageSize: 20 })
}
