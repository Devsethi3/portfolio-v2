import {
  ArrowRight01Icon,
  ArrowUpRight01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { WorkIcon, type WorkIconKind } from "./work-icon"

const work = [
  {
    company: "Clause",
    summary: "Create and manage contracts",
    icon: "clause",
  },
  {
    company: "Archway",
    summary: "Visual architecture design Canvas",
    icon: "archway",
  },
  {
    company: "Pixel",
    summary: "Open source shaders library",
    icon: "pixel",
  },
  {
    company: "Revo",
    summary: "Collaborative messaging tool",
    icon: "revo",
  },
  {
    company: "Orbit",
    summary: "Collaborative Document Editing Platform",
    icon: "orbit",
  },
] satisfies { company: string; summary: string; icon: WorkIconKind }[]

export function WorkSection() {
  return (
    <section id="work" aria-labelledby="work-heading">
      <div className="mb-5 flex items-center justify-between text-xs">
        <h2 id="work-heading" className="text-foreground/50">
          work <span className="mx-1.5">/</span>
          <span>{work.length}</span>
        </h2>
        <a
          href="#work"
          className="group inline-flex items-center gap-1 text-xs text-foreground/50 transition-colors hover:text-foreground focus-visible:text-foreground"
        >
          All work
          <HugeiconsIcon
            icon={ArrowRight01Icon}
            strokeWidth={2}
            className="size-3 transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </a>
      </div>

      <ul className="group/work-list space-y-2">
        {work.map((item) => (
          <li
            key={item.company}
            className="transition-opacity duration-200 ease-out group-focus-within/work-list:opacity-35 group-hover/work-list:opacity-35 focus-within:!opacity-100 hover:!opacity-100"
          >
            <a
              href="#work"
              className="group/item my-6 flex items-center gap-4 transition-colors duration-200 outline-none"
            >
              <WorkIcon kind={item.icon} />

              <span className="min-w-0 flex-1 tracking-wide">
                <span className="block text-sm font-medium underline-offset-4 group-hover/item:underline group-focus-visible/item:underline">
                  {item.company}
                </span>
                <span className="block truncate text-xs text-foreground/60">
                  {item.summary}
                </span>
              </span>

              <HugeiconsIcon
                icon={ArrowUpRight01Icon}
                strokeWidth={2}
                className="size-3.5 shrink-0 text-muted-foreground transition-all duration-200 group-hover/item:text-foreground group-focus-visible/item:text-foreground"
              />
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
