import { Geist, Geist_Mono, Caveat } from "next/font/google"
import type { Metadata } from "next"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

const caveat = Caveat({
  subsets: ["latin"],
  weight: "700",
  variable: "--font-caveat",
})

export const metadata: Metadata = {
  title: {
    default: "Dev Sethi — Product engineer",
    template: "%s — Dev Sethi",
  },
  description:
    "The work, experiments, and notes of Dev Sethi, a product engineer and full-stack developer in Delhi.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        caveat.variable,
        "font-sans",
        geist.variable
      )}
    >
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
