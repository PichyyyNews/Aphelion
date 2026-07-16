'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CircleHelp } from 'lucide-react'
import { CiDark, CiLight, CiSearch, CiSettings, CiUser } from 'react-icons/ci'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from '@/components/ui/command'
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

type AppUser = { name: string | null; email: string; role: string; avatarUrl: string | null }

function initials(user: AppUser) {
  const source = user.name?.trim() || user.email
  return source.split(/\s|@/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

function ThemeMenuItem() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
  }, [])

  function setTheme(enabled: boolean) {
    document.documentElement.classList.toggle('dark', enabled)
    localStorage.setItem('theme', enabled ? 'dark' : 'light')
    setDark(enabled)
  }

  return <DropdownMenuCheckboxItem checked={dark} onCheckedChange={setTheme}><span className="flex flex-1 items-center gap-2">{dark ? <CiDark aria-hidden="true" /> : <CiLight aria-hidden="true" />}Dark mode</span></DropdownMenuCheckboxItem>
}

export function AppHeader({ user }: { user: AppUser }) {
  const [open, setOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const router = useRouter()

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  function navigate(path: string) {
    setOpen(false)
    router.push(path)
  }

  async function logout() {
    setLoggingOut(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.assign('/login')
  }

  return <>
    <nav className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b bg-muted px-4 sm:px-6 md:grid md:grid-cols-[1fr_auto_1fr] md:px-8" aria-label="Application navigation">
      <a className="flex min-w-0 items-center gap-3 font-semibold tracking-tight" href="/dashboard"><img className="size-7 dark:invert" src="/logo.svg" alt="Aphelion" /><span className="hidden sm:inline">Aphelion</span></a>
      <Button type="button" variant="outline" className="hidden w-[min(32rem,44vw)] justify-between text-muted-foreground md:inline-flex" onClick={() => setOpen(true)} aria-label="Search workspace, shortcut Control or Command K"><span className="flex items-center gap-2"><CiSearch data-icon="inline-start" aria-hidden="true" />Search your workspace</span><kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">Ctrl K</kbd></Button>
      <div className="ml-auto flex items-center justify-end gap-2 md:ml-0"><Button type="button" variant="ghost" size="icon" className="md:hidden" aria-label="Search workspace" onClick={() => setOpen(true)}><CiSearch aria-hidden="true" /></Button><DropdownMenu><DropdownMenuTrigger asChild><Button type="button" variant="ghost" className="h-10 gap-2 px-1.5" aria-label="Open account menu"><Avatar>{user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}<AvatarFallback>{initials(user)}</AvatarFallback></Avatar><span className="hidden max-w-36 truncate text-left text-sm font-medium lg:inline">{user.name || user.email}</span></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-64"><DropdownMenuLabel><p className="truncate font-medium text-foreground">{user.name || 'Aphelion user'}</p><p className="mt-0.5 truncate font-normal">{user.email}</p></DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuGroup><DropdownMenuItem onSelect={() => navigate('/profile')}><CiUser aria-hidden="true" />Profile</DropdownMenuItem><ThemeMenuItem /><DropdownMenuItem onSelect={() => navigate('/settings')}><CiSettings aria-hidden="true" />Settings</DropdownMenuItem><DropdownMenuItem onSelect={() => navigate('/help')}><CircleHelp aria-hidden="true" />Help</DropdownMenuItem></DropdownMenuGroup><DropdownMenuSeparator /><DropdownMenuItem variant="destructive" disabled={loggingOut} onSelect={(event) => { event.preventDefault(); void logout() }}>{loggingOut ? 'Signing out…' : 'Log out'}</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>
    </nav>
    <CommandDialog open={open} onOpenChange={setOpen} title="Search workspace" description="Find a page or run a quick navigation command."><CommandInput placeholder="Search pages and actions..." /><CommandList><CommandEmpty>No matching page.</CommandEmpty><CommandGroup heading="Navigate"><CommandItem onSelect={() => navigate('/dashboard')}>Dashboard<CommandShortcut>G D</CommandShortcut></CommandItem><CommandItem onSelect={() => navigate('/profile')}><CiUser aria-hidden="true" />Profile<CommandShortcut>G P</CommandShortcut></CommandItem><CommandItem onSelect={() => navigate('/settings')}><CiSettings aria-hidden="true" />Settings<CommandShortcut>G S</CommandShortcut></CommandItem></CommandGroup><CommandSeparator /><CommandGroup heading="Support"><CommandItem onSelect={() => navigate('/help')}><CircleHelp aria-hidden="true" />Help center</CommandItem></CommandGroup></CommandList></CommandDialog>
  </>
}
