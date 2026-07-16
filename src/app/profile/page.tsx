import { redirect } from 'next/navigation'

import { ProfileEditor } from '@/components/profile-editor'
import { getUser } from '@/lib/auth'
import { db } from '@/lib/db'

export default async function ProfilePage() {
  const sessionUser = await getUser()
  if (!sessionUser) redirect('/login')

  const user = await db.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      name: true,
      email: true,
      bio: true,
      avatarUrl: true,
      role: true,
      status: true,
      createdAt: true,
      _count: { select: { followers: true, following: true } },
    },
  })
  if (!user) redirect('/login')

  return <ProfileEditor user={{ ...user, createdAt: user.createdAt.toISOString() }} followers={user._count.followers} following={user._count.following} />
}
