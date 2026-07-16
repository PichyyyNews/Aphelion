import { NextResponse } from 'next/server'
import crypto from 'crypto'

import { createAdminAccessToken, getUser } from '@/lib/auth'

function matches(value: string, expected: string) {
  const valueBuffer = Buffer.from(value)
  const expectedBuffer = Buffer.from(expected)
  return valueBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(valueBuffer, expectedBuffer)
}

export async function POST(req: Request) {
  const user = await getUser()
  if (!user || user.role !== 'ADMIN') return new NextResponse('Not found', { status: 404 })

  const expected = process.env.ADMIN_PANEL_PASSWORD
  if (!expected) return NextResponse.json({ error: 'Admin access password is not configured' }, { status: 503 })

  const { password } = await req.json()
  if (typeof password !== 'string' || !matches(password, expected)) return NextResponse.json({ error: 'Incorrect admin access password' }, { status: 401 })

  const token = await createAdminAccessToken(user.id)
  const response = NextResponse.json({ ok: true })
  response.cookies.set('aphelion_admin_access', token, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', maxAge: 1800, path: '/' })
  return response
}
