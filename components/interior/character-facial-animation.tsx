"use client"

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react"
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react"
import { cn } from "@/lib/utils"

const moods = [
  {
    name: "curious",
    label: "Curious",
    color: "#59d8d1",
    brow: "none",
    eye: { cy: 61, rx: 9.5, ry: 14, leftRotate: 7, rightRotate: 7 },
    pupil: { rx: 4.2, ry: 5.9 },
  },
  {
    name: "focused",
    label: "Focused",
    color: "#5f96d8",
    brow: "swoop",
    eye: { cy: 64, rx: 10, ry: 13.5, leftRotate: -2, rightRotate: 4 },
    pupil: { rx: 4.1, ry: 5.7 },
  },
  {
    name: "determined",
    label: "Determined",
    color: "#4934dc",
    brow: "heavy",
    eye: { cy: 67, rx: 10.5, ry: 10.5, leftRotate: -8, rightRotate: 8 },
    pupil: { rx: 4.4, ry: 4.8 },
  },
  {
    name: "bright",
    label: "Bright",
    color: "#a4ed35",
    brow: "arch",
    eye: { cy: 64, rx: 10, ry: 13, leftRotate: -5, rightRotate: 5 },
    pupil: { rx: 4, ry: 5.4 },
  },
  {
    name: "startled",
    label: "Startled",
    color: "#e34e0e",
    brow: "worried",
    eye: { cy: 67, rx: 10.5, ry: 14.5, leftRotate: 8, rightRotate: -8 },
    pupil: { rx: 3.8, ry: 5 },
  },
  {
    name: "mischievous",
    label: "Mischievous",
    color: "#6500d8",
    brow: "curl",
    eye: { cy: 68, rx: 11.5, ry: 8.5, leftRotate: 11, rightRotate: -11 },
    pupil: { rx: 4.2, ry: 4.4 },
  },
] as const

export type CharacterMood = (typeof moods)[number]["name"]

export type CharacterFacialAnimationProps = {
  className?: string
  defaultMood?: CharacterMood
  onMoodChange?: (mood: CharacterMood) => void
}

const bodyPath =
  "M48 20C56 13 67 13 73 20C77 25 77 31 73 37C80 32 89 31 96 37C103 43 100 53 94 61C91 65 87 68 82 69C90 69 98 73 99 81C101 90 93 98 84 102C75 106 67 101 62 93C59 102 52 109 43 108C33 107 29 98 32 88C24 93 15 92 11 84C7 76 12 67 20 61C24 57 28 54 33 53C24 53 17 49 17 41C17 32 27 27 36 27C40 27 45 25 48 20Z"

const confetti = [
  { kind: "ray", dx: -58, dy: -48, rotate: -23, color: "#59d8d1", delay: 0 },
  { kind: "ray", dx: 62, dy: -18, rotate: 106, color: "#59d8d1", delay: 0.02 },
  { kind: "ray", dx: -52, dy: 43, rotate: 50, color: "#59d8d1", delay: 0.04 },
  { kind: "ray", dx: 16, dy: 62, rotate: 8, color: "#59d8d1", delay: 0.01 },
  { kind: "dot", dx: 37, dy: -51, rotate: 0, color: "#e34e0e", delay: 0.03 },
  { kind: "dot", dx: -46, dy: -8, rotate: 0, color: "#a4ed35", delay: 0.07 },
  { kind: "dot", dx: 56, dy: 30, rotate: 0, color: "#6500d8", delay: 0.01 },
  { kind: "dot", dx: -31, dy: 57, rotate: 0, color: "#5f96d8", delay: 0.08 },
  { kind: "dot", dx: 12, dy: -67, rotate: 0, color: "#6500d8", delay: 0.06 },
] as const

function Brows({ type }: { type: (typeof moods)[number]["brow"] }) {
  const shared = {
    fill: "none",
    stroke: "#191917",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  }

  if (type === "none") return null
  if (type === "swoop") {
    return <path {...shared} d="M39 45C48 50 60 50 71 42" strokeWidth="6" />
  }
  if (type === "heavy") {
    return <path {...shared} d="M37 47C48 53 64 52 78 43" strokeWidth="8.5" />
  }
  if (type === "arch") {
    return <path {...shared} d="M39 47C45 35 66 32 78 45" strokeWidth="4.5" />
  }
  if (type === "worried") {
    return (
      <>
        <path {...shared} d="M39 49C42 39 50 38 55 46" strokeWidth="4.5" />
        <path {...shared} d="M61 46C67 37 76 40 79 50" strokeWidth="4.5" />
      </>
    )
  }
  return (
    <path
      {...shared}
      d="M39 48C47 40 55 43 55 49C55 56 44 55 47 47C51 36 69 38 77 47"
      strokeWidth="5.5"
    />
  )
}

export function CharacterFacialAnimation({
  className,
  defaultMood = "curious",
  onMoodChange,
}: CharacterFacialAnimationProps) {
  const reduceMotion = useReducedMotion()
  const initialMood = Math.max(
    0,
    moods.findIndex((mood) => mood.name === defaultMood)
  )
  const [moodIndex, setMoodIndex] = useState(initialMood)
  const [burstId, setBurstId] = useState(0)
  const [bursting, setBursting] = useState(false)
  const [blinking, setBlinking] = useState(false)
  const resetTimer = useRef<number | null>(null)
  const blinkOpenTimer = useRef<number | null>(null)

  const pupilXTarget = useMotionValue(0)
  const pupilYTarget = useMotionValue(0)
  const bodyXTarget = useMotionValue(0)
  const bodyYTarget = useMotionValue(0)
  const bodyRotateTarget = useMotionValue(0)

  const pupilX = useSpring(pupilXTarget, {
    stiffness: 390,
    damping: 29,
    mass: 0.45,
  })
  const pupilY = useSpring(pupilYTarget, {
    stiffness: 390,
    damping: 29,
    mass: 0.45,
  })
  const bodyX = useSpring(bodyXTarget, {
    stiffness: 115,
    damping: 20,
    mass: 0.85,
  })
  const bodyY = useSpring(bodyYTarget, {
    stiffness: 115,
    damping: 20,
    mass: 0.85,
  })
  const bodyRotate = useSpring(bodyRotateTarget, {
    stiffness: 95,
    damping: 18,
    mass: 0.9,
  })

  useEffect(() => {
    return () => {
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current)
      if (blinkOpenTimer.current !== null)
        window.clearTimeout(blinkOpenTimer.current)
    }
  }, [])

  useEffect(() => {
    if (reduceMotion) return

    const blinkTimer = window.setInterval(() => {
      if (bursting) return
      setBlinking(true)
      if (blinkOpenTimer.current !== null)
        window.clearTimeout(blinkOpenTimer.current)
      blinkOpenTimer.current = window.setTimeout(() => setBlinking(false), 180)
    }, 2400)

    return () => window.clearInterval(blinkTimer)
  }, [bursting, reduceMotion])

  const resetGaze = () => {
    pupilXTarget.set(0)
    pupilYTarget.set(0)
    bodyXTarget.set(0)
    bodyYTarget.set(0)
    bodyRotateTarget.set(0)
  }

  const trackPointer = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "touch") return

    const bounds = event.currentTarget.getBoundingClientRect()
    const dx = event.clientX - (bounds.left + bounds.width / 2)
    const dy = event.clientY - (bounds.top + bounds.height / 2)
    const distance = Math.max(1, Math.hypot(dx, dy))
    const gazeDistance = Math.min(7, distance * 0.055)
    const unitX = dx / distance
    const unitY = dy / distance

    pupilXTarget.set(unitX * gazeDistance)
    pupilYTarget.set(unitY * gazeDistance)
    bodyXTarget.set((dx / bounds.width) * 5)
    bodyYTarget.set((dy / bounds.height) * 4)
    bodyRotateTarget.set((dx / bounds.width) * 3.2)
  }

  const changeMood = () => {
    const nextIndex = (moodIndex + 1) % moods.length
    setBlinking(false)
    setMoodIndex(nextIndex)
    setBurstId((value) => value + 1)
    setBursting(true)
    onMoodChange?.(moods[nextIndex].name)

    if (resetTimer.current !== null) window.clearTimeout(resetTimer.current)
    resetTimer.current = window.setTimeout(
      () => setBursting(false),
      reduceMotion ? 80 : 850
    )
  }

  const mood = moods[moodIndex]
  const impactAnimation =
    burstId === 0 || reduceMotion
      ? { scaleX: 1, scaleY: 1, rotate: 0, y: 0 }
      : {
          scaleX: [1, 0.72, 1.18, 0.96, 1],
          scaleY: [1, 1.22, 0.78, 1.06, 1],
          rotate: [0, -4, 5, -2, 0],
          y: [0, 4, -3, 1, 0],
        }

  return (
    <button
      aria-label={`Character mood: ${mood.label}. Click to change its expression.`}
      className={cn(
        "relative block aspect-4/3 w-full cursor-default touch-manipulation overflow-hidden rounded-xl border bg-muted outline-none select-none focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:ring-offset-2",
        className
      )}
      onBlur={resetGaze}
      onClick={changeMood}
      onPointerLeave={resetGaze}
      onPointerMove={trackPointer}
      type="button"
    >
      <span className="sr-only" aria-live="polite">
        {mood.label} expression
      </span>
      <svg
        aria-hidden="true"
        className="block h-full w-full"
        preserveAspectRatio="xMidYMid meet"
        viewBox="0 0 714 706"
      >
        <motion.g
          animate={
            reduceMotion
              ? undefined
              : {
                  x: [0, 3, -2.5, 1.5, 0],
                  y: [1, -7, -1, 4, 1],
                  rotate: [-1.2, 1.8, -1.4, 0.8, -1.2],
                }
          }
          style={{ transformOrigin: "357px 353px" }}
          transition={{
            duration: 4.4,
            ease: "easeInOut",
            repeat: Infinity,
            times: [0, 0.27, 0.52, 0.78, 1],
          }}
        >
          <motion.g style={{ x: bodyX, y: bodyY, rotate: bodyRotate }}>
            <g transform="translate(288 284) scale(1.15)">
              <AnimatePresence>
                {bursting && !reduceMotion ? (
                  <motion.g key={`confetti-${burstId}`}>
                    {confetti.map((piece, index) => (
                      <motion.g
                        animate={{
                          opacity: [0, 1, 1, 0],
                          rotate: [
                            piece.rotate - 18,
                            piece.rotate,
                            piece.rotate + 14,
                          ],
                          scale: [0.25, 1, 1, 0.55],
                          x: [0, piece.dx * 0.86, piece.dx * 1.24],
                          y: [0, piece.dy * 0.86, piece.dy * 1.24],
                        }}
                        exit={{ opacity: 0 }}
                        initial={{ opacity: 0, scale: 0.25, x: 0, y: 0 }}
                        key={`${piece.kind}-${index}`}
                        style={{ transformOrigin: "60px 60px" }}
                        transition={{
                          delay: piece.delay,
                          duration: 0.72,
                          ease: [0.16, 1, 0.3, 1],
                          times: [0, 0.24, 0.62, 1],
                        }}
                      >
                        {piece.kind === "ray" ? (
                          <rect
                            fill={piece.color}
                            height="22"
                            rx="3"
                            width="6"
                            x="57"
                            y="49"
                          />
                        ) : (
                          <circle cx="60" cy="60" fill={piece.color} r="5" />
                        )}
                      </motion.g>
                    ))}
                  </motion.g>
                ) : null}
              </AnimatePresence>

              <motion.g
                animate={impactAnimation}
                initial={false}
                key={`impact-${burstId}`}
                style={{ transformOrigin: "60px 62px" }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : {
                        duration: 0.62,
                        ease: [0.22, 0.8, 0.24, 1],
                        times: [0, 0.16, 0.38, 0.7, 1],
                      }
                }
              >
                <motion.g
                  animate={
                    reduceMotion
                      ? undefined
                      : {
                          scaleX: [1, 1.055, 0.965, 1.035, 1],
                          scaleY: [1, 0.96, 1.05, 0.98, 1],
                        }
                  }
                  style={{ transformOrigin: "60px 62px" }}
                  transition={{
                    duration: 3.6,
                    ease: "easeInOut",
                    repeat: Infinity,
                    times: [0, 0.25, 0.52, 0.78, 1],
                  }}
                >
                  <motion.path
                    animate={{ fill: mood.color }}
                    d={bodyPath}
                    initial={false}
                    transform="translate(60 60) rotate(45) scale(1.22) translate(-60 -60)"
                    transition={{ duration: reduceMotion ? 0 : 0.12 }}
                  />
                </motion.g>

                <motion.g
                  animate={
                    burstId === 0 || reduceMotion
                      ? { opacity: 1, scaleX: 1, scaleY: 1 }
                      : {
                          opacity: [1, 0, 0, 1, 1],
                          scaleX: [1, 1.3, 0.72, 1.16, 1],
                          scaleY: [1, 0.08, 0.08, 1.28, 1],
                        }
                  }
                  initial={false}
                  key={`face-${burstId}`}
                  style={{ transformOrigin: "60px 65px" }}
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : {
                          duration: 0.58,
                          ease: [0.22, 0.8, 0.24, 1],
                          times: [0, 0.17, 0.38, 0.7, 1],
                        }
                  }
                >
                  <Brows type={mood.brow} />

                  <motion.g
                    animate={{ scaleY: blinking ? 0.08 : 1 }}
                    initial={false}
                    style={{ transformOrigin: `60px ${mood.eye.cy}px` }}
                    transition={{
                      duration: blinking ? 0.08 : 0.14,
                      ease: blinking ? "easeIn" : "easeOut",
                    }}
                  >
                    <ellipse
                      cx="49"
                      cy={mood.eye.cy}
                      fill="#fffdf7"
                      rx={mood.eye.rx}
                      ry={mood.eye.ry}
                      transform={`rotate(${mood.eye.leftRotate} 49 ${mood.eye.cy})`}
                    />
                    <ellipse
                      cx="70"
                      cy={mood.eye.cy}
                      fill="#fffdf7"
                      rx={mood.eye.rx}
                      ry={mood.eye.ry}
                      transform={`rotate(${mood.eye.rightRotate} 70 ${mood.eye.cy})`}
                    />

                    <motion.g style={{ x: pupilX, y: pupilY }}>
                      <ellipse
                        cx="50"
                        cy={mood.eye.cy + 1}
                        fill="#191917"
                        rx={mood.pupil.rx}
                        ry={mood.pupil.ry}
                      />
                      <ellipse
                        cx="71"
                        cy={mood.eye.cy + 1}
                        fill="#191917"
                        rx={mood.pupil.rx}
                        ry={mood.pupil.ry}
                      />
                      {mood.name === "startled" ? (
                        <>
                          <circle
                            cx="48.8"
                            cy={mood.eye.cy - 1}
                            fill="#fffdf7"
                            r="1.35"
                          />
                          <circle
                            cx="69.8"
                            cy={mood.eye.cy - 1}
                            fill="#fffdf7"
                            r="1.35"
                          />
                        </>
                      ) : null}
                    </motion.g>

                    {mood.name === "bright" ? (
                      <path
                        d="M37 73C45 68 52 70 59 79C65 70 73 68 82 73L82 87H37Z"
                        fill={mood.color}
                      />
                    ) : null}
                  </motion.g>
                </motion.g>
              </motion.g>
            </g>
          </motion.g>
        </motion.g>
      </svg>
    </button>
  )
}
