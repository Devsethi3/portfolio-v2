import Image from "next/image"
import { MagicWand04Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Link from "next/link"

export function IntroductionSection() {
  return (
    <section aria-labelledby="introduction-heading" className="space-y-6 relative">
      <div className="space-y-4 text-foreground/60 font-medium">
        <p>Hey,</p>
        <div className='absolute -top-1.5 right-5'>
          <Image src='/transition.svg' width={20} height={20} alt='icon' />
        </div>
        <h1 id="introduction-heading" className="max-w-2xl">
          I&apos;m <span className='text-foreground'>Dev</span>, a{" "}
          <span className="relative inline-flex border border-blue-500 bg-background px-2 pb-1 pt-0.5 font-[family-name:var(--font-caveat)] text-[1.15em] leading-none font-bold text-[#4f7189] [text-shadow:0_1px_2px_rgb(45_78_102_/_0.3)]">
            <span className="absolute -top-1.5 -left-1.5 size-2 border border-blue-500 bg-background" />
            <span className="absolute -top-1.5 -right-1.5 size-2 border border-blue-500 bg-background" />
            <span className="absolute -bottom-1.5 -left-1.5 size-2 border border-blue-500 bg-background" />
            <span className="absolute -right-1.5 -bottom-1.5 size-2 border border-blue-500 bg-background" />
            product engineer
          </span>{" "}
          and full stack developer from Delhi, India. I care way too much about
          UX to ship anything ugly.
        </h1>
        <p>
          I&apos;ve worked with <span className='text-foreground'>startups</span> prev  <Link
            href="https://clause.page"
            target="_blank"
            className="inline-flex h-7 items-center gap-1.5 rounded-md bg-muted px-2 align-middle text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Image
              src="/xocket-logo.svg"
              alt=""
              width={16}
              height={16}
              className="size-4 rounded-sm"
            />
            Xocket
          </Link> on <span className=''>developer tools</span>, SaaS products,
          internal systems, and clean interfaces. My recent product is{" "}
          <Link
            href="https://clause.page"
            target="_blank"
            className="inline-flex h-7 items-center gap-1.5 rounded-md bg-muted px-2 align-middle text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Image
              src="/clause-logo.png"
              alt=""
              width={16}
              height={16}
              className="size-4 rounded-sm"
            />
            Clause
          </Link>
          , and my{" "}
          <a
            href="#labs"
            className="inline-flex h-7 items-center gap-1.5 rounded-md bg-muted px-2 align-middle text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <HugeiconsIcon
              icon={MagicWand04Icon}
              className="size-3.5"
              strokeWidth={2}
            />
            lab
          </a>{" "}
          is where I build and share experiments.
        </p>
        <p>
          Reach out to me{" "}
          <a
            href="https://github.com/imsethidev"
            className="inline-flex rounded-md bg-muted px-2 py-0.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            @imsethidev
          </a>
          . I&apos;m open to work.
        </p>
      </div>
    </section>
  )
}
