"use client"

import { useId } from "react"

import styles from "./work-icon.module.css"

export type WorkIconKind = "clause" | "archway" | "pixel" | "revo" | "orbit"

/** Small sculpted glyphs: graphite cores, frosted faces, and polished edges. */
export function WorkIcon({ kind }: { kind: WorkIconKind }) {
  const id = useId().replace(/:/g, "")
  const paint = (name: string) => `url(#${id}-${name})`
  const core = paint("core")
  const glass = paint("glass")
  const edge = paint("edge")

  return (
    <span className={styles.tile} aria-hidden="true">
      <svg
        className={styles.icon}
        viewBox="0 0 64 64"
        fill="none"
        focusable="false"
      >
        <defs>
          <linearGradient
            id={`${id}-core`}
            x1="19"
            y1="12"
            x2="43"
            y2="53"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="var(--icon-core-top)" />
            <stop offset=".48" stopColor="var(--icon-core-mid)" />
            <stop offset="1" stopColor="var(--icon-core-bottom)" />
          </linearGradient>
          <linearGradient
            id={`${id}-glass`}
            x1="17"
            y1="18"
            x2="44"
            y2="48"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="var(--icon-glass-top)" stopOpacity=".96" />
            <stop
              offset=".46"
              stopColor="var(--icon-glass-mid)"
              stopOpacity=".86"
            />
            <stop
              offset="1"
              stopColor="var(--icon-glass-bottom)"
              stopOpacity=".7"
            />
          </linearGradient>
          <linearGradient
            id={`${id}-edge`}
            x1="18"
            y1="13"
            x2="45"
            y2="51"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="white" stopOpacity=".8" />
            <stop offset=".5" stopColor="white" stopOpacity=".16" />
            <stop offset="1" stopColor="white" stopOpacity=".03" />
          </linearGradient>
          <linearGradient
            id={`${id}-shine`}
            x1="23"
            y1="18"
            x2="35"
            y2="43"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="white" stopOpacity=".65" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <filter
            id={`${id}-shadow`}
            x="-45%"
            y="-40%"
            width="190%"
            height="200%"
            colorInterpolationFilters="sRGB"
          >
            <feDropShadow
              dx="0"
              dy="2"
              stdDeviation="1.7"
              floodColor="black"
              floodOpacity=".2"
            />
          </filter>
          <filter
            id={`${id}-blur`}
            x="-50%"
            y="-80%"
            width="200%"
            height="260%"
          >
            <feGaussianBlur stdDeviation="2" />
          </filter>
        </defs>

        <ellipse
          cx="33"
          cy="53"
          rx="15"
          ry="2.3"
          fill="black"
          opacity=".12"
          filter={paint("blur")}
        />

        {kind === "clause" && (
          <g filter={paint("shadow")}>
            <rect
              x="25"
              y="12"
              width="26"
              height="35"
              rx="7"
              transform="rotate(8 25 12)"
              fill={core}
              stroke={edge}
              strokeWidth=".75"
            />
            <path
              d="M14 26a7 7 0 0 1 7-7h15a7 7 0 0 1 7 7v21a7 7 0 0 1-7 7H21a7 7 0 0 1-7-7Z"
              fill={glass}
              stroke={edge}
            />
            <path d="M30 19h7v15l-3.5-3-3.5 3Z" fill={core} opacity=".9" />
            <path
              d="M20 38h10m-10 5h15"
              stroke="white"
              strokeOpacity=".55"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M16 33v-7a5 5 0 0 1 5-5h5"
              stroke={paint("shine")}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </g>
        )}

        {kind === "archway" && (
          <g filter={paint("shadow")}>
            <path
              d="M23 47V26a16 16 0 0 1 32 0v21a3 3 0 0 1-3 3h-7V27a6 6 0 0 0-12 0v23h-7a3 3 0 0 1-3-3Z"
              fill={core}
              stroke={edge}
              strokeWidth=".75"
            />
            <path
              d="M10 49V29a17 17 0 0 1 34 0v20a3 3 0 0 1-3 3h-8V29a6 6 0 0 0-12 0v23h-8a3 3 0 0 1-3-3Z"
              fill={glass}
              stroke={edge}
            />
            <path
              d="M12 37v-8a15 15 0 0 1 15-15"
              stroke={paint("shine")}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M33 31v19"
              stroke="black"
              strokeOpacity=".13"
              strokeWidth="1.5"
            />
          </g>
        )}

        {kind === "pixel" && (
          <g filter={paint("shadow")} strokeLinejoin="round">
            <path
              d="m11 33 21-12 21 12v12L32 57 11 45Z"
              fill={core}
              stroke={edge}
              strokeWidth=".75"
            />
            <path d="m11 33 21 12 21-12-21-12Z" fill={glass} opacity=".65" />
            <path d="M32 45v12" stroke="white" strokeOpacity=".14" />
            <path d="m9 24 23-13 23 13-23 14Z" fill={glass} stroke={edge} />
            <path d="m9 24 23 14v7L9 32Z" fill={glass} opacity=".9" />
            <path d="m32 38 23-14v8L32 45Z" fill={glass} opacity=".55" />
            <path
              d="m12 24 20-11 20 11"
              stroke="white"
              strokeOpacity=".6"
              strokeLinecap="round"
            />
            <path d="m25 24 7-4 7 4-7 4Z" fill={core} opacity=".65" />
          </g>
        )}

        {kind === "revo" && (
          <g filter={paint("shadow")}>
            <path
              d="M12 13h22a8 8 0 0 1 8 8v13a8 8 0 0 1-8 8H23l-8 6v-7a8 8 0 0 1-7-8V21a8 8 0 0 1 4-8Z"
              fill={core}
              stroke={edge}
              strokeWidth=".75"
            />
            <path
              d="M29 25h18a9 9 0 0 1 9 9v10a9 9 0 0 1-9 9h-3v6l-9-6h-6a9 9 0 0 1-9-9V34a9 9 0 0 1 9-9Z"
              fill={glass}
              stroke={edge}
            />
            <path
              d="M22 39v-5a7 7 0 0 1 7-7h9"
              stroke={paint("shine")}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M29 39h.01M38 39h.01M47 39h.01"
              stroke="white"
              strokeOpacity=".7"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          </g>
        )}

        {kind === "orbit" && (
          <g filter={paint("shadow")}>
            <rect
              x="25"
              y="11"
              width="25"
              height="35"
              rx="6"
              transform="rotate(12 25 11)"
              fill={core}
              stroke={edge}
              strokeWidth=".75"
            />
            <rect
              x="17"
              y="19"
              width="26"
              height="34"
              rx="6"
              transform="rotate(-6 17 19)"
              fill={glass}
              stroke={edge}
            />
            <path
              d="m24 28 12-1m-11 7 10-1"
              stroke="white"
              strokeOpacity=".5"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M13 32C1 45 17 56 37 48c13-5 23-17 16-23"
              stroke={glass}
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <path
              d="M13 32C1 45 17 56 37 48c13-5 23-17 16-23"
              stroke={edge}
              strokeWidth=".8"
              strokeLinecap="round"
            />
            <circle cx="49" cy="39" r="4" fill={glass} stroke={edge} />
          </g>
        )}
      </svg>
    </span>
  )
}
