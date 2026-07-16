import { NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

import { createSession } from '@/lib/auth'
import { db } from '@/lib/db'

const schema = z.object({ email: z.string().email(), password: z.string().min(8), name: z.string().optional() })

export async function POST(req: Request) {
  try {
    const payload = schema.safeParse(await req.json())
    if (!payload.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    if (await db.user.findUnique({ where: { email: payload.data.email } })) return NextResponse.json({ error: 'Email already registered' }, { status: 409 })

    const user = await db.user.create({ data: { email: payload.data.email, password: await bcrypt.hash(payload.data.password, 12), name: payload.data.name } })
    await db.loginActivity.create({ data: { userId: user.id, type: 'REGISTER', ip: req.headers.get('x-forwarded-for')?.split(',')[0] || null, userAgent: req.headers.get('user-agent') || null } })

    const token = await createSession(user)
    const response = NextResponse.json({ ok: true })
    response.cookies.set('aphelion_session', token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 604800, path: '/' })
    return response
  } catch (error) {
    console.error('[auth/register]', error)
    return NextResponse.json({ error: 'Registration service unavailable. Check the database connection.' }, { status: 503 })
  }
}
