'use client'

import { ChangeEvent, FormEvent, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CiEdit, CiImageOn, CiLink, CiSaveDown1 } from 'react-icons/ci'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'

type ProfileEditorProps = {
  user: {
    id: string
    name: string | null
    email: string
    bio: string | null
    avatarUrl: string | null
    role: string
    status: string
    createdAt: string
  }
  followers: number
  following: number
}

const profileTags = ['TypeScript', 'Next.js', 'AI builder', 'Open source']
const activityCells = Array.from({ length: 156 })

function initials(name: string, email: string) {
  return (name || email).split(/\s|@/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

function profileHandle(email: string) {
  return email.split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '') || 'aphelion-user'
}

export function ProfileEditor({ user, followers, following }: ProfileEditorProps) {
  const router = useRouter()
  const imageInput = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(user.name || '')
  const [bio, setBio] = useState(user.bio || '')
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [copyLabel, setCopyLabel] = useState('Share')
  const publicId = `aph_${user.id}`
  const handle = profileHandle(user.email)
  const joined = new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' }).format(new Date(user.createdAt))

  async function shareProfile() {
    const shareText = `Add @${handle} on Aphelion with ID ${publicId}`
    if (navigator.share) {
      await navigator.share({ title: `${name || handle} on Aphelion`, text: shareText }).catch(() => undefined)
      return
    }
    await navigator.clipboard.writeText(shareText)
    setCopyLabel('Copied')
    window.setTimeout(() => setCopyLabel('Share'), 1800)
  }

  function selectImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
      setError('Choose a PNG, JPEG, or WebP image no larger than 2MB.')
      event.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setAvatarUrl(String(reader.result))
      setError('')
      setNotice('Image ready. Save changes to update your profile.')
    }
    reader.readAsDataURL(file)
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    const response = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, bio, avatarUrl }),
    })
    const payload = await response.json().catch(() => null)
    setSaving(false)
    if (!response.ok) {
      setError(payload?.error || 'Could not save your profile. Try again.')
      return
    }
    setNotice('Profile saved.')
    setEditing(false)
    router.refresh()
  }

  return <main className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
    <div className="flex flex-col gap-14">
      <section className="grid gap-7 border-b pb-10 md:grid-cols-[9rem_minmax(0,1fr)] md:gap-9">
        <div className="relative w-fit self-start">
          <Avatar className="size-32 text-3xl ring-1 ring-foreground/20 sm:size-36">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={`${name || 'User'} profile photo`} />}
            <AvatarFallback>{initials(name, user.email)}</AvatarFallback>
          </Avatar>
          <span className="absolute right-1 bottom-1 size-4 rounded-full border-2 border-background bg-foreground" aria-hidden="true" />
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <h1 className="truncate text-balance text-3xl font-semibold">@{handle}</h1>
              <Badge variant="outline">{user.role === 'ADMIN' ? 'ADMIN' : 'APHELION BUILDER'}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Dialog open={editing} onOpenChange={setEditing}>
                <DialogTrigger asChild><Button type="button"><CiEdit data-icon="inline-start" aria-hidden="true" />Edit profile</Button></DialogTrigger>
                <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
                  <DialogHeader><DialogTitle>Edit profile</DialogTitle><DialogDescription>Update your public identity on Aphelion.</DialogDescription></DialogHeader>
                  <form onSubmit={saveProfile}>
                    <FieldGroup>
                      <Field>
                        <FieldLabel>Profile photo</FieldLabel>
                        <div className="flex flex-wrap items-center gap-3">
                          <Avatar className="size-16 text-lg">
                            {avatarUrl && <AvatarImage src={avatarUrl} alt="Profile photo preview" />}
                            <AvatarFallback>{initials(name, user.email)}</AvatarFallback>
                          </Avatar>
                          <Input ref={imageInput} className="sr-only" id="profile-image" type="file" accept="image/png,image/jpeg,image/webp" onChange={selectImage} aria-label="Choose a profile photo" />
                          <Button type="button" variant="outline" onClick={() => imageInput.current?.click()}><CiImageOn data-icon="inline-start" aria-hidden="true" />Change photo</Button>
                          {avatarUrl && <Button type="button" variant="ghost" onClick={() => setAvatarUrl('')}>Remove</Button>}
                        </div>
                        <FieldDescription>PNG, JPEG, or WebP — up to 2MB.</FieldDescription>
                      </Field>
                      <Field data-invalid={!!error}>
                        <FieldLabel htmlFor="profile-name">Name</FieldLabel>
                        <Input id="profile-name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required aria-invalid={!!error} />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="profile-bio">Bio</FieldLabel>
                        <Textarea id="profile-bio" value={bio} maxLength={160} onChange={(event) => setBio(event.target.value)} placeholder="What are you building?" />
                        <FieldDescription>{bio.length}/160 characters</FieldDescription>
                      </Field>
                      {error && <FieldError>{error}</FieldError>}
                      {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
                      <DialogFooter><Button type="submit" disabled={saving}><CiSaveDown1 data-icon="inline-start" aria-hidden="true" />{saving ? 'Saving…' : 'Save changes'}</Button></DialogFooter>
                    </FieldGroup>
                  </form>
                </DialogContent>
              </Dialog>
              <Button type="button" variant="outline" onClick={() => void shareProfile()}><CiLink data-icon="inline-start" aria-hidden="true" />{copyLabel}</Button>
            </div>
          </div>

          <dl className="flex flex-wrap gap-x-7 gap-y-3 text-sm tabular-nums">
            <div><dt className="sr-only">Posts</dt><dd><strong>0</strong> posts</dd></div>
            <div><dt className="sr-only">Followers</dt><dd><strong>{followers}</strong> followers</dd></div>
            <div><dt className="sr-only">Following</dt><dd><strong>{following}</strong> following</dd></div>
            <div><dt className="sr-only">Repositories</dt><dd><strong>0</strong> repos</dd></div>
          </dl>

          <div className="flex max-w-2xl flex-col gap-1 text-sm">
            <p className="font-medium">{name || 'Aphelion builder'}</p>
            <p className="text-pretty text-muted-foreground">{bio || 'Building in public on Aphelion.'}</p>
            <p className="text-muted-foreground">Aphelion ID <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">{publicId}</code> · joined {joined}</p>
          </div>

          <div className="flex flex-wrap gap-2" aria-label="Profile interests">
            {profileTags.map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}
          </div>
        </div>
      </section>

      <section aria-labelledby="activity-title" className="flex flex-col gap-5">
        <h2 id="activity-title" className="text-balance text-xl font-semibold">Activity</h2>
        <Card>
          <CardHeader className="border-b"><CardTitle>Contribution activity</CardTitle><CardDescription>Publishing and contribution tracking will appear here as you share work.</CardDescription></CardHeader>
          <CardContent className="flex flex-col gap-4 pt-4">
            <div className="grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto p-1" aria-label="No contribution activity yet">
              {activityCells.map((_, index) => <span key={index} className="size-4 rounded-sm bg-muted sm:size-5" />)}
            </div>
            <p className="text-sm text-muted-foreground">No activity yet — publish your first project or snippet to begin your timeline.</p>
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section aria-labelledby="posts-title" className="flex flex-col gap-5 pb-10">
        <div className="flex items-baseline justify-between gap-4"><h2 id="posts-title" className="text-balance text-xl font-semibold">Posts</h2><span className="text-sm text-muted-foreground">Archive coming soon</span></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="sm:col-span-2 lg:col-span-2"><CardHeader><CardTitle>Build something worth sharing</CardTitle><CardDescription>Posts can contain code, Markdown, files, and repository links. Your work will live here.</CardDescription></CardHeader><CardContent><Button type="button" variant="outline" disabled>Create your first post</Button></CardContent></Card>
          <Card><CardHeader><CardTitle>Profile setup</CardTitle><CardDescription>Your public profile is ready. Add a bio and photo to make it recognisable.</CardDescription></CardHeader><CardContent><Badge variant="secondary">Ready for social</Badge></CardContent></Card>
        </div>
      </section>
    </div>
  </main>
}
