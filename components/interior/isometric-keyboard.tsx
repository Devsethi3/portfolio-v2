"use client"

import { useId, useRef, useState } from "react"
import { motion, useReducedMotion, type Transition } from "motion/react"
import { useSound } from "@/hooks/use-sound"
import { cn } from "@/lib/utils"
import { metalClickSound } from "@/lib/soundcn/metal-click"

type KeyTone = "light" | "accent"

type KeySpec = {
  id: string
  label: string
  tone: KeyTone
  x: number
  y: number
}

export type IsometricKeyboardProps = {
  className?: string
  onPress?: (label: string) => void
  sound?: boolean
}

const keys: KeySpec[] = [
  { id: "k", label: "K", tone: "light", x: 236, y: 92 },
  { id: "m", label: "M", tone: "light", x: 152, y: 140 },
  { id: "n", label: "N", tone: "light", x: 320, y: 140 },
  { id: "go", label: "GO", tone: "accent", x: 236, y: 188 },
]

const pressTransition: Transition = {
  damping: 22,
  mass: 0.42,
  stiffness: 440,
  type: "spring",
}

/* ---- Rounded, tapered keycap geometry --------------------------------- */
const WALL = 34
const TRAVEL = 8
const TOP_HALF = 34
const BOTTOM_HALF = 40
const TOP_RADIUS = 0.25
const BOTTOM_RADIUS = 0.18

type Point = [number, number]

const iso = (px: number, py: number): Point => [
  (px - py) * 0.866,
  (px + py) * 0.5,
]

type RoundedCorner = {
  control: Point
  mid: Point
  p1: Point
  p2: Point
}

type RoundedDiamond = {
  back: RoundedCorner
  front: RoundedCorner
  left: RoundedCorner
  right: RoundedCorner
}

const lerpPoint = (a: Point, b: Point, amount: number): Point => [
  a[0] + (b[0] - a[0]) * amount,
  a[1] + (b[1] - a[1]) * amount,
]

function roundedDiamond(half: number, radius: number, y = 0): RoundedDiamond {
  const corners = {
    back: iso(-half, -half),
    right: iso(half, -half),
    front: iso(half, half),
    left: iso(-half, half),
  }

  const corner = (from: Point, at: Point, to: Point): RoundedCorner => {
    const control: Point = [at[0], at[1] + y]
    const p1 = lerpPoint(control, [from[0], from[1] + y], radius)
    const p2 = lerpPoint(control, [to[0], to[1] + y], radius)
    return {
      control,
      mid: [
        (p1[0] + 2 * control[0] + p2[0]) / 4,
        (p1[1] + 2 * control[1] + p2[1]) / 4,
      ],
      p1,
      p2,
    }
  }

  return {
    back: corner(corners.left, corners.back, corners.right),
    right: corner(corners.back, corners.right, corners.front),
    front: corner(corners.right, corners.front, corners.left),
    left: corner(corners.front, corners.left, corners.back),
  }
}

function diamondPath(diamond: RoundedDiamond) {
  const { back, front, left, right } = diamond
  return `M ${back.p1[0]} ${back.p1[1]}
    Q ${back.control[0]} ${back.control[1]} ${back.p2[0]} ${back.p2[1]}
    L ${right.p1[0]} ${right.p1[1]}
    Q ${right.control[0]} ${right.control[1]} ${right.p2[0]} ${right.p2[1]}
    L ${front.p1[0]} ${front.p1[1]}
    Q ${front.control[0]} ${front.control[1]} ${front.p2[0]} ${front.p2[1]}
    L ${left.p1[0]} ${left.p1[1]}
    Q ${left.control[0]} ${left.control[1]} ${left.p2[0]} ${left.p2[1]}
    Z`
}

const topDiamond = roundedDiamond(TOP_HALF, TOP_RADIUS)
const topPath = diamondPath(topDiamond)
const surfacePath = diamondPath(roundedDiamond(TOP_HALF - 3.2, 0.28, -1.2))
const bottomDiamond = roundedDiamond(BOTTOM_HALF, BOTTOM_RADIUS, WALL)
const keyShadowPath = diamondPath(
  roundedDiamond(BOTTOM_HALF + 1.5, BOTTOM_RADIUS, WALL + 3)
)

function leftWallPath(drop: number) {
  const top = roundedDiamond(TOP_HALF, TOP_RADIUS, drop)
  const bottom = bottomDiamond
  const topFrontControl = lerpPoint(top.front.control, top.front.p2, 0.5)
  const bottomFrontControl = lerpPoint(
    bottom.front.control,
    bottom.front.p2,
    0.5
  )

  return `M ${top.left.p1[0]} ${top.left.p1[1]}
    L ${top.front.p2[0]} ${top.front.p2[1]}
    Q ${topFrontControl[0]} ${topFrontControl[1]} ${top.front.mid[0]} ${top.front.mid[1]}
    L ${bottom.front.mid[0]} ${bottom.front.mid[1]}
    Q ${bottomFrontControl[0]} ${bottomFrontControl[1]} ${bottom.front.p2[0]} ${bottom.front.p2[1]}
    L ${bottom.left.p1[0]} ${bottom.left.p1[1]}
    Q ${bottom.left.control[0]} ${bottom.left.control[1]} ${bottom.left.p2[0]} ${bottom.left.p2[1]}
    L ${top.left.p2[0]} ${top.left.p2[1]}
    Q ${top.left.control[0]} ${top.left.control[1]} ${top.left.p1[0]} ${top.left.p1[1]}
    Z`
}

function rightWallPath(drop: number) {
  const top = roundedDiamond(TOP_HALF, TOP_RADIUS, drop)
  const bottom = bottomDiamond
  const topFrontControl = lerpPoint(top.front.control, top.front.p1, 0.5)
  const bottomFrontControl = lerpPoint(
    bottom.front.control,
    bottom.front.p1,
    0.5
  )

  return `M ${top.front.mid[0]} ${top.front.mid[1]}
    Q ${topFrontControl[0]} ${topFrontControl[1]} ${top.front.p1[0]} ${top.front.p1[1]}
    L ${top.right.p2[0]} ${top.right.p2[1]}
    Q ${top.right.control[0]} ${top.right.control[1]} ${top.right.p1[0]} ${top.right.p1[1]}
    L ${bottom.right.p1[0]} ${bottom.right.p1[1]}
    Q ${bottom.right.control[0]} ${bottom.right.control[1]} ${bottom.right.p2[0]} ${bottom.right.p2[1]}
    L ${bottom.front.p1[0]} ${bottom.front.p1[1]}
    Q ${bottomFrontControl[0]} ${bottomFrontControl[1]} ${bottom.front.mid[0]} ${bottom.front.mid[1]}
    Z`
}

function Key({
  item,
  pressed,
  ids,
}: {
  item: KeySpec
  pressed: boolean
  ids: Record<string, string>
}) {
  const accent = item.tone === "accent"

  const topFill = `url(#${accent ? ids.accentTop : ids.lightTop})`
  const bevelFill = `url(#${accent ? ids.accentBevel : ids.lightBevel})`
  const leftFill = `url(#${accent ? ids.accentLeft : ids.lightLeft})`
  const rightFill = `url(#${accent ? ids.accentRight : ids.lightRight})`
  const labelFill = accent ? "#fff7ef" : "#525252"

  const drop = pressed ? TRAVEL : 0

  return (
    <g transform={`translate(${item.x} ${item.y})`}>
      <path
        d={keyShadowPath}
        fill="#050506"
        filter={`url(#${ids.keyShadow})`}
        opacity="0.5"
      />
      <motion.path
        animate={{ d: leftWallPath(drop) }}
        d={leftWallPath(0)}
        fill={leftFill}
        transition={pressTransition}
      />
      <motion.path
        animate={{ d: rightWallPath(drop) }}
        d={rightWallPath(0)}
        fill={rightFill}
        transition={pressTransition}
      />

      <motion.path
        animate={{ y: drop }}
        d={topPath}
        fill={bevelFill}
        stroke={accent ? "#a84413" : "#a5a5a2"}
        strokeOpacity="0.42"
        strokeWidth="0.8"
        transition={pressTransition}
      />

      <motion.g animate={{ y: drop }} transition={pressTransition}>
        <path d={surfacePath} fill={topFill} />
        <path
          d={surfacePath}
          fill="none"
          stroke={accent ? "#ffb17f" : "#ffffff"}
          strokeOpacity={accent ? "0.34" : "0.72"}
          strokeWidth="1.15"
        />
        <path
          d={`M ${topDiamond.left.p2[0]} ${topDiamond.left.p2[1]}
            L ${topDiamond.back.p1[0]} ${topDiamond.back.p1[1]}
            Q ${topDiamond.back.control[0]} ${topDiamond.back.control[1]} ${topDiamond.back.p2[0]} ${topDiamond.back.p2[1]}`}
          fill="none"
          stroke="#ffffff"
          strokeLinecap="round"
          strokeOpacity={accent ? "0.28" : "0.62"}
          strokeWidth="1.1"
        />
        <text
          dominantBaseline="middle"
          fill={labelFill}
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          fontSize={accent ? "18" : "19"}
          fontWeight={accent ? "600" : "500"}
          letterSpacing={accent ? "0.04em" : "0.01em"}
          textAnchor="middle"
          transform="matrix(0.866 0.5 -0.866 0.5 0 2)"
        >
          {item.label}
        </text>
      </motion.g>
    </g>
  )
}

export function IsometricKeyboard({
  className,
  onPress,
  sound = true,
}: IsometricKeyboardProps) {
  const id = useId()
  const [pressedKey, setPressedKey] = useState<string | null>(null)
  const releaseTimer = useRef<number | null>(null)
  const reduceMotion = useReducedMotion()
  const [play] = useSound(metalClickSound, {
    interrupt: true,
    soundEnabled: sound,
    volume: 0.25,
  })

  const ids = {
    accentTop: `kp-a-top-${id}`,
    accentBevel: `kp-a-bevel-${id}`,
    accentLeft: `kp-a-left-${id}`,
    accentRight: `kp-a-right-${id}`,
    lightTop: `kp-l-top-${id}`,
    lightBevel: `kp-l-bevel-${id}`,
    lightLeft: `kp-l-left-${id}`,
    lightRight: `kp-l-right-${id}`,
    keyShadow: `kp-key-shadow-${id}`,
    baseShadow: `kp-base-shadow-${id}`,
    deckShade: `kp-deck-shade-${id}`,
    rimLight: `kp-rim-light-${id}`,
  }

  const press = (item: KeySpec) => {
    if (releaseTimer.current) window.clearTimeout(releaseTimer.current)
    setPressedKey(item.id)
    if (!reduceMotion) {
      play({ playbackRate: item.tone === "accent" ? 0.94 : 1.04 })
    }
    onPress?.(item.label)
    releaseTimer.current = window.setTimeout(
      () => setPressedKey(null),
      reduceMotion ? 0 : 150
    )
  }

  return (
    <svg
      aria-label="A four key isometric keypad. Press any key."
      className={cn(
        "h-auto w-full touch-manipulation rounded-xl bg-muted",
        className
      )}
      role="group"
      viewBox="0 0 472 348"
    >
      <defs>
        {/* Keycap surface: broad soft highlight, like molded PBT plastic. */}
        <radialGradient
          id={ids.lightTop}
          cx="0"
          cy="0"
          fx="-13"
          fy="-13"
          gradientUnits="userSpaceOnUse"
          r="72"
        >
          <stop stopColor="#ffffff" />
          <stop offset="0.5" stopColor="#f1f1ef" />
          <stop offset="1" stopColor="#d6d6d3" />
        </radialGradient>
        <radialGradient
          id={ids.accentTop}
          cx="0"
          cy="0"
          fx="-13"
          fy="-13"
          gradientUnits="userSpaceOnUse"
          r="72"
        >
          <stop stopColor="#ff9c60" />
          <stop offset="0.52" stopColor="#f36f2d" />
          <stop offset="1" stopColor="#d95519" />
        </radialGradient>

        {/* Thin rolled lip between the top and the sloping skirt. */}
        <linearGradient
          id={ids.lightBevel}
          gradientUnits="userSpaceOnUse"
          x1="-38"
          x2="34"
          y1="-34"
          y2="34"
        >
          <stop stopColor="#ffffff" />
          <stop offset="0.48" stopColor="#e1e1df" />
          <stop offset="1" stopColor="#b8b8b5" />
        </linearGradient>
        <linearGradient
          id={ids.accentBevel}
          gradientUnits="userSpaceOnUse"
          x1="-38"
          x2="34"
          y1="-34"
          y2="34"
        >
          <stop stopColor="#ff9b5a" />
          <stop offset="0.5" stopColor="#e75f20" />
          <stop offset="1" stopColor="#bd4311" />
        </linearGradient>

        {/* Opposing wall gradients make the taper readable at a glance. */}
        <linearGradient
          id={ids.lightLeft}
          gradientUnits="userSpaceOnUse"
          x1="-48"
          x2="8"
          y1="0"
          y2={WALL}
        >
          <stop stopColor="#d1d1cf" />
          <stop offset="0.44" stopColor="#adadaa" />
          <stop offset="1" stopColor="#858583" />
        </linearGradient>
        <linearGradient
          id={ids.accentLeft}
          gradientUnits="userSpaceOnUse"
          x1="-48"
          x2="8"
          y1="0"
          y2={WALL}
        >
          <stop stopColor="#df6a29" />
          <stop offset="0.48" stopColor="#b84a16" />
          <stop offset="1" stopColor="#873008" />
        </linearGradient>
        <linearGradient
          id={ids.lightRight}
          gradientUnits="userSpaceOnUse"
          x1="40"
          x2="-5"
          y1="0"
          y2={WALL}
        >
          <stop stopColor="#e3e3e1" />
          <stop offset="0.48" stopColor="#bdbdbb" />
          <stop offset="1" stopColor="#929290" />
        </linearGradient>
        <linearGradient
          id={ids.accentRight}
          gradientUnits="userSpaceOnUse"
          x1="40"
          x2="-5"
          y1="0"
          y2={WALL}
        >
          <stop stopColor="#f17a35" />
          <stop offset="0.5" stopColor="#cd571d" />
          <stop offset="1" stopColor="#99370b" />
        </linearGradient>

        <filter id={ids.keyShadow} height="175%" width="160%" x="-30%" y="-25%">
          <feGaussianBlur stdDeviation="5.5" />
          <feOffset dx="1" dy="5" />
        </filter>

        <linearGradient
          id={ids.deckShade}
          x1="0"
          x2="0"
          y1="60"
          y2="300"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#333335" />
          <stop offset="1" stopColor="#242426" />
        </linearGradient>
        <linearGradient
          id={ids.rimLight}
          x1="0"
          x2="0"
          y1="52"
          y2="290"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#ededec" />
          <stop offset="1" stopColor="#c4c4c2" />
        </linearGradient>

        <filter
          id={ids.baseShadow}
          height="170%"
          width="155%"
          x="-28%"
          y="-22%"
        >
          <feGaussianBlur in="SourceAlpha" stdDeviation="10" />
          <feOffset dy="16" />
          <feComponentTransfer>
            <feFuncA slope="0.34" type="linear" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ================= ROUNDED METAL TRAY ================= */}
      <g filter={`url(#${ids.baseShadow})`}>
        {/* Outer body (thickness of the tray). */}
        <path
          d="M32 176Q32 169 39 165L228 56Q234 53 240 56L433 165Q440 169 440 176V214Q440 221 433 225L240 336Q234 339 228 336L39 225Q32 221 32 214Z"
          fill="#5c5c5d"
        />
        {/* Top bevel of the rim (lit). */}
        <path
          d="M32 176Q32 169 39 165L228 56Q234 53 240 56L433 165Q440 169 440 176Q440 181 433 185L240 296Q234 299 228 296L39 185Q32 181 32 176Z"
          fill={`url(#${ids.rimLight})`}
        />
        {/* Inner rim wall (subtle dark step). */}
        <path
          d="M50 176Q50 172 55 169L229 68Q234 65 239 68L417 169Q422 172 422 176Q422 180 417 183L239 286Q234 289 229 286L55 183Q50 180 50 176Z"
          fill="#161618"
        />
        {/* Recessed dark deck. */}
        <path
          d="M60 175Q60 172 65 170L230 74Q234 72 238 74L407 170Q412 172 412 175Q412 178 407 180L238 278Q234 280 230 278L65 180Q60 178 60 175Z"
          fill={`url(#${ids.deckShade})`}
        />
      </g>

      {keys.map((item) => (
        <g
          aria-label={`Press ${item.label}`}
          className="cursor-pointer outline-none"
          key={item.id}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault()
              press(item)
            }
          }}
          onPointerDown={() => press(item)}
          role="button"
          tabIndex={0}
        >
          <Key
            ids={ids}
            item={item}
            pressed={pressedKey === item.id && !reduceMotion}
          />
        </g>
      ))}
    </svg>
  )
}
