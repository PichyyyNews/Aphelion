"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const enabled = localStorage.theme === "dark" || (!localStorage.theme && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", enabled);
    setDark(enabled);
  }, []);

  function onThemeChange(enabled: boolean) {
    document.documentElement.classList.toggle("dark", enabled);
    localStorage.theme = enabled ? "dark" : "light";
    setDark(enabled);
  }

  return <label className="flex items-center gap-2 text-sm text-muted-foreground"><SunIcon aria-hidden="true" className="size-4" /><Switch checked={dark} onCheckedChange={onThemeChange} aria-label="Toggle dark mode" /><MoonIcon aria-hidden="true" className="size-4" /></label>;
}
