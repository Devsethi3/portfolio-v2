"use client";

import { useId, useState } from "react";
import { motion, useReducedMotion, type Transition } from "motion/react";
import { cn } from "@/lib/utils";

export type BookmarkEffectProps = {
    className?: string;
    defaultSaved?: boolean;
    onChange?: (saved: boolean) => void;
};

const bookmarkPath =
    "M 457 274 Q 441 274 441 290 L 441 526 Q 441 537 450 531 L 514 490 Q 522 484 530 490 L 594 531 Q 603 537 603 526 L 603 290 Q 603 274 587 274 Z";

const backingPath =
    "M 438 282 Q 425 282 425 296 L 425 553 L 522 492 L 619 553 L 619 296 Q 619 282 606 282 Z";

const insetPath =
    "M 456 294 L 456 514 L 522 480 L 588 514 L 588 294";

const panelPath =
    "M 0 103 H 620 C 718 103 798 183 798 281 V 762 H 0 Z";

const liftTransition: Transition = {
    type: "spring",
    stiffness: 470,
    damping: 33,
    mass: 0.62,
};

export function BookmarkEffect({
    className,
    defaultSaved = false,
    onChange,
}: BookmarkEffectProps) {
    const rawId = useId();
    const id = rawId.replace(/:/g, "");
    const reduceMotion = useReducedMotion();
    const [saved, setSaved] = useState(defaultSaved);

    const ids = {
        backdrop: `bookmark-backdrop-${id}`,
        panel: `bookmark-panel-${id}`,
        panelRim: `bookmark-panel-rim-${id}`,
        recess: `bookmark-recess-${id}`,
        blue: `bookmark-blue-${id}`,
        blueSheen: `bookmark-blue-sheen-${id}`,
        backing: `bookmark-backing-${id}`,
        faceNoise: `bookmark-noise-${id}`,
        faceShadow: `bookmark-face-shadow-${id}`,
        insetShadow: `bookmark-inset-shadow-${id}`,
        backingShadow: `bookmark-backing-shadow-${id}`,
        floorShadow: `bookmark-floor-shadow-${id}`,
        clip: `bookmark-clip-${id}`,
    };

    const toggle = () => {
        const next = !saved;
        setSaved(next);
        onChange?.(next);
    };

    const instant = reduceMotion ? { duration: 0 } : undefined;

    return (
        <button
            aria-label={saved ? "Remove bookmark" : "Add bookmark"}
            aria-pressed={saved}
            className={cn(
                "group relative block aspect-[1026/762] w-full cursor-pointer rounded-xl touch-manipulation overflow-hidden bg-[#9299a3] text-left outline-none select-none",
                className,
            )}
            onClick={toggle}
            onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    toggle();
                }
            }}
            type="button"
        >
            <svg
                aria-hidden="true"
                className="block h-full w-full"
                preserveAspectRatio="xMidYMid slice"
                viewBox="0 0 1026 762"
            >
                <defs>
                    <radialGradient id={ids.backdrop} cx="49%" cy="48%" r="78%">
                        <stop offset="0" stopColor="#818994" />
                        <stop offset="0.58" stopColor="#737b87" />
                        <stop offset="1" stopColor="#68717d" />
                    </radialGradient>
                    <radialGradient id={ids.panel} cx="690" cy="205" r="760" gradientUnits="userSpaceOnUse">
                        <stop offset="0" stopColor="#edf0f4" />
                        <stop offset="0.22" stopColor="#dce1e7" />
                        <stop offset="0.33" stopColor="#d4dae1" />
                        <stop offset="0.42" stopColor="#c8cfd7" />
                        <stop offset="0.53" stopColor="#bbc2cc" />
                        <stop offset="0.64" stopColor="#abb3be" />
                        <stop offset="0.74" stopColor="#9ca6b3" />
                        <stop offset="0.9" stopColor="#838e9e" />
                        <stop offset="1" stopColor="#768292" />
                    </radialGradient>
                    <linearGradient id={ids.panelRim} x1="0" x2="798" y1="103" y2="762" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#f3f6f9" stopOpacity="0.76" />
                        <stop offset="0.56" stopColor="#ffffff" stopOpacity="0.92" />
                        <stop offset="0.82" stopColor="#f7f9fc" stopOpacity="0.86" />
                        <stop offset="1" stopColor="#e1e8f0" stopOpacity="0.68" />
                    </linearGradient>
                    <linearGradient id={ids.recess} x1="0" x2="0" y1="274" y2="536" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#c0c8d7" />
                        <stop offset="0.2" stopColor="#c2cad8" />
                        <stop offset="0.64" stopColor="#b8c0cf" />
                        <stop offset="1" stopColor="#aeb8c7" />
                    </linearGradient>
                    <radialGradient id={ids.backing} cx="560" cy="330" r="255" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#ffffff" />
                        <stop offset="0.42" stopColor="#f7f9fd" />
                        <stop offset="0.72" stopColor="#e8edf5" />
                        <stop offset="1" stopColor="#cbd6e6" />
                    </radialGradient>
                    <linearGradient id={ids.blue} x1="0" x2="0" y1="274" y2="536" gradientUnits="userSpaceOnUse">
                        <stop offset="0" stopColor="#89d9fe" />
                        <stop offset="0.07" stopColor="#7acafd" />
                        <stop offset="0.15" stopColor="#4aacf9" />
                        <stop offset="0.23" stopColor="#2978e3" />
                        <stop offset="0.29" stopColor="#163ff0" />
                        <stop offset="0.35" stopColor="#0a1eda" />
                        <stop offset="0.43" stopColor="#06118b" />
                        <stop offset="0.5" stopColor="#040b6e" />
                        <stop offset="0.58" stopColor="#030891" />
                        <stop offset="0.68" stopColor="#040d77" />
                        <stop offset="0.76" stopColor="#091cd6" />
                        <stop offset="0.86" stopColor="#1439e3" />
                        <stop offset="1" stopColor="#174fff" />
                    </linearGradient>
                    <linearGradient id={ids.blueSheen} x1="0" x2="0" y1="274" y2="536" gradientUnits="userSpaceOnUse">
                        <stop offset="0" stopColor="#ffffff" stopOpacity="0.42" />
                        <stop offset="0.065" stopColor="#d9f7ff" stopOpacity="0.2" />
                        <stop offset="0.14" stopColor="#9ae7ff" stopOpacity="0.04" />
                        <stop offset="0.42" stopColor="#00106a" stopOpacity="0.06" />
                        <stop offset="0.64" stopColor="#000033" stopOpacity="0.18" />
                        <stop offset="0.86" stopColor="#004aff" stopOpacity="0.08" />
                        <stop offset="1" stopColor="#62a0ff" stopOpacity="0.2" />
                    </linearGradient>
                    <filter id={ids.insetShadow} x="-18%" y="-12%" width="136%" height="140%" colorInterpolationFilters="sRGB">
                        <feGaussianBlur in="SourceAlpha" result="softShape" stdDeviation="5.5" />

                        <feOffset dx="5" dy="5" in="softShape" result="darkOffset" />
                        <feComposite in="SourceAlpha" in2="darkOffset" k2="1" k3="-1" operator="arithmetic" result="darkInsetAlpha" />
                        <feFlood floodColor="#53647e" floodOpacity="0.52" result="darkColor" />
                        <feComposite in="darkColor" in2="darkInsetAlpha" operator="in" result="darkInset" />

                        <feOffset dx="-4" dy="-4" in="softShape" result="lightOffset" />
                        <feComposite in="SourceAlpha" in2="lightOffset" k2="1" k3="-1" operator="arithmetic" result="lightInsetAlpha" />
                        <feFlood floodColor="#edf1f6" floodOpacity="0.3" result="lightColor" />
                        <feComposite in="lightColor" in2="lightInsetAlpha" operator="in" result="lightInset" />

                        <feMerge>
                            <feMergeNode in="SourceGraphic" />
                            <feMergeNode in="lightInset" />
                            <feMergeNode in="darkInset" />
                        </feMerge>
                    </filter>
                    <filter id={ids.backingShadow} x="-55%" y="-30%" width="210%" height="205%">
                        <feDropShadow dx="-4" dy="20" floodColor="#16223f" floodOpacity="0.68" stdDeviation="11" />
                    </filter>
                    <filter id={ids.floorShadow} x="-85%" y="-160%" width="270%" height="420%">
                        <feGaussianBlur stdDeviation="18" />
                    </filter>
                    <filter id={ids.faceNoise} x="0" y="0" width="100%" height="100%">
                        <feTurbulence baseFrequency="0.62" numOctaves="3" seed="8" type="fractalNoise" />
                        <feColorMatrix type="saturate" values="0" />
                        <feComponentTransfer>
                            <feFuncA type="table" tableValues="0 0.32" />
                        </feComponentTransfer>
                    </filter>
                    <filter id={ids.faceShadow} x="-28%" y="-18%" width="156%" height="158%">
                        <feDropShadow dx="0" dy="7" floodColor="#001064" floodOpacity="0.72" stdDeviation="5" />
                    </filter>
                    <clipPath id={ids.clip}>
                        <path d={bookmarkPath} />
                    </clipPath>
                </defs>

                <rect width="1026" height="762" fill={`url(#${ids.backdrop})`} />

                <path d={panelPath} fill={`url(#${ids.panel})`} />
                <path
                    d={panelPath}
                    fill="none"
                    stroke={`url(#${ids.panelRim})`}
                    strokeWidth="2.1"
                />

                <motion.ellipse
                    animate={{ opacity: saved ? 0.32 : 0, rx: saved ? 92 : 55, ry: saved ? 25 : 12 }}
                    cx="518"
                    cy="553"
                    fill="#253349"
                    filter={`url(#${ids.floorShadow})`}
                    initial={false}
                    transition={instant ?? { delay: saved ? 0.14 : 0, duration: saved ? 0.36 : 0.2, ease: "easeOut" }}
                />

                <motion.path
                    animate={{
                        opacity: saved ? 1 : 0,
                        scaleX: saved ? 1 : 0.82,
                        scaleY: saved ? 1 : 0.9,
                        y: saved ? 0 : -19,
                    }}
                    d={backingPath}
                    fill={`url(#${ids.backing})`}
                    filter={`url(#${ids.backingShadow})`}
                    initial={false}
                    stroke="#f8fbff"
                    strokeWidth="2"
                    style={{ transformBox: "fill-box", transformOrigin: "center top" }}
                    transition={instant ?? (saved ? { ...liftTransition, delay: 0.14 } : { duration: 0.2, ease: [0.4, 0, 0.8, 0.4] })}
                />

                <motion.g
                    animate={{ scaleY: saved ? 0.975 : 1, y: saved ? -22 : 0 }}
                    initial={false}
                    style={{ transformBox: "fill-box", transformOrigin: "center top" }}
                    transition={instant ?? (saved ? { ...liftTransition, delay: 0.13 } : { duration: 0.23, ease: [0.45, 0, 0.65, 1] })}
                >
                    <path
                        d={bookmarkPath}
                        fill={`url(#${ids.recess})`}
                        filter={`url(#${ids.insetShadow})`}
                    />

                    <motion.path
                        animate={{ opacity: saved ? 1 : 0 }}
                        d={bookmarkPath}
                        fill={`url(#${ids.blue})`}
                        filter={`url(#${ids.faceShadow})`}
                        initial={false}
                        stroke="#087fe7"
                        strokeWidth="2.2"
                        transition={instant ?? { delay: saved ? 0 : 0.16, duration: saved ? 0.2 : 0.3, ease: "easeOut" }}
                    />
                    <motion.path
                        animate={{ opacity: saved ? 1 : 0 }}
                        d={bookmarkPath}
                        fill={`url(#${ids.blueSheen})`}
                        initial={false}
                        transition={instant ?? { delay: saved ? 0.03 : 0.13, duration: saved ? 0.24 : 0.28 }}
                    />
                    <motion.rect
                        animate={{ opacity: saved ? 0.42 : 0 }}
                        clipPath={`url(#${ids.clip})`}
                        fill="#ffffff"
                        filter={`url(#${ids.faceNoise})`}
                        height="270"
                        initial={false}
                        transition={instant ?? { delay: saved ? 0.14 : 0.08, duration: 0.22 }}
                        width="170"
                        x="437"
                        y="270"
                        style={{ mixBlendMode: "overlay" }}
                    />
                    <motion.path
                        animate={{ opacity: saved ? 0.56 : 0 }}
                        d={insetPath}
                        fill="none"
                        initial={false}
                        stroke="#d9f6ff"
                        strokeDasharray="4 4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.35"
                        transition={instant ?? { delay: saved ? 0.17 : 0.08, duration: 0.2 }}
                    />
                    <motion.path
                        animate={{ opacity: saved ? 0.62 : 0 }}
                        d="M 457 275 Q 442 275 442 290 L 442 525 Q 442 534 450 529 L 514 488 Q 522 482 530 488 L 594 529 Q 601 534 602 525"
                        fill="none"
                        initial={false}
                        stroke="#63baff"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="3"
                        transition={instant ?? { delay: saved ? 0.16 : 0.06, duration: 0.2 }}
                    />
                    <motion.path
                        animate={{ opacity: saved ? 0.42 : 0 }}
                        d="M 445 524 Q 445 530 451 526 L 514 486 Q 522 480 530 486 L 593 526 Q 599 530 599 524"
                        fill="none"
                        initial={false}
                        stroke="#f6fbff"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.8"
                        transition={instant ?? { delay: saved ? 0.18 : 0, duration: 0.18 }}
                    />
                </motion.g>

                <motion.path
                    animate={{ scaleY: saved ? 0.975 : 1, y: saved ? -22 : 0 }}
                    className="opacity-0 transition-opacity group-focus-visible:opacity-100"
                    d={bookmarkPath}
                    fill="none"
                    filter={`url(#${ids.floorShadow})`}
                    initial={false}
                    stroke="#eaf8ff"
                    strokeOpacity="0.42"
                    strokeLinejoin="round"
                    strokeWidth="7"
                    style={{ transformBox: "fill-box", transformOrigin: "center top" }}
                    transition={instant ?? (saved ? { ...liftTransition, delay: 0.13 } : { duration: 0.23, ease: [0.45, 0, 0.65, 1] })}
                />
            </svg>
            <span className="sr-only">{saved ? "Bookmarked" : "Not bookmarked"}</span>
        </button>
    );
}
