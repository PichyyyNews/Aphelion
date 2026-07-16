'use client'

import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { CiHome, CiLock, CiSettings, CiUser } from 'react-icons/ci'

import { Badge } from '@/components/ui/badge'
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

type NavItem = { label: string; href: string; icon: typeof CiHome }

export function AdminShell({ children, panelPath }: { children: ReactNode; panelPath: string }) {
  const pathname = usePathname()
  const base = `/${panelPath}`
  const isSettings = pathname === `${base}/settings`
  const groups: { label: string; items: NavItem[] }[] = [
    { label: 'WORKSPACE', items: [{ label: 'Users & access', href: base, icon: CiUser }] },
    { label: 'CONFIGURATION', items: [{ label: 'Identity providers', href: `${base}/settings#identity-providers`, icon: CiSettings }] },
    { label: 'SECURITY', items: [{ label: 'Access controls', href: `${base}/settings#access-controls`, icon: CiLock }] },
    { label: 'SYSTEM', items: [{ label: 'Audit trail', href: `${base}/settings#audit-trail`, icon: CiHome }] },
  ]

  return <div className="min-h-[calc(100dvh-4rem)] bg-muted/30 lg:grid lg:grid-cols-[18rem_minmax(0,1fr)]">
    <aside className="border-b bg-muted/70 lg:border-r lg:border-b-0">
      <div className="flex h-full flex-col gap-6 px-4 py-5 lg:sticky lg:top-16 lg:h-[calc(100dvh-4rem)]">
        <div className="flex items-center justify-between gap-3 px-2">
          <div><p className="text-xs font-medium tracking-[0.18em] text-muted-foreground">APHELION</p><p className="mt-1 font-semibold tracking-tight">Admin control</p></div>
          <Badge variant="outline">Private</Badge>
        </div>
        <Separator />
        <nav aria-label="Admin navigation" className="flex flex-col gap-6">{groups.map((group) => <div className="flex flex-col gap-2" key={group.label}><p className="px-2 text-xs font-medium tracking-[0.14em] text-muted-foreground">{group.label}</p><div className="flex flex-col gap-1">{group.items.map((item) => { const destination = item.href.split('#')[0]; const active = destination === base ? pathname === base : isSettings && item.label === 'Identity providers'; const Icon = item.icon; return <a key={item.href} href={item.href} aria-current={active ? 'page' : undefined} className={cn('flex min-h-10 items-center gap-3 rounded-lg px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground', active && 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground')}><Icon aria-hidden="true" /><span>{item.label}</span></a> })}</div></div>)}</nav>
        <div className="mt-auto flex flex-col gap-4">
          <div className="rounded-xl border bg-muted/40 p-3"><p className="text-xs font-medium tracking-[0.14em] text-muted-foreground">SECURE AREA</p><p className="mt-1 text-sm font-medium">Admin actions are audited.</p></div>
          <Separator />
          <a className="flex min-h-10 items-center gap-3 rounded-lg px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" href="/dashboard"><CiHome aria-hidden="true" /><span>Back to dashboard</span></a>
        </div>
      </div>
    </aside>
    <div className="min-w-0">
      <header className="flex min-h-16 items-center border-b bg-muted px-5 sm:px-8">
        <Breadcrumb><BreadcrumbList><BreadcrumbItem><span className="text-muted-foreground">Admin</span></BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbPage>{isSettings ? 'Settings' : 'Users & access'}</BreadcrumbPage></BreadcrumbItem></BreadcrumbList></Breadcrumb>
      </header>
      {children}
    </div>
  </div>
}
