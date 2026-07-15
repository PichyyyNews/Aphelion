import './globals.css';
import type { ReactNode } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';

export const metadata = { title: 'Aphelion', description: 'Secure identity platform' };

export default function Layout({ children }: { children: ReactNode }) {
  return <html lang="en" suppressHydrationWarning><body><div className="min-h-screen bg-background"><nav className="flex h-16 items-center justify-between border-b px-5 sm:px-8"><a className="flex items-center gap-3 font-semibold tracking-tight" href="/"><img className="size-7 dark:invert" src="/logo.svg" alt="Aphelion" />Aphelion</a><ThemeToggle /></nav>{children}</div></body></html>;
}
