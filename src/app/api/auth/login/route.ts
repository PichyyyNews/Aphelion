import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

import { createSession } from '@/lib/auth'
import { db } from '@/lib/db'

const activity = (req: Request) => ({
  ip: req.headers.get('x-forwarded-for')?.split(',')[0] || null,
  userAgent: req.headers.get('user-agent') || null,
})

export async function POST(req: Request) {
  const { email, password } = await req.json()
  const user = await db.user.findUnique({ where: { email } })
  const valid = !!user?.password && await bcrypt.compare(password, user.password)

  if (!valid) {
    if (user) await db.$transaction([
      db.user.update({ where: { id: user.id }, data: { failedLoginCount: { increment: 1 }, lastFailedLoginAt: new Date() } }),
      db.loginActivity.create({ data: { userId: user.id, type: 'LOGIN_FAILED', ...activity(req) } }),
    ])
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }

  if (user.status !== 'ACTIVE') return NextResponse.json({ error: 'Account is not active' }, { status: 403 })

  const activeUser = await db.user.update({ where: { id: user.id }, data: { failedLoginCount: 0, lastLoginAt: new Date() } })
  await db.loginActivity.create({ data: { userId: activeUser.id, type: 'LOGIN_SUCCESS', ...activity(req) } })

  const token = await createSession(activeUser)
  const response = NextResponse.json({ ok: true })
  response.cookies.set('aphelion_session', token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 604800, path: '/' })
  return response
}
