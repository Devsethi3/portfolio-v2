import { ArrowRight01Icon, ArrowUpRight01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Link from "next/link"

const fragments = [
  {
    href: "/fragments/testing-expo-apps-with-maestro",
    title: "Testing Expo apps with Maestro",
    topic: "Mobile · Testing",
    year: "2026",
  },
]

export function CaseStudiesSection() {
  return (
    <section id="case-studies" aria-labelledby="case-studies-heading">
      <div className="mb-5 flex items-center justify-between text-xs">
        <h2 id="case-studies-heading" className="text-foreground/50">
          fragments <span className="mx-1.5">/</span>
          <span>0{fragments.length}</span>
        </h2>
        <a
          href="#case-studies"
          className="group inline-flex items-center gap-1 text-xs text-foreground/50 transition-colors hover:text-foreground focus-visible:text-foreground"
        >
          All fragments
          <HugeiconsIcon
            icon={ArrowRight01Icon}
            strokeWidth={2}
            className="size-3 transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </a>
      </div>
      <ul className="divide-y border-y">
        {fragments.map((fragment) => (
          <li key={fragment.href}>
            <Link
              href={fragment.href}
              scroll
              className="group flex items-center gap-4 py-5 outline-none transition-colors focus-visible:bg-muted/60"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium underline-offset-4 group-hover:underline group-focus-visible:underline">
                  {fragment.title}
                </span>
                <span className="mt-1 block text-xs text-foreground/60">
                  {fragment.topic}
                </span>
              </span>
              <time
                dateTime={fragment.year}
                className="text-xs text-foreground/50"
              >
                {fragment.year}
              </time>
              <HugeiconsIcon
                icon={ArrowUpRight01Icon}
                strokeWidth={2}
                className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground group-focus-visible:text-foreground"
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
