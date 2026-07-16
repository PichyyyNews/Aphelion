import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getUser } from '@/lib/auth'
import { db } from '@/lib/db'

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(80),
  bio: z.string().trim().max(160, 'Bio must be 160 characters or fewer.').optional(),
  avatarUrl: z.string().max(3_000_000).refine(
    (value) => value === '' || /^data:image\/(png|jpeg|webp);base64,/.test(value),
    'Use a PNG, JPEG, or WebP image.'
  ),
})

export async function PATCH(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to update your profile.' }, { status: 401 })

  const parsed = profileSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid profile details.' }, { status: 400 })
  }

  const updated = await db.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name,
      bio: parsed.data.bio || null,
      avatarUrl: parsed.data.avatarUrl || null,
    },
    select: { name: true, bio: true, avatarUrl: true },
  })

  return NextResponse.json({ ok: true, profile: updated })
}
