"use client"

import { useEffect, useRef } from "react"
import { geoContains } from "d3-geo"
import type { FeatureCollection, MultiPolygon, Polygon } from "geojson"
import {
  BufferGeometry, Color, Float32BufferAttribute, Group, Line, LineBasicMaterial,
  PerspectiveCamera, Points, PointsMaterial, Scene, Vector3, WebGLRenderer,
} from "three"

const radius = 1.7
const landUrl = "https://raw.githubusercontent.com/martynafford/natural-earth-geojson/refs/heads/master/50m/physical/ne_50m_land.json"

function point(latitude: number, longitude: number) {
  const lat = latitude * Math.PI / 180
  const lng = longitude * Math.PI / 180
  return new Vector3(Math.cos(lat) * Math.sin(lng) * radius, Math.sin(lat) * radius, Math.cos(lat) * Math.cos(lng) * radius)
}

type LandGeometry = Polygon | MultiPolygon

function rings(geometry: LandGeometry) {
  if (geometry.type === "Polygon") return geometry.coordinates
  if (geometry.type === "MultiPolygon") return geometry.coordinates.flat()
  return []
}

export function AuthGlobe() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = containerRef.current
    if (!root) return
    const container: HTMLDivElement = root
    const scene = new Scene()
    const camera = new PerspectiveCamera(38, 1, 0.1, 100)
    camera.position.z = 5.15
    const renderer = new WebGLRenderer({ alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    Object.assign(renderer.domElement.style, { display: "block", width: "100%", height: "100%" })
    container.appendChild(renderer.domElement)

    const globe = new Group()
    globe.rotation.set(0.36, -0.8, 0)
    scene.add(globe)
    const grid = new Group()
    const coast = new Group()
    const dots = new Group()
    globe.add(grid, coast, dots)
    const lineMaterial = new LineBasicMaterial({ transparent: true, opacity: 0.62 })
    const coastMaterial = new LineBasicMaterial({ transparent: true, opacity: 0.92 })
    const dotMaterial = new PointsMaterial({ size: 0.018, transparent: true, opacity: 0.9, sizeAttenuation: true })

    function addLine(target: Group, positions: Vector3[], material: LineBasicMaterial) {
      const geometry = new BufferGeometry().setFromPoints(positions)
      target.add(new Line(geometry, material))
    }
    for (let lat = -75; lat <= 75; lat += 15) addLine(grid, Array.from({ length: 97 }, (_, i) => point(lat, -180 + i * 3)), lineMaterial)
    for (let lng = -165; lng < 180; lng += 15) addLine(grid, Array.from({ length: 61 }, (_, i) => point(-90 + i * 3, lng)), lineMaterial)

    function updateColor() {
      const color = new Color(document.documentElement.classList.contains("dark") ? "#f5f5f5" : "#18181b")
      lineMaterial.color = color
      coastMaterial.color = color
      dotMaterial.color = color
    }
    function resize() {
      const { width, height } = container.getBoundingClientRect()
      if (!width || !height) return
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
      renderer.render(scene, camera)
    }
    updateColor()
    resize()
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(container)
    const themeObserver = new MutationObserver(updateColor)
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    const controller = new AbortController()

    fetch(landUrl, { signal: controller.signal })
      .then((response) => response.json())
      .then((land: FeatureCollection<LandGeometry>) => {
        land.features.forEach((feature) => rings(feature.geometry).forEach((ring) => {
          const outline = ring.filter((_, index) => index % 2 === 0).map(([lng, lat]) => point(lat, lng))
          if (outline.length > 1) addLine(coast, [...outline, outline[0]], coastMaterial)
        }))
        const positions: number[] = []
        for (let lat = -88; lat <= 88; lat += 3) for (let lng = -178; lng <= 178; lng += 3) {
          if (geoContains(land, [lng, lat])) {
            const position = point(lat, lng).multiplyScalar(1.006)
            positions.push(position.x, position.y, position.z)
          }
        }
        const geometry = new BufferGeometry()
        geometry.setAttribute("position", new Float32BufferAttribute(positions, 3))
        dots.add(new Points(geometry, dotMaterial))
      })
      .catch(() => undefined)

    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches
    let frame = 0
    function animate() {
      globe.rotation.y += 0.0015
      renderer.render(scene, camera)
      frame = requestAnimationFrame(animate)
    }
    if (!reducedMotion) frame = requestAnimationFrame(animate)
    return () => {
      if (frame) cancelAnimationFrame(frame)
      controller.abort(); resizeObserver.disconnect(); themeObserver.disconnect()
      globe.traverse((object) => { const item = object as typeof object & { geometry?: BufferGeometry }; item.geometry?.dispose() })
      lineMaterial.dispose(); coastMaterial.dispose(); dotMaterial.dispose(); renderer.dispose(); renderer.domElement.remove()
    }
  }, [])

  return <div ref={containerRef} className="size-full" aria-hidden="true" />
}
