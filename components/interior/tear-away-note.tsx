"use client"

import { useEffect, useId, useRef, type ReactNode } from "react"
import * as THREE from "three"
import { cn } from "@/lib/utils"

type Point = { x: number; y: number; z: number }

type WorkerResult = {
  active: boolean
  drawCount: number
  id: number
  indices: ArrayBuffer
  normals: ArrayBuffer
  positions: ArrayBuffer
  type: "result"
}

type TransferBuffers = {
  indices: ArrayBuffer
  normals: ArrayBuffer
  positions: ArrayBuffer
}

type TearAwayArtwork = "document" | "pattern"

export type TearAwayNoteProps = {
  /** The live DOM content exposed through a tear. */
  under: ReactNode
  /** Background colour of the textured document. */
  paperColor?: string
  /** Accent colour used in the document artwork. */
  accentColor?: string
  /** Small header label painted onto the document. */
  eyebrow?: string
  /** Large canvas-textured document title. */
  title?: string
  /** Supporting document copy. */
  description?: string
  /** Canvas artwork used for the removable surface. */
  artwork?: TearAwayArtwork
  /** Called once the document has torn. */
  onTearChange?: (isTorn: boolean) => void
  className?: string
}

const MAX_DPR = 1.5

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
) {
  const words = text.split(" ")
  const lines: string[] = []
  let line = ""
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (line && context.measureText(next).width > maxWidth) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  return lines
}

function drawPatternArtwork(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  padding: number
) {
  const columns = 9
  const rows = 5
  const gap = Math.max(5, Math.min(width, height) * 0.016)
  const gridWidth = width - padding * 2
  const gridHeight = height * 0.45
  const cellWidth = (gridWidth - gap * (columns - 1)) / columns
  const cellHeight = (gridHeight - gap * (rows - 1)) / rows
  const colours = ["#e45743", "#78a2cf", "#6caf82", "#e5bb48", "#262d3a"]

  const fill = (points: Array<[number, number]>) => {
    context.beginPath()
    context.moveTo(points[0][0], points[0][1])
    for (const [x, y] of points.slice(1)) context.lineTo(x, y)
    context.closePath()
    context.fill()
  }

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      // Purposeful gaps stop the tiles from reading as a rigid checkerboard.
      if ((row * 5 + column * 3) % 11 === 0 || (row === 1 && column === 6))
        continue
      const x = padding + column * (cellWidth + gap)
      const y = padding + row * (cellHeight + gap)
      const cut = Math.min(cellWidth, cellHeight) * 0.25
      context.fillStyle = colours[(row * 7 + column * 3) % colours.length]

      switch ((row * 3 + column * 5) % 4) {
        case 0:
          fill([
            [x + cut, y],
            [x + cellWidth, y],
            [x + cellWidth, y + cellHeight],
            [x, y + cellHeight],
            [x, y + cut],
          ])
          break
        case 1:
          fill([
            [x, y + cellHeight],
            [x + cellWidth, y + cellHeight],
            [x + cellWidth, y],
          ])
          break
        case 2:
          fill([
            [x, y],
            [x + cellWidth, y],
            [x, y + cellHeight],
          ])
          break
        default:
          fill([
            [x + cut, y],
            [x + cellWidth, y],
            [x + cellWidth, y + cellHeight - cut],
            [x, y + cellHeight],
            [x, y + cut],
          ])
      }
    }
  }
}

function drawDocument(
  width: number,
  height: number,
  dpr: number,
  {
    accentColor,
    artwork,
    description,
    eyebrow,
    paperColor,
    title,
  }: Required<
    Pick<
      TearAwayNoteProps,
      | "accentColor"
      | "artwork"
      | "description"
      | "eyebrow"
      | "paperColor"
      | "title"
    >
  >
) {
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(width * dpr)
  canvas.height = Math.round(height * dpr)
  const context = canvas.getContext("2d")!
  context.scale(dpr, dpr)
  if (paperColor !== "transparent") {
    context.fillStyle = paperColor
    context.fillRect(0, 0, width, height)
  }

  if (artwork !== "pattern") {
    context.fillStyle = "rgba(18, 25, 37, 0.055)"
    for (let x = 14; x < width; x += 16) {
      for (let y = 14; y < height; y += 16) context.fillRect(x, y, 1, 1)
    }
  }

  const padding = Math.max(24, Math.min(width, height) * 0.075)
  if (artwork === "pattern") {
    drawPatternArtwork(context, width, height, padding)
  } else {
    context.fillStyle = accentColor
    context.globalAlpha = 0.78
    context.beginPath()
    context.arc(
      width * 0.82,
      height * 0.21,
      Math.min(width, height) * 0.235,
      0,
      Math.PI * 2
    )
    context.fill()
    context.globalAlpha = 1
    context.strokeStyle = "rgba(18, 25, 37, 0.18)"
    context.lineWidth = 1
    context.beginPath()
    context.arc(
      width * 0.82,
      height * 0.21,
      Math.min(width, height) * 0.155,
      0,
      Math.PI * 2
    )
    context.stroke()
  }

  if (artwork !== "pattern") {
    context.fillStyle = "rgba(18, 25, 37, 0.58)"
    context.font = "600 10px ui-monospace, SFMono-Regular, Menlo, monospace"
    context.letterSpacing = "1.4px"
    context.fillText(eyebrow.toUpperCase(), padding, padding + 2)
    context.textAlign = "right"
    context.fillText("01 / 02", width - padding, padding + 2)
    context.textAlign = "left"
    context.letterSpacing = "0px"

    const titleSize = Math.max(30, Math.min(width * 0.09, 52))
    context.fillStyle = "#121925"
    context.font = `500 ${titleSize}px Georgia, serif`
    const titleLines = wrapText(context, title, width - padding * 2.1).slice(
      0,
      3
    )
    titleLines.forEach((line, index) =>
      context.fillText(line, padding, height * 0.43 + titleSize * index * 0.9)
    )

    context.fillStyle = "rgba(18, 25, 37, 0.62)"
    context.font = "14px ui-sans-serif, system-ui, sans-serif"
    wrapText(context, description, Math.min(width * 0.62, 340))
      .slice(0, 3)
      .forEach((line, index) =>
        context.fillText(line, padding, height * 0.7 + index * 20)
      )

    context.setLineDash([5, 6])
    context.strokeStyle = "rgba(18, 25, 37, 0.26)"
    context.beginPath()
    context.moveTo(padding, height - padding)
    context.lineTo(width - padding, height - padding)
    context.stroke()
    context.setLineDash([])
    context.fillStyle = "rgba(18, 25, 37, 0.5)"
    context.font = "600 10px ui-monospace, SFMono-Regular, Menlo, monospace"
    context.fillText("PULL / TEAR / REVEAL", padding, height - padding - 13)
  }

  return canvas
}

function createIndices(columns: number, rows: number) {
  const indices = new Uint32Array((columns - 1) * (rows - 1) * 6)
  let offset = 0
  for (let row = 0; row < rows - 1; row++) {
    for (let column = 0; column < columns - 1; column++) {
      const topLeft = row * columns + column
      const topRight = topLeft + 1
      const bottomLeft = topLeft + columns
      const bottomRight = bottomLeft + 1
      indices[offset++] = topLeft
      indices[offset++] = bottomLeft
      indices[offset++] = topRight
      indices[offset++] = topRight
      indices[offset++] = bottomLeft
      indices[offset++] = bottomRight
    }
  }
  return indices
}

/**
 * A worker-driven, textured Three.js poster mesh. The worker owns the Verlet
 * positions, link relaxation, and tear connectivity; the main thread only
 * uploads returned buffers and renders. Torn-off sections stay in the same
 * simulation and fall under gravity, so every exposed area is a real hole.
 */
export function TearAwayNote({
  accentColor = "#a5ce7a",
  artwork = "document",
  className,
  description = "Pull through the document and let the page beneath become part of the composition.",
  eyebrow = "Tearable document",
  onTearChange,
  paperColor = "#f7f3e8",
  title = "The surface gives where you pull.",
  under,
}: TearAwayNoteProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const fallbackRef = useRef<HTMLDivElement>(null)
  const tornRef = useRef(false)
  const descriptionId = useId()

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches
    let destroyed = false
    let renderer: THREE.WebGLRenderer | null = null
    let worker: Worker | null = null
    let animationFrame: number | null = null
    let inFlight = false
    let pointerId: number | null = null
    let pointerActive = false
    let settleFrames = 0
    let currentWidth = 0
    let currentHeight = 0
    let cleanupCanvasEvents = () => {}
    let disposeScene = () => {}
    let transferBuffers: TransferBuffers | null = null

    const stop = () => {
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame)
      animationFrame = null
    }

    const start = () => {
      if (animationFrame === null && !destroyed)
        animationFrame = window.requestAnimationFrame(step)
    }

    // Convert a pointer event into a world-space point on the sheet plane. Depth
    // (z) is left at 0 here — the peel depth now emerges naturally from the
    // simulation as the sheet lifts, rather than being faked from drag distance
    // (which used to spike distances and cause whole seams to "cut" at once).
    const pointFromEvent = (
      event: PointerEvent,
      canvas: HTMLCanvasElement,
      worldWidth: number,
      worldHeight: number
    ): Point => {
      const rect = canvas.getBoundingClientRect()
      const nx = (event.clientX - rect.left) / Math.max(rect.width, 1)
      const ny = (event.clientY - rect.top) / Math.max(rect.height, 1)
      return { x: (nx - 0.5) * worldWidth, y: (0.5 - ny) * worldHeight, z: 0 }
    }

    const step = () => {
      animationFrame = null
      if (!worker || inFlight || destroyed) return
      inFlight = true
      const buffers = transferBuffers
      transferBuffers = null
      worker.postMessage(
        { type: "step", id: 1, buffers: buffers ?? undefined },
        buffers ? [buffers.positions, buffers.normals, buffers.indices] : []
      )
    }

    const initialize = () => {
      cleanupCanvasEvents()
      disposeScene()
      worker?.terminate()
      worker = null
      inFlight = false
      tornRef.current = false

      const rect = host.getBoundingClientRect()
      currentWidth = Math.max(1, rect.width)
      currentHeight = Math.max(1, rect.height)
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
      const worldHeight = 2
      const worldWidth = (currentWidth / currentHeight) * worldHeight
      // A dense desktop mesh keeps a torn edge organic rather than visibly
      // stepping between large grid cells. Coarse pointers retain a lighter
      // mesh so touch interaction remains responsive.
      const lowerPowerDevice = (navigator.hardwareConcurrency ?? 8) <= 4
      const columns = coarsePointer ? 40 : lowerPowerDevice ? 72 : 96
      const rows = Math.max(
        coarsePointer ? 28 : lowerPowerDevice ? 44 : 56,
        Math.round((columns * currentHeight) / currentWidth)
      )
      const initialPositions = new Float32Array(columns * rows * 3)
      const uvs = new Float32Array(columns * rows * 2)

      for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++) {
          const index = row * columns + column
          initialPositions[index * 3] =
            (column / (columns - 1) - 0.5) * worldWidth
          initialPositions[index * 3 + 1] =
            (0.5 - row / (rows - 1)) * worldHeight
          initialPositions[index * 3 + 2] = 0
          uvs[index * 2] = column / (columns - 1)
          uvs[index * 2 + 1] = 1 - row / (rows - 1)
        }
      }

      try {
        renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
        })
      } catch {
        fallbackRef.current?.classList.remove("hidden")
        return
      }

      renderer.setPixelRatio(dpr)
      renderer.setSize(currentWidth, currentHeight, false)
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.domElement.className =
        "absolute inset-0 z-10 size-full touch-none cursor-grab active:cursor-grabbing"
      renderer.domElement.setAttribute("aria-describedby", descriptionId)
      renderer.domElement.setAttribute(
        "aria-label",
        "Interactive tearable document"
      )
      renderer.domElement.setAttribute("role", "application")
      host.appendChild(renderer.domElement)
      fallbackRef.current?.classList.add("hidden")

      const scene = new THREE.Scene()
      // The camera frustum is a little taller than the sheet so torn pieces can
      // swing and fall a short way while remaining visible before settling.
      const camera = new THREE.OrthographicCamera(
        -worldWidth / 2,
        worldWidth / 2,
        worldHeight / 2,
        -worldHeight / 2,
        0.1,
        10
      )
      camera.position.z = 4
      const geometry = new THREE.BufferGeometry()
      const positionAttribute = new THREE.BufferAttribute(initialPositions, 3)
      const normalAttribute = new THREE.BufferAttribute(
        new Float32Array(columns * rows * 3),
        3
      )
      for (let point = 0; point < columns * rows; point++)
        normalAttribute.array[point * 3 + 2] = 1
      const indexAttribute = new THREE.BufferAttribute(
        new Uint32Array((columns - 1) * (rows - 1) * 6),
        1
      )
      indexAttribute.array.set(createIndices(columns, rows))
      let visibleIndexCount = indexAttribute.array.length
      geometry.setAttribute("position", positionAttribute)
      geometry.setAttribute("normal", normalAttribute)
      geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2))
      geometry.setIndex(indexAttribute)
      geometry.setDrawRange(0, indexAttribute.count)

      const paperCanvas = drawDocument(currentWidth, currentHeight, dpr, {
        accentColor,
        artwork,
        description,
        eyebrow,
        paperColor,
        title,
      })
      const texture = new THREE.CanvasTexture(paperCanvas)
      texture.colorSpace = THREE.SRGBColorSpace
      texture.minFilter = THREE.LinearFilter
      texture.magFilter = THREE.LinearFilter
      const material = new THREE.MeshStandardMaterial({
        map: texture,
        metalness: 0,
        roughness: 0.82,
        side: THREE.DoubleSide,
        transparent: paperColor === "transparent",
      })
      const mesh = new THREE.Mesh(geometry, material)
      scene.add(mesh)
      scene.add(new THREE.HemisphereLight(0xffffff, 0x28354d, 2.4))
      const keyLight = new THREE.DirectionalLight(0xffffff, 2.2)
      keyLight.position.set(-1.2, 1.5, 3)
      scene.add(keyLight)
      renderer.render(scene, camera)

      worker = new Worker(
        new URL("./tearable-document.worker.ts", import.meta.url)
      )
      worker.postMessage({
        type: "init",
        id: 1,
        width: worldWidth,
        height: worldHeight,
        columns,
        rows,
        tearRatio: 5.2,
        grabStrength: 0.6,
      })
      worker.onmessage = (message: MessageEvent<WorkerResult>) => {
        if (destroyed || message.data.type !== "result") return
        inFlight = false
        const positions = new Float32Array(message.data.positions)
        const normals = new Float32Array(message.data.normals)
        const indices = new Uint32Array(message.data.indices)
        positionAttribute.array.set(positions)
        positionAttribute.needsUpdate = true
        indexAttribute.array.set(indices)
        indexAttribute.needsUpdate = true
        normalAttribute.array.set(normals)
        normalAttribute.needsUpdate = true
        geometry.setDrawRange(0, message.data.drawCount)
        renderer?.render(scene, camera)

        transferBuffers = {
          indices: message.data.indices,
          normals: message.data.normals,
          positions: message.data.positions,
        }

        if (!tornRef.current && message.data.drawCount < visibleIndexCount) {
          tornRef.current = true
          onTearChange?.(true)
        }
        visibleIndexCount = message.data.drawCount

        if (pointerActive || message.data.active || settleFrames > 0) {
          if (!pointerActive) settleFrames -= 1
          start()
        }
      }
      worker.onerror = () => {
        fallbackRef.current?.classList.remove("hidden")
      }

      const onPointerDown = (event: PointerEvent) => {
        if (event.button !== 0 || pointerId !== null) return
        pointerId = event.pointerId
        pointerActive = true
        settleFrames = 0
        renderer?.domElement.setPointerCapture(event.pointerId)
        worker?.postMessage({
          type: "grab",
          id: 1,
          slot: 0,
          point: pointFromEvent(
            event,
            renderer!.domElement,
            worldWidth,
            worldHeight
          ),
        })
        start()
      }
      const onPointerMove = (event: PointerEvent) => {
        if (event.pointerId !== pointerId) return
        worker?.postMessage({
          type: "moveGrab",
          id: 1,
          slot: 0,
          point: pointFromEvent(
            event,
            renderer!.domElement,
            worldWidth,
            worldHeight
          ),
        })
        start()
      }
      const release = (event: PointerEvent) => {
        if (event.pointerId !== pointerId) return
        pointerId = null
        pointerActive = false
        settleFrames = reducedMotion ? 0 : 40
        if (renderer?.domElement.hasPointerCapture(event.pointerId))
          renderer.domElement.releasePointerCapture(event.pointerId)
        worker?.postMessage({ type: "releaseGrab", id: 1, slot: 0 })
        start()
      }
      renderer.domElement.addEventListener("pointerdown", onPointerDown)
      renderer.domElement.addEventListener("pointermove", onPointerMove)
      renderer.domElement.addEventListener("pointerup", release)
      renderer.domElement.addEventListener("pointercancel", release)
      renderer.domElement.addEventListener("lostpointercapture", release)
      cleanupCanvasEvents = () => {
        renderer?.domElement.removeEventListener("pointerdown", onPointerDown)
        renderer?.domElement.removeEventListener("pointermove", onPointerMove)
        renderer?.domElement.removeEventListener("pointerup", release)
        renderer?.domElement.removeEventListener("pointercancel", release)
        renderer?.domElement.removeEventListener("lostpointercapture", release)
      }
      disposeScene = () => {
        geometry.dispose()
        texture.dispose()
        material.dispose()
        // Explicitly release the GPU context. This matters during route
        // transitions and React development remounts, where stale contexts
        // can otherwise exhaust the browser's WebGL context limit.
        renderer?.forceContextLoss()
        renderer?.dispose()
        renderer?.domElement.remove()
        renderer = null
      }
    }

    const resizeObserver = new ResizeObserver(() => {
      const rect = host.getBoundingClientRect()
      if (
        Math.abs(rect.width - currentWidth) < 1 &&
        Math.abs(rect.height - currentHeight) < 1
      )
        return
      initialize()
    })
    initialize()
    resizeObserver.observe(host)

    return () => {
      destroyed = true
      stop()
      resizeObserver.disconnect()
      cleanupCanvasEvents()
      worker?.postMessage({ type: "dispose", id: 1 })
      worker?.terminate()
      disposeScene()
    }
  }, [
    accentColor,
    artwork,
    description,
    eyebrow,
    onTearChange,
    paperColor,
    title,
    descriptionId,
  ])

  return (
    <div
      className={cn("relative min-h-72 overflow-hidden rounded-2xl", className)}
    >
      <div className="absolute inset-0">{under}</div>
      <div
        ref={fallbackRef}
        className="absolute inset-0 z-10 grid place-items-center bg-muted p-6 text-center text-foreground"
      >
        {artwork === "pattern" ? null : (
          <div>
            <p className="font-mono text-[10px] tracking-[0.16em] text-foreground/55">
              TEARABLE DOCUMENT
            </p>
            <p className="mt-3 font-serif text-3xl leading-none">
              This effect needs WebGL.
            </p>
          </div>
        )}
      </div>
      <div ref={hostRef} className="absolute inset-0" />
      <p id={descriptionId} className="sr-only">
        Drag the document to deform it. Pull hard enough to tear it and expose
        the layer underneath.
      </p>
    </div>
  )
}
