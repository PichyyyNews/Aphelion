"use client"

import { useEffect, useMemo, useState } from "react"
import Globe from "@/components/originkit-globe"

export function AuthGlobe() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const updateTheme = () => setDark(document.documentElement.classList.contains("dark"))
    updateTheme()
    const observer = new MutationObserver(updateTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])

  const ink = dark ? "#ffffff" : "#18181b"
  const dots = useMemo(() => ({ color: ink, size: 5, density: 8, allDots: false }), [ink])
  const markerConfig = useMemo(
    () => ({ markers: [], color: dark ? "#00f7ff" : "#2563eb", size: 40 }),
    [dark],
  )

  return (
    <div className="relative size-full min-h-0 overflow-hidden">
      <Globe
        speed={2}
        smoothing={8}
        fill="dots"
        fillColor="#ffffff"
        scale={8}
        stopOnHover={false}
        enableDrag={false}
        direction="left"
        initialLatitude={23}
        initialLongitude={-23}
        oceanColor="rgba(0, 0, 0, 0)"
        outlineColor={ink}
        graticuleColor={dark ? "#D4D4D4" : "#A1A1AA"}
        showOutline
        showGrid
        dots={dots}
        markerConfig={markerConfig}
        style={{ minHeight: "100%", backgroundColor: "transparent" }}
      />
      <div className="pointer-events-none absolute left-[78%] top-[16%] w-52 -translate-x-1/2 rounded-xl border border-border/70 bg-card/90 p-4 shadow-lg backdrop-blur-sm">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Global access</p>
        <p className="mt-1 text-xs font-medium leading-snug">One secure identity, everywhere.</p>
      </div>
      <div className="pointer-events-none absolute bottom-[18%] left-[30%] w-52 -translate-x-1/2 rounded-xl border border-border/70 bg-card/90 p-4 shadow-lg backdrop-blur-sm">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Built for trust</p>
        <p className="mt-1 text-xs font-medium leading-snug">Protected sessions from sign-in onward.</p>
      </div>
    </div>
  )
}
