"use client"

import { BookmarkEffectLab } from "@/components/labs/bookmark-effect-lab"
import { CharacterFacialAnimationLab } from "@/components/labs/character-facial-animation-lab"
import { IsometricKeyboardLab } from "@/components/labs/isometric-keyboard-lab"
import { LiftedGridLab } from "@/components/labs/lifted-grid-lab"
import { SaasMetrics3DLab } from "@/components/labs/saas-metrics-3d-lab"
import { TearAwayNoteLab } from "@/components/labs/tear-away-note-lab"
import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

const labColumns = [
  [
    { id: "saas-metrics-3d", component: SaasMetrics3DLab, size: "lg:h-56" },
    {
      id: "lifted-grid",
      component: LiftedGridLab,
      size: "lg:aspect-square lg:h-auto",
    },
  ],
  [
    { id: "bookmark-effect", component: BookmarkEffectLab, size: "lg:h-40" },
    {
      id: "isometric-keyboard",
      component: IsometricKeyboardLab,
      size: "lg:aspect-square lg:h-auto",
    },
  ],
  [
    {
      id: "character-facial-animation",
      component: CharacterFacialAnimationLab,
      size: "lg:aspect-square lg:h-auto",
    },
    {
      id: "tear-away-note",
      component: TearAwayNoteLab,
      size: "lg:aspect-square lg:h-auto",
    },
  ],
] as const

export function LabsSection() {
  return (
    <section id="labs" aria-labelledby="labs-heading" className="py-12">
      <div className="mb-5 flex items-center justify-between text-xs">
        <h2 id="labs-heading" className="font-medium text-foreground/50">
          labs <span className="mx-1.5">/</span>
          <span className="">6</span>
        </h2>
        <a
          href="#labs"
          className="group inline-flex items-center gap-1 text-xs text-foreground/50 transition-colors hover:text-foreground focus-visible:text-foreground"
        >
          labs.devsethi.me
          <HugeiconsIcon
            icon={ArrowUpRight01Icon}
            strokeWidth={2}
            className="size-3"
          />
        </a>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {labColumns.map((column, columnIndex) => (
          <div
            key={columnIndex}
            className="contents lg:flex lg:flex-col lg:gap-3"
          >
            {column.map((lab) => {
              const Component = lab.component

              return (
                <div
                  key={lab.id}
                  className={`flex min-h-56 items-center overflow-hidden rounded-2xl bg-muted lg:min-h-0 ${lab.size}`}
                >
                  <Component />
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </section>
  )
}
