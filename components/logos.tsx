import type { SVGProps } from "react"

type LogoProps = SVGProps<SVGSVGElement>

const base = {
    viewBox: "0 0 24 24",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true,
} as const

export function ClauseLogo({ className = "fill-secondary", ...props }: LogoProps) {
    return (
        <svg {...base} className={className} {...props}>
            <defs>
                <mask id="clause-mask">
                    <rect width="24" height="24" fill="#fff" />
                    <g fill="#000">
                        {/* top feather */}
                        <path d="M6.6 17.6C6.7 11.6 10.7 6.9 18.4 5.6c-.4 2.7-1.9 4.7-4.4 5.8-2.5 1.1-5 3-7.4 6.2Z" />
                        {/* middle feather */}
                        <path d="M8.1 17.5c1.9-2.8 4.3-4.5 7.4-5.3-.6 1.8-2.1 3.1-4.1 3.6-1.3.3-2.4.9-3.3 1.7Z" />
                        {/* bottom feather */}
                        <path d="M9.4 17.9c1.3-.9 2.6-1.2 4-1.4-.9 1.3-2.3 1.8-4 1.4Z" />
                        {/* stem */}
                        <path d="M5.4 18.9l1.6-1.7.7.6-1.6 1.7a.5.5 0 0 1-.7-.6Z" />
                    </g>
                </mask>
            </defs>
            <rect width="24" height="24" rx="6" mask="url(#clause-mask)" />
        </svg>
    )
}

export function ArchwayLogo({ className = "fill-secondary", ...props }: LogoProps) {
    return (
        <svg {...base} className={className} {...props}>
            <defs>
                <mask id="archway-mask">
                    <rect width="24" height="24" fill="#fff" />
                    <g fill="none" stroke="#000" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        {/* outer arch */}
                        <path d="M6.5 18V12a5.5 5.5 0 0 1 11 0v6" />
                        {/* inner loop / crossbar */}
                        <path d="M10.2 18v-2.3a1.8 1.8 0 0 1 1.8-1.8h5.5" />
                    </g>
                </mask>
            </defs>
            <rect width="24" height="24" rx="6" mask="url(#archway-mask)" />
        </svg>
    )
}

export function PixelLogo({ className = "fill-secondary", ...props }: LogoProps) {
    return (
        <svg {...base} className={className} {...props}>
            {/* lighter arms */}
            <rect x="10" y="2.5" width="3.2" height="8" rx="1" opacity="0.55" />
            <rect x="13.5" y="10" width="8" height="3.2" rx="1" opacity="0.55" />
            {/* solid arms */}
            <rect x="10.8" y="13.5" width="3.2" height="8" rx="1" />
            <rect x="2.5" y="10.8" width="8" height="3.2" rx="1" />
        </svg>
    )
}

export function RevoLogo({ className = "fill-secondary", ...props }: LogoProps) {
    return (
        <svg {...base} className={className} {...props}>
            {/* body of the R with the counter cut out */}
            <path
                fillRule="evenodd"
                d="M3.5 7.5a4 4 0 0 1 4-4h7.8a5.2 5.2 0 0 1 1.6 10.15V14.5h-5.4a2 2 0 0 0-2 2V20.5H3.5Zm5.2.9v2.9h6.4a1.45 1.45 0 0 0 0-2.9Z"
            />
            {/* leg, lighter tone for the fold */}
            <path d="M12.2 14.5h4.6l3.9 6h-4.9Z" opacity="0.6" />
        </svg>
    )
}

export function OrbitLogo({ className = "fill-secondary", ...props }: LogoProps) {
    return (
        <svg {...base} className={className} {...props}>
            {/* back plane (lighter) */}
            <path d="M11.2 4H21l-5.6 8H5.6Z" opacity="0.55" />
            {/* front plane (solid) */}
            <path d="M8.6 12h9.8l-5.6 8H3Z" />
        </svg>
    )
}
