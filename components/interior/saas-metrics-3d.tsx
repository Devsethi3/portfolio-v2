"use client"

import { useEffect, useId, useRef, type CSSProperties } from "react"
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react"
import { cn } from "@/lib/utils"

type Product = {
  activeUsers: number
  activeUsersChange: string
  conversion: number
  conversionChange: string
  description: string
  id: "slack" | "notion" | "figma"
  mrr: number
  mrrChange: string
  name: string
  retention: number
  retentionChange: string
}

export type SaasMetrics3DProps = {
  className?: string
  style?: CSSProperties
}

const products: Product[] = [
  {
    id: "slack",
    name: "Slack",
    description: "Workplace communication tool",
    activeUsers: 18.3,
    conversion: 12.8,
    mrr: 75,
    retention: 89,
    activeUsersChange: "7.6% this month",
    conversionChange: "1.8% this month",
    mrrChange: "Market Leader",
    retentionChange: "4.5% this month",
  },
  {
    id: "notion",
    name: "Notion",
    description: "Collaboration & docs platform",
    activeUsers: 8.5,
    conversion: 9.1,
    mrr: 24,
    retention: 70,
    activeUsersChange: "2.7% this month",
    conversionChange: "1.2% this month",
    mrrChange: "2.3% this month",
    retentionChange: "6.4% this month",
  },
  {
    id: "figma",
    name: "Figma",
    description: "Design & prototyping software",
    activeUsers: 10.2,
    conversion: 15.4,
    mrr: 38,
    retention: 93,
    activeUsersChange: "5.9% this month",
    conversionChange: "2.6% this month",
    mrrChange: "8.5% this month",
    retentionChange: "13% this month",
  },
]

type BarProps = {
  badge: string
  baseY: number
  delay: number
  formatter: (value: number) => string
  height: number
  ids: Record<string, string>
  label: string
  layer: "annotation" | "backdrop" | "badge" | "geometry"
  tone: "green" | "blue" | "rose" | "yellow"
  value: number
  x: number
}

function MetricBar({
  badge,
  baseY,
  delay,
  formatter,
  height,
  ids,
  label,
  layer,
  tone,
  value,
  x,
}: BarProps) {
  const reduceMotion = useReducedMotion()
  const width = 66
  const depthX = 39
  const depthY = 13
  const faceSlope = -11
  const labelWidth =
    label === "Active Users"
      ? 68
      : label === "Conv."
        ? 44
        : label === "Retention"
          ? 56
          : 36
  const labelCenter = x + (width - depthX) / 2
  const labelX = labelCenter - labelWidth / 2
  const badgeWidth = badge === "Market Leader" ? 105 : 114
  const badgeX = x + width / 2 - badgeWidth / 2
  const badgeY = baseY - 10
  const valueRef = useRef<SVGTextElement>(null)

  // Keeping geometry in persistent motion values prevents React from ever
  // painting the destination shape before the spring begins.
  const heightTarget = useMotionValue(height)
  const valueTarget = useMotionValue(value)
  const springConfig = reduceMotion
    ? { damping: 1000, mass: 0.01, stiffness: 10000 }
    : {
        damping: 24,
        mass: 0.82,
        stiffness: 112,
        restDelta: 0.01,
        restSpeed: 0.01,
      }
  const smoothHeight = useSpring(heightTarget, springConfig)
  const smoothValue = useSpring(valueTarget, springConfig)

  useEffect(() => {
    const timer = window.setTimeout(
      () => {
        heightTarget.set(height)
        valueTarget.set(value)
      },
      reduceMotion ? 0 : delay * 1000
    )
    return () => window.clearTimeout(timer)
  }, [delay, height, heightTarget, reduceMotion, value, valueTarget])

  useMotionValueEvent(smoothValue, "change", (latest) => {
    if (valueRef.current) valueRef.current.textContent = formatter(latest)
  })

  const topY = useTransform(smoothHeight, (current) => baseY - current)
  const frontPath = useTransform(
    smoothHeight,
    (current) =>
      `M ${x} ${baseY - current} L ${x + width} ${baseY - current + faceSlope} L ${x + width} ${baseY + faceSlope} L ${x} ${baseY} Z`
  )
  const sidePath = useTransform(
    smoothHeight,
    (current) =>
      `M ${x} ${baseY - current} L ${x - depthX} ${baseY - current - depthY} L ${x - depthX} ${baseY - depthY} L ${x} ${baseY} Z`
  )
  const topPath = useTransform(
    smoothHeight,
    (current) =>
      `M ${x} ${baseY - current} L ${x - depthX} ${baseY - current - depthY} L ${x + width - depthX} ${baseY - current + faceSlope - depthY} L ${x + width} ${baseY - current + faceSlope} Z`
  )
  const capHighlight = useTransform(
    smoothHeight,
    (current) =>
      `M ${x - depthX + 2} ${baseY - current - depthY + 1} L ${x + width - depthX - 1} ${baseY - current + faceSlope - depthY + 1} L ${x + width - 2} ${baseY - current + faceSlope + 1}`
  )
  const tooltipY = useTransform(topY, (current) => current - 48)
  const valueY = useTransform(topY, (current) => current + 40)
  const backdropY = useTransform(topY, (current) => current - 104)
  const textureY = useTransform(topY, (current) => current + 48)
  const textureHeight = useTransform(smoothHeight, (current) =>
    Math.max(current - 48, 0)
  )
  if (layer === "backdrop") {
    return (
      <motion.rect
        fill={`url(#${ids[`${tone}Glow`]})`}
        height="104"
        width={width + depthX}
        x={x - depthX}
        y={backdropY}
      />
    )
  }

  if (layer === "geometry") {
    return (
      <g>
        <defs>
          <mask
            height={baseY}
            id={ids[`${tone}TextureMask`]}
            maskUnits="userSpaceOnUse"
            width={width + depthX}
            x={x - depthX}
            y="0"
          >
            <motion.rect
              fill={`url(#${ids.textureFade})`}
              height={textureHeight}
              width={width + depthX}
              x={x - depthX}
              y={textureY}
            />
          </mask>
        </defs>
        <motion.path
          d={sidePath}
          fill={`url(#${ids[`${tone}Side`]})`}
          stroke="#ffffff"
          strokeOpacity="0.66"
          strokeWidth="1"
        />
        <motion.path
          d={sidePath}
          fill={`url(#${ids[`${tone}Texture`]})`}
          mask={`url(#${ids[`${tone}TextureMask`]})`}
          opacity="0.32"
        />
        <motion.path
          d={frontPath}
          fill={`url(#${ids[`${tone}Front`]})`}
          stroke="#ffffff"
          strokeOpacity="0.48"
          strokeWidth="0.9"
        />
        <motion.path
          d={frontPath}
          fill={`url(#${ids[`${tone}Texture`]})`}
          mask={`url(#${ids[`${tone}TextureMask`]})`}
          opacity="0.42"
        />
        <motion.path
          d={topPath}
          fill={`url(#${ids[`${tone}Top`]})`}
          stroke="#ffffff"
          strokeOpacity="0.9"
          strokeWidth="1.15"
        />
        <motion.path
          d={capHighlight}
          fill="none"
          stroke="#ffffff"
          strokeLinecap="round"
          strokeOpacity="0.8"
          strokeWidth="1.2"
        />
      </g>
    )
  }

  if (layer === "annotation") {
    return (
      <g>
        <motion.g style={{ y: tooltipY }}>
          <rect
            fill={`url(#${ids[`${tone}Tooltip`]})`}
            height="24"
            rx="5.5"
            stroke="#ffffff"
            strokeOpacity="0.055"
            strokeWidth="0.7"
            width={labelWidth}
            x={labelX}
            y="0"
          />
          <path d={`M ${labelCenter - 4.5} 22 h9 l-4.5 6Z`} fill="#070809" />
          <text
            fill={`url(#${ids.tooltipText})`}
            fontSize="9.25"
            fontWeight="500"
            textAnchor="middle"
            x={labelCenter}
            y="15.5"
          >
            {label}
          </text>
        </motion.g>

        <motion.g style={{ y: valueY }}>
          <text
            ref={valueRef}
            fill={tone === "blue" || tone === "rose" ? "#f7f8f7" : "#202611"}
            fontSize="18"
            fontWeight="600"
            letterSpacing="-0.035em"
            textAnchor="middle"
            dominantBaseline="middle"
            transform={`translate(${x + width / 2} 0) skewY(-9.46) translate(${-x - width / 2} 0)`}
            x={x + width / 2}
            y="0"
          >
            {formatter(smoothValue.get())}
          </text>
        </motion.g>
      </g>
    )
  }

  if (tone === "blue") return null

  return (
    <g
      transform={`translate(${badgeX} ${badgeY}) rotate(-7 ${badgeWidth / 2} 11.5)`}
    >
      <rect
        fill={`url(#${ids.badgeFill})`}
        height="23"
        rx="11.5"
        stroke="#ffffff"
        strokeOpacity="0.12"
        strokeWidth="0.8"
        width={badgeWidth}
        x="0"
        y="0"
      />
      {badge === "Market Leader" ? (
        <>
          <circle cx="13" cy="11.5" fill="#c8e72d" opacity="0.12" r="7" />
          <circle
            cx="13"
            cy="11.5"
            fill="none"
            r="4.5"
            stroke="#c8e72d"
            strokeWidth="1.2"
          />
          <path
            d="M9.5 11.5h7M11.5 9.4l-2 2.1 2 2.1M14.5 9.4l2 2.1-2 2.1"
            fill="none"
            stroke="#c8e72d"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.2"
          />
        </>
      ) : (
        <>
          <circle cx="12" cy="11.5" fill="#22c55e" opacity="0.18" r="7.5" />
          <path
            d="m8.5 12.5 3.5-4 3.5 4M12 8.5v7"
            fill="none"
            stroke="#55e77d"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.4"
          />
        </>
      )}
      <text
        dominantBaseline="middle"
        fill="#ededeb"
        fontSize="10.2"
        fontWeight="500"
        x={badge === "Market Leader" ? 23 : 22}
        y="11.5"
      >
        {badge}
      </text>
    </g>
  )
}

function MetricsScene({ product }: { product: Product }) {
  const rawId = useId()
  const prefix = rawId.replaceAll(":", "")
  const ids = {
    badgeFill: `${prefix}-badge-fill`,
    textureFade: `${prefix}-texture-fade`,
    greenGlow: `${prefix}-green-glow`,
    greenFront: `${prefix}-green-front`,
    greenSide: `${prefix}-green-side`,
    greenTop: `${prefix}-green-top`,
    greenTexture: `${prefix}-green-texture`,
    greenTextureMask: `${prefix}-green-texture-mask`,
    greenTooltip: `${prefix}-green-tooltip`,
    blueGlow: `${prefix}-blue-glow`,
    blueFront: `${prefix}-blue-front`,
    blueSide: `${prefix}-blue-side`,
    blueTop: `${prefix}-blue-top`,
    blueTexture: `${prefix}-blue-texture`,
    blueTextureMask: `${prefix}-blue-texture-mask`,
    blueTooltip: `${prefix}-blue-tooltip`,
    roseGlow: `${prefix}-rose-glow`,
    roseFront: `${prefix}-rose-front`,
    roseSide: `${prefix}-rose-side`,
    roseTop: `${prefix}-rose-top`,
    roseTexture: `${prefix}-rose-texture`,
    roseTextureMask: `${prefix}-rose-texture-mask`,
    roseTooltip: `${prefix}-rose-tooltip`,
    yellowGlow: `${prefix}-yellow-glow`,
    yellowFront: `${prefix}-yellow-front`,
    yellowSide: `${prefix}-yellow-side`,
    yellowTop: `${prefix}-yellow-top`,
    yellowTexture: `${prefix}-yellow-texture`,
    yellowTextureMask: `${prefix}-yellow-texture-mask`,
    yellowTooltip: `${prefix}-yellow-tooltip`,
    platformBody: `${prefix}-platform-body`,
    platformDeck: `${prefix}-platform-deck`,
    platformRim: `${prefix}-platform-rim`,
    platformShadow: `${prefix}-platform-shadow`,
    tooltipText: `${prefix}-tooltip-text`,
  }

  const activeHeight = 96 + ((product.activeUsers - 8.5) / 9.8) * 128
  const conversionHeight = 112 + ((product.conversion - 9.1) / 6.3) * 24
  // Keep the blue column clearly above the foreground rose column for every
  // dataset, while preserving Slack's established maximum height.
  const mrrHeight = 164 + ((product.mrr - 24) / 51) * 60
  const retentionHeight = 164 + ((product.retention - 70) / 23) * 65
  const bars: Array<Omit<BarProps, "ids" | "layer">> = [
    {
      badge: product.mrrChange,
      baseY: 322,
      delay: 0.045,
      formatter: (number) => `$${Math.round(number)}M`,
      height: mrrHeight,
      label: "MRR",
      tone: "blue",
      value: product.mrr,
      x: 297,
    },
    {
      badge: product.activeUsersChange,
      baseY: 379,
      delay: 0,
      formatter: (number) => `${number.toFixed(1)}M`,
      height: activeHeight,
      label: "Active Users",
      tone: "green",
      value: product.activeUsers,
      x: 162,
    },
    {
      badge: product.retentionChange,
      baseY: 375,
      delay: 0.09,
      formatter: (number) => `${Math.round(number)}%`,
      height: retentionHeight,
      label: "Retention",
      tone: "yellow",
      value: product.retention,
      x: 443,
    },
    {
      badge: product.conversionChange,
      baseY: 412,
      delay: 0.135,
      formatter: (number) => `${number.toFixed(1)}%`,
      height: conversionHeight,
      label: "Conv.",
      tone: "rose",
      value: product.conversion,
      x: 328,
    },
  ]

  return (
    <svg
      aria-hidden="true"
      className="h-auto w-full overflow-visible"
      viewBox="0 0 650 500"
    >
      <defs>
        {(["green", "blue", "yellow", "rose"] as const).map((tone) => (
          <linearGradient
            id={ids[`${tone}Tooltip`]}
            key={tone}
            x1="0"
            x2="0"
            y1="0"
            y2="1"
          >
            <stop stopColor="#0c0d0e" />
            <stop offset="0.58" stopColor="#050607" />
            <stop
              offset="1"
              stopColor={`var(--metrics-${tone}-tooltip-bottom)`}
            />
          </linearGradient>
        ))}
        <linearGradient id={ids.tooltipText} x1="0" x2="1" y1="0" y2="0">
          <stop stopColor="#aeb0b0" />
          <stop offset="0.28" stopColor="#ffffff" />
          <stop offset="0.58" stopColor="#d6d8d8" />
          <stop offset="0.78" stopColor="#ffffff" />
          <stop offset="1" stopColor="#a3a5a5" />
        </linearGradient>
        <linearGradient id={ids.badgeFill} x1="0" x2="0" y1="0" y2="1">
          <stop stopColor="#252729" />
          <stop offset="1" stopColor="#151719" />
        </linearGradient>
        <linearGradient id={ids.textureFade} x1="0" x2="0" y1="0" y2="1">
          <stop stopColor="#ffffff" stopOpacity="0" />
          <stop offset="0.22" stopColor="#ffffff" stopOpacity="0.05" />
          <stop offset="0.58" stopColor="#ffffff" stopOpacity="0.58" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="1" />
        </linearGradient>
        <linearGradient id={ids.greenGlow} x1="0" x2="0" y1="0" y2="1">
          <stop stopColor="var(--metrics-green-glow-a)" stopOpacity="0.76" />
          <stop
            offset="0.55"
            stopColor="var(--metrics-green-glow-b)"
            stopOpacity="0.8"
          />
          <stop
            offset="1"
            stopColor="var(--metrics-green-glow-c)"
            stopOpacity="0.72"
          />
        </linearGradient>
        <linearGradient id={ids.blueGlow} x1="0" x2="0" y1="0" y2="1">
          <stop stopColor="var(--metrics-blue-glow-a)" stopOpacity="0.78" />
          <stop
            offset="0.55"
            stopColor="var(--metrics-blue-glow-b)"
            stopOpacity="0.82"
          />
          <stop
            offset="1"
            stopColor="var(--metrics-blue-glow-c)"
            stopOpacity="0.7"
          />
        </linearGradient>
        <linearGradient id={ids.roseGlow} x1="0" x2="0" y1="0" y2="1">
          <stop stopColor="var(--metrics-rose-glow-a)" stopOpacity="0.78" />
          <stop
            offset="0.55"
            stopColor="var(--metrics-rose-glow-b)"
            stopOpacity="0.82"
          />
          <stop
            offset="1"
            stopColor="var(--metrics-rose-glow-c)"
            stopOpacity="0.7"
          />
        </linearGradient>
        <linearGradient id={ids.yellowGlow} x1="0" x2="0" y1="0" y2="1">
          <stop stopColor="var(--metrics-yellow-glow-a)" stopOpacity="0.78" />
          <stop
            offset="0.55"
            stopColor="var(--metrics-yellow-glow-b)"
            stopOpacity="0.8"
          />
          <stop
            offset="1"
            stopColor="var(--metrics-yellow-glow-c)"
            stopOpacity="0.67"
          />
        </linearGradient>

        <linearGradient id={ids.greenFront} x1="0" x2="0" y1="0" y2="1">
          <stop stopColor="#64ee68" />
          <stop offset="0.48" stopColor="#38dc57" />
          <stop offset="1" stopColor="#16bd42" />
        </linearGradient>
        <linearGradient id={ids.greenSide} x1="0" x2="1">
          <stop stopColor="#59e965" />
          <stop offset="1" stopColor="#25c84a" />
        </linearGradient>
        <linearGradient id={ids.greenTop} x1="0" x2="1" y1="1" y2="0">
          <stop stopColor="#55e862" />
          <stop offset="0.55" stopColor="#74fa7b" />
          <stop offset="1" stopColor="#c0ffc3" />
        </linearGradient>
        <pattern
          id={ids.greenTexture}
          height="6"
          patternUnits="userSpaceOnUse"
          width="6"
        >
          <circle cx="1.5" cy="1.5" fill="#071b0d" r="0.75" />
        </pattern>

        <linearGradient id={ids.blueFront} x1="0" x2="0" y1="0" y2="1">
          <stop stopColor="#5743e8" />
          <stop offset="0.47" stopColor="#3d50dc" />
          <stop offset="1" stopColor="#1471c8" />
        </linearGradient>
        <linearGradient id={ids.blueSide} x1="0" x2="1">
          <stop stopColor="#5441dc" />
          <stop offset="1" stopColor="#2e5dd0" />
        </linearGradient>
        <linearGradient id={ids.blueTop} x1="0" x2="1" y1="1" y2="0">
          <stop stopColor="#5b43e9" />
          <stop offset="0.58" stopColor="#765ff7" />
          <stop offset="1" stopColor="#b9afff" />
        </linearGradient>
        <pattern
          id={ids.blueTexture}
          height="12"
          patternUnits="userSpaceOnUse"
          width="22"
        >
          <path
            d="M0 7c5-5 11 5 22 0"
            fill="none"
            stroke="#4fc3f7"
            strokeOpacity="0.55"
            strokeWidth="0.7"
          />
        </pattern>

        <linearGradient id={ids.roseFront} x1="0" x2="0" y1="0" y2="1">
          <stop stopColor="#ed4f74" />
          <stop offset="0.48" stopColor="#d92f5d" />
          <stop offset="1" stopColor="#9f1239" />
        </linearGradient>
        <linearGradient id={ids.roseSide} x1="0" x2="1">
          <stop stopColor="#db3b62" />
          <stop offset="1" stopColor="#a51640" />
        </linearGradient>
        <linearGradient id={ids.roseTop} x1="0" x2="1" y1="1" y2="0">
          <stop stopColor="#e9486c" />
          <stop offset="0.58" stopColor="#fb7185" />
          <stop offset="1" stopColor="#fecdd3" />
        </linearGradient>
        <pattern
          id={ids.roseTexture}
          height="7"
          patternUnits="userSpaceOnUse"
          width="7"
        >
          <path
            d="M0 7 7 0"
            fill="none"
            stroke="#650b2a"
            strokeOpacity="0.48"
            strokeWidth="0.65"
          />
        </pattern>

        <linearGradient id={ids.yellowFront} x1="0" x2="0" y1="0" y2="1">
          <stop stopColor="#f5d34a" />
          <stop offset="0.5" stopColor="#e7c035" />
          <stop offset="1" stopColor="#bc9414" />
        </linearGradient>
        <linearGradient id={ids.yellowSide} x1="0" x2="1">
          <stop stopColor="#f4ce42" />
          <stop offset="1" stopColor="#d1a91d" />
        </linearGradient>
        <linearGradient id={ids.yellowTop} x1="0" x2="1" y1="1" y2="0">
          <stop stopColor="#f3d046" />
          <stop offset="0.58" stopColor="#ffe477" />
          <stop offset="1" stopColor="#fff5ba" />
        </linearGradient>
        <pattern
          id={ids.yellowTexture}
          height="5"
          patternUnits="userSpaceOnUse"
          width="5"
        >
          <circle cx="1.25" cy="1.25" fill="#6b520d" r="0.5" />
        </pattern>

        <linearGradient
          id={ids.platformBody}
          x1="0"
          x2="0"
          y1="342"
          y2="488"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--metrics-platform-body-top)" />
          <stop offset="1" stopColor="var(--metrics-platform-body-bottom)" />
        </linearGradient>
        <linearGradient
          id={ids.platformRim}
          x1="0"
          x2="0"
          y1="238"
          y2="472"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--metrics-platform-rim-top)" />
          <stop offset="0.55" stopColor="var(--metrics-platform-rim-mid)" />
          <stop offset="1" stopColor="var(--metrics-platform-rim-bottom)" />
        </linearGradient>
        <linearGradient
          id={ids.platformDeck}
          x1="0"
          x2="0"
          y1="246"
          y2="464"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--metrics-platform-deck-top)" />
          <stop offset="1" stopColor="var(--metrics-platform-deck-bottom)" />
        </linearGradient>
        <filter
          id={ids.platformShadow}
          height="140%"
          width="120%"
          x="-10%"
          y="-12%"
        >
          <feGaussianBlur in="SourceAlpha" stdDeviation="7" />
          <feOffset dy="8" />
          <feComponentTransfer>
            <feFuncA slope="0.28" type="linear" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g
        filter={`url(#${ids.platformShadow})`}
        transform="translate(325 365) scale(1.06) translate(-325 -365)"
      >
        <path
          d="M26 354Q26 347 35 343L309 240Q317 237 325 240L615 343Q624 347 624 354V368Q624 375 615 379L330 485Q321 488 312 485L35 379Q26 375 26 368Z"
          fill={`url(#${ids.platformBody})`}
          stroke="var(--metrics-platform-lower-edge)"
          strokeWidth="1"
        />
        <path
          d="M26 354Q26 347 35 343L309 240Q317 237 325 240L615 343Q624 347 624 354Q624 360 615 364L330 469Q321 472 312 469L35 364Q26 361 26 354Z"
          fill={`url(#${ids.platformRim})`}
          stroke="var(--metrics-platform-outline)"
          strokeOpacity="0.72"
          strokeWidth="1"
        />
        <path
          d="M41 354Q41 350 47 347L310 249Q317 246 324 249L602 347Q609 350 609 354Q609 358 602 361L329 462Q321 465 313 462L47 361Q41 358 41 354Z"
          fill="var(--metrics-platform-inner)"
          stroke="var(--metrics-platform-inner-outline)"
          strokeOpacity="0.8"
          strokeWidth="0.75"
        />
        <path
          d="M49 353Q49 350 55 348L311 253Q317 251 323 253L594 348Q601 351 601 354Q601 357 594 359L328 457Q321 460 314 457L55 359Q49 357 49 353Z"
          fill={`url(#${ids.platformDeck})`}
          stroke="var(--metrics-platform-deck-outline)"
          strokeOpacity="0.9"
          strokeWidth="0.7"
        />
        <path
          d="M29 350Q31 346 37 343L309 241Q317 238 325 241L613 343Q619 345 622 350"
          fill="none"
          stroke="var(--metrics-platform-top-highlight)"
          strokeLinecap="round"
          strokeOpacity="0.72"
          strokeWidth="1.15"
        />
        <path
          d="M35 365L312 471Q321 474 330 471L615 365"
          fill="none"
          stroke="var(--metrics-platform-lip-highlight)"
          strokeLinecap="round"
          strokeOpacity="0.56"
          strokeWidth="0.9"
        />
        <path
          d="M35 379L312 485Q321 488 330 485L615 379"
          fill="none"
          stroke="var(--metrics-platform-lower-edge)"
          strokeLinecap="round"
          strokeOpacity="0.9"
          strokeWidth="1.05"
        />
      </g>

      {bars.map((bar) => (
        <MetricBar
          {...bar}
          ids={ids}
          key={`${bar.tone}-backdrop`}
          layer="backdrop"
        />
      ))}
      {bars.slice(0, -1).map((bar) => (
        <MetricBar
          {...bar}
          ids={ids}
          key={`${bar.tone}-geometry`}
          layer="geometry"
        />
      ))}
      {bars.slice(0, -1).map((bar) => (
        <MetricBar {...bar} ids={ids} key={`${bar.tone}-badge`} layer="badge" />
      ))}
      <MetricBar {...bars[bars.length - 1]} ids={ids} layer="geometry" />
      {bars.map((bar) => (
        <MetricBar
          {...bar}
          ids={ids}
          key={`${bar.tone}-annotation`}
          layer="annotation"
        />
      ))}
      <MetricBar {...bars[bars.length - 1]} ids={ids} layer="badge" />
    </svg>
  )
}

export function SaasMetrics3D({ className, style }: SaasMetrics3DProps) {
  const active = products[0]

  return (
    <section
      aria-label="Interactive SaaS performance metrics"
      className={cn(
        "relative isolate overflow-hidden bg-muted text-[var(--metrics-scene-fg)]",
        "[--metrics-blue-glow-a:#e5e4f3] [--metrics-blue-glow-b:#d8d7ef] [--metrics-blue-glow-c:#c3c1e8] [--metrics-blue-tooltip-bottom:#282466]",
        "[--metrics-control-bg:#f9faf8] [--metrics-control-border:#c9ccca] [--metrics-control-fg:#181a19] [--metrics-control-hover:#ffffff] [--metrics-control-muted:#737775] [--metrics-control-well:#e7e9e7]",
        "[--metrics-green-glow-a:#e1eee3] [--metrics-green-glow-b:#d0e8d5] [--metrics-green-glow-c:#b6ddbf] [--metrics-green-tooltip-bottom:#123d20]",
        "[--metrics-platform-body-bottom:#707475] [--metrics-platform-body-top:#adb1b1] [--metrics-platform-deck-bottom:#202324] [--metrics-platform-deck-outline:#5d6262] [--metrics-platform-deck-top:#343839]",
        "[--metrics-platform-inner-outline:#838787] [--metrics-platform-inner:#4a4e4f] [--metrics-platform-lip-highlight:#c3c6c5] [--metrics-platform-lower-edge:#545859] [--metrics-platform-outline:#f1f2f1]",
        "[--metrics-platform-rim-bottom:#777b7b] [--metrics-platform-rim-mid:#a1a5a4] [--metrics-platform-rim-top:#d4d6d5] [--metrics-platform-top-highlight:#ffffff]",
        "[--metrics-radial:#ffffff] [--metrics-rose-glow-a:#f5e1e7] [--metrics-rose-glow-b:#efcbd6] [--metrics-rose-glow-c:#e8aabe] [--metrics-rose-tooltip-bottom:#59152a] [--metrics-scene-bg:var(--muted)] [--metrics-scene-fg:#171918] [--metrics-yellow-glow-a:#f2ecd9] [--metrics-yellow-glow-b:#eadfb8] [--metrics-yellow-glow-c:#dfca8a] [--metrics-yellow-tooltip-bottom:#514011]",
        "dark:[--metrics-blue-glow-a:#0d0d12] dark:[--metrics-blue-glow-b:#111020] dark:[--metrics-blue-glow-c:#18143b] dark:[--metrics-blue-tooltip-bottom:#24205a]",
        "dark:[--metrics-control-bg:#17191a] dark:[--metrics-control-border:#343738] dark:[--metrics-control-fg:#ffffff] dark:[--metrics-control-hover:#202224] dark:[--metrics-control-muted:#8b8e8d] dark:[--metrics-control-well:#292c2d]",
        "dark:[--metrics-green-glow-a:#0b0e0c] dark:[--metrics-green-glow-b:#0a130d] dark:[--metrics-green-glow-c:#0b2713] dark:[--metrics-green-tooltip-bottom:#11351c]",
        "dark:[--metrics-platform-body-bottom:#252829] dark:[--metrics-platform-body-top:#4e5152] dark:[--metrics-platform-deck-bottom:#0d0f10] dark:[--metrics-platform-deck-outline:#2f3233] dark:[--metrics-platform-deck-top:#17191a]",
        "dark:[--metrics-platform-inner-outline:#3b3e3f] dark:[--metrics-platform-inner:#111314] dark:[--metrics-platform-lip-highlight:#666a6b] dark:[--metrics-platform-lower-edge:#17191a] dark:[--metrics-platform-outline:#85898a]",
        "dark:[--metrics-platform-rim-bottom:#303334] dark:[--metrics-platform-rim-mid:#444748] dark:[--metrics-platform-rim-top:#646768] dark:[--metrics-platform-top-highlight:#a7aaaa]",
        "dark:[--metrics-radial:#313538] dark:[--metrics-rose-glow-a:#120d0f] dark:[--metrics-rose-glow-b:#211016] dark:[--metrics-rose-glow-c:#3f1220] dark:[--metrics-rose-tooltip-bottom:#4a1424] dark:[--metrics-scene-bg:var(--muted)] dark:[--metrics-scene-fg:#ffffff] dark:[--metrics-yellow-glow-a:#0e0d0a] dark:[--metrics-yellow-glow-b:#171408] dark:[--metrics-yellow-glow-c:#33270a] dark:[--metrics-yellow-tooltip-bottom:#49380e]",
        className
      )}
      style={style}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_40%,var(--metrics-radial),transparent_42%)] opacity-25 dark:opacity-10" />
      <div className="relative px-2 pt-3 pb-5 sm:px-4 sm:pt-4">
        <div className="relative" id="saas-metrics-panel">
          <p className="sr-only">
            {active.name}: {active.activeUsers} million active users, $
            {active.mrr} million monthly recurring revenue, {active.retention}%
            retention, and {active.conversion}% conversion.
          </p>
          <MetricsScene product={active} />
        </div>
      </div>
    </section>
  )
}
