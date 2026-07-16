import { notFound } from 'next/navigation'

import { AdminSettings } from '@/components/admin-settings'
import { AdminShell } from '@/components/admin-shell'
import { getUser, hasAdminAccess } from '@/lib/auth'

const panelPath = process.env.ADMIN_PANEL_PATH || 'control-room'

export default async function Settings({ params }: { params: { adminPath: string } }) {
  if (params.adminPath !== panelPath) notFound()
  const user = await getUser()
  if (!user || user.role !== 'ADMIN' || !(await hasAdminAccess(user.id))) notFound()
  return <AdminShell panelPath={panelPath}><AdminSettings /></AdminShell>
}
