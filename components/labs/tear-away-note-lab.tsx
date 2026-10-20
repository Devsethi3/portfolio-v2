"use client"

import { TearAwayNote } from "@/components/interior/tear-away-note"

export function TearAwayNoteLab() {
  return (
    <TearAwayNote
      accentColor="#e45743"
      artwork="pattern"
      className="size-full bg-muted"
      description=""
      eyebrow=""
      paperColor="transparent"
      title=""
      under={<div aria-hidden="true" className="size-full bg-muted" />}
    />
  )
}
