"use client"

import Image from "next/image"
import Link from "next/link"
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { ArrowTurnBackwardIcon, CircleQuestionMarkIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { CodeBlock } from "@/components/ui/code-block"
import { BounceSidebar } from "@/components/ui/bounce-sidebar"

const sections = [
  { id: "the-job-to-be-done", label: "The job to be done" },
  { id: "where-maestro-fits", label: "Where Maestro fits" },
  { id: "start-with-one-path", label: "Start with one path" },
  { id: "write-a-flow", label: "Write a flow" },
  { id: "keep-flows-reliable", label: "Keep flows reliable" },
  { id: "run-it-in-ci", label: "Run it in CI" },
  { id: "resources", label: "Resources" },
] as const

const onboardingFlow = [
  "appId: com.example.app",
  "name: Sign up with email",
  "tags:",
  "  - smoke",
  "env:",
  "  EMAIL: test@example.com",
  "",
  "---",
  "- launchApp:",
  "    clearState: true",
  "- tapOn: \"Create an account\"",
  "- tapOn: \"Email address\"",
  "- inputText: ${EMAIL}",
  "- tapOn: \"Continue\"",
  "- assertVisible: \"Check your inbox\"",
].join("\n")

const createProjectFlow = [
  "appId: com.example.app",
  "name: Create a first project",
  "tags:",
  "  - smoke",
  "env:",
  "  PROJECT_NAME: Maestro demo",
  "",
  "---",
  "- launchApp:",
  "    clearState: true",
  "- runFlow:",
  "    file: subflows/sign-in.yaml",
  "- tapOn:",
  "    id: new-project-button",
  "- inputText: ${PROJECT_NAME}",
  "- tapOn:",
  "    id: create-project-button",
  "- assertVisible:",
  "    text: ${PROJECT_NAME}",
].join("\n")

const easWorkflow = [
  "name: e2e-android",
  "",
  "on:",
  "  pull_request:",
  "",
  "jobs:",
  "  build_android_for_e2e:",
  "    type: build",
  "    params:",
  "      platform: android",
  "      profile: e2e-test",
  "",
  "  maestro_test:",
  "    needs: [build_android_for_e2e]",
  "    type: maestro",
  "    params:",
  "      build_id: ${{ needs.build_android_for_e2e.outputs.build_id }}",
  "      flow_path:",
  "        - .maestro/onboarding.yaml",
  "        - .maestro/create-project.yaml",
].join("\n")

function InlineCode({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.88em] text-foreground">
      {children}
    </code>
  )
}

function ArticleSection({
  id,
  children,
}: {
  id: string
  children: ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-20" aria-labelledby={`${id}-heading`}>
      <p className="mb-3 text-xs font-medium tracking-[0.14em] text-primary uppercase">
        {/* {String(index + 1).padStart(2, "0")} */}
      </p>
      {/* <h2
        id={`${id}-heading`}
        className="mb-4 text-xl font-medium tracking-[-0.025em] text-foreground sm:text-2xl"
      >
        {title}
      </h2> */}
      <div className="space-y-5">{children}</div>
    </section>
  )
}

export function MaestroArticle() {
  const [activeIndex, setActiveIndex] = useState(0)
  const sectionIds = useMemo(() => sections.map((section) => section.id), [])
  const scrollLockTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useLayoutEffect(() => {
    const root = document.documentElement
    const previousScrollBehavior = root.style.scrollBehavior

    // The site enables smooth scrolling globally. Disable it for this one
    // navigation reset so a previous page position is never animated into view.
    root.style.scrollBehavior = "auto"
    window.scrollTo({ top: 0, left: 0, behavior: "auto" })

    const restoreScrollBehavior = requestAnimationFrame(() => {
      root.style.scrollBehavior = previousScrollBehavior
    })

    return () => {
      cancelAnimationFrame(restoreScrollBehavior)
      root.style.scrollBehavior = previousScrollBehavior
    }
  }, [])

  useEffect(() => {
    const sectionElements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null)

    let animationFrame: number | null = null

    const updateActiveSection = () => {
      animationFrame = null
      if (scrollLockTimer.current || sectionElements.length === 0) return

      // Track the section at the reader's visual anchor rather than the one
      // with the largest visible area. This remains stable for long sections
      // such as the flow examples, which can otherwise be skipped by an
      // IntersectionObserver threshold.
      const anchor = Math.min(window.innerHeight * 0.35, 280)
      const atDocumentEnd =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 2
      const nextIndex = atDocumentEnd
        ? sectionElements.length - 1
        : sectionElements.reduce(
            (currentIndex, section, index) =>
              section.getBoundingClientRect().top <= anchor
                ? index
                : currentIndex,
            0,
          )

      setActiveIndex((currentIndex) =>
        currentIndex === nextIndex ? currentIndex : nextIndex,
      )
    }

    const scheduleUpdate = () => {
      if (animationFrame !== null) return
      animationFrame = requestAnimationFrame(updateActiveSection)
    }

    scheduleUpdate()
    window.addEventListener("scroll", scheduleUpdate, { passive: true })
    window.addEventListener("resize", scheduleUpdate)

    return () => {
      if (animationFrame !== null) cancelAnimationFrame(animationFrame)
      window.removeEventListener("scroll", scheduleUpdate)
      window.removeEventListener("resize", scheduleUpdate)
      if (scrollLockTimer.current) clearTimeout(scrollLockTimer.current)
    }
  }, [sectionIds])

  const scrollToSection = useCallback((index: number) => {
    if (scrollLockTimer.current) clearTimeout(scrollLockTimer.current)
    scrollLockTimer.current = setTimeout(() => {
      scrollLockTimer.current = null
    }, 900)
    document.getElementById(sectionIds[index])?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    })
  }, [sectionIds])

  const share = useCallback(async () => {
    const shareData = {
      title: "Testing Expo apps with Maestro",
      text: "A practical setup for testing Expo apps with Maestro.",
      url: window.location.href,
    }

    if (navigator.share) {
      await navigator.share(shareData)
      return
    }

    await navigator.clipboard?.writeText(window.location.href)
  }, [])

  return (
    <main className="min-h-dvh bg-background px-6 py-16 text-foreground sm:px-10 sm:py-20 lg:px-16">
      <div className="mx-auto max-w-[1076px] lg:grid lg:grid-cols-[200px_minmax(0,688px)] lg:gap-x-[140px]">
        <aside className="mb-12 lg:sticky lg:top-20 lg:mb-0 lg:h-[calc(100dvh-10rem)]">
          <Link
            href="/"
            className="group m-7 inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground"
          >
            <HugeiconsIcon
              icon={ArrowTurnBackwardIcon}
              strokeWidth={2}
              className="size-3 transition-transform group-hover:-translate-x-0.5"
            />
            Back
          </Link>
          <nav aria-label="On this page">
            <BounceSidebar
              items={sections.map((section) => section.label)}
              value={activeIndex}
              onChange={(index) => {
                setActiveIndex(index)
                scrollToSection(index)
              }}
              dotColor="var(--primary)"
              className="text-sm [&_button]:text-muted-foreground [&_button]:text-sm [&_button[aria-selected=true]]:text-foreground"
            />
          </nav>
        </aside>

        <article className="min-w-0">
          <header className="my-6 flex items-center justify-between gap-5">
            <h1 className="text-2xl font-medium tracking-normal">
              Testing Expo apps with Maestro
            </h1>
            <button
              type="button"
              onClick={() => void share()}
              className="shrink-0 rounded-full bg-secondary px-4 py-2 text-xs font-medium text-secondary-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Share
            </button>
          </header>

          <div className="relative aspect-[2.32/1] overflow-hidden rounded-xl bg-muted">
            <Image
              src="/maestro-1.png"
              alt="Maestro mobile testing workflow"
              fill
              priority
              sizes="(min-width: 1024px) 688px, 100vw"
              className="object-cover"
            />
          </div>

          <div className="mt-4 text-[15px] text-muted-foreground sm:text-base">
            {/* <p className="text-foreground/80">
              A practical way to add confidence to an Expo app without turning
              your test suite into a second product to maintain.
            </p> */}

            <ArticleSection
              id={sections[0].id}
            >
              <p>
                A screen can
                look perfect in isolation and still fail once state, navigation,
                keyboard focus, permissions, and network timing meet in the same
                session.
              </p>
             
              <p>
                I use  <a
                  href="#work"
                  className="inline-flex h-7 items-center gap-1.5 rounded-md bg-muted px-2 align-middle text-sm font-medium text-foreground transition-colors hover:bg-accent"
                >
                  <Image
                    src="/maestro.svg"
                    alt=""
                    width={16}
                    height={16}
                    className="size-4 rounded-sm"
                  />
                  Maestro
                </a>
                {" "}for the handful of paths where a regression changes how the
                product feels: getting into an account, creating the first
                meaningful thing, and recovering when something goes wrong. The
                goal is <strong className="font-medium text-foreground">not more tests</strong>;
                it is a short feedback loop around the promises a user actually
                experiences.
              </p>
               {/* <p>
                The direction is to move <strong className="font-medium text-foreground">down the testing stack only when the risk requires it</strong>.
                Keep calculations and state transitions close to the code, verify
                a screen&apos;s behaviour with component tests, then reserve Maestro
                for the few journeys where native UI and several systems have to
                agree.
              </p> */}
              <aside className="rounded-xl bg-muted p-5 text-sm leading-6">
                <p className="font-medium text-foreground">A useful filter</p>
                <p className="mt-2">
                  If the failure would make someone say “this app is broken,” it
                  deserves an end-to-end check. If it only changes a pure function,
                  keep it closer to the code with a unit test.
                </p>
              </aside>
              <p>
                That distinction matters because end-to-end feedback carries real
                cost. It builds an app, starts a simulator or emulator, and
                follows the rendered interface. In return, it catches the
                integration seams that a fast JavaScript-only test deliberately
                cannot see.
              </p>
            </ArticleSection>

            <ArticleSection
              id={sections[1].id}
            >
              <p>
                E2E tests are expensive compared with unit tests, but they answer
                a different question. They are the last small layer of a healthy
                testing strategy, not the whole pyramid.
              </p>
              <div className="overflow-x-auto rounded-2xl bg-background">
                <table className="min-w-[620px] w-full border-separate border-spacing-1 text-left text-sm">
                  <thead className="text-xs text-foreground/50 uppercase">
                    <tr>
                      <th className="rounded-tl-xl bg-muted border px-4 py-3 font-medium">Approach</th>
                      <th className="bg-muted border px-4 py-3 font-medium">Best at catching</th>
                      <th className="bg-muted border px-4 py-3 font-medium">Feedback</th>
                      <th className="rounded-tr-xl bg-muted border px-4 py-3 font-medium">Use it when</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="bg-muted/20 border px-4 py-3 font-medium text-foreground">Unit</td>
                      <td className="bg-muted/20 border px-4 py-3">Business rules and edge cases</td>
                      <td className="bg-muted/20 border px-4 py-3">Very fast</td>
                      <td className="bg-muted/20 border px-4 py-3">A result can be proven without a UI</td>
                    </tr>
                    <tr>
                      <td className="bg-muted/20 border px-4 py-3 font-medium text-foreground">Component</td>
                      <td className="bg-muted/20 border px-4 py-3">States, labels, and interactions</td>
                      <td className="bg-muted/20 border px-4 py-3">Fast</td>
                      <td className="bg-muted/20 border px-4 py-3">One screen or component owns the behaviour</td>
                    </tr>
                    <tr>
                      <td className="rounded-bl-xl bg-primary/10 px-4 py-3 font-medium text-primary">Maestro flow</td>
                      <td className="bg-primary/10 px-4 py-3">Real navigation and integration seams</td>
                      <td className="bg-primary/10 px-4 py-3">Slower</td>
                      <td className="rounded-br-xl bg-primary/10 px-4 py-3">A user must complete a journey to prove it works</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>
                The win is not that Maestro replaces everything else. It lets a
                small suite verify that the pieces still work together on an
                emulator or simulator, where the user will actually meet them.
              </p>
              <aside className="rounded-xl border bg-muted/50 p-5 text-sm leading-6">
                <p className="font-medium text-foreground">A healthy split</p>
                <p className="mt-2">
                  Keep one <strong className="font-medium text-foreground">smoke flow</strong> per critical promise on every pull request. Put longer, less
                  frequent scenarios behind tags or a nightly run. The suite stays
                  quick enough to trust while still protecting the journeys that
                  would be painful to discover after release.
                </p>
              </aside>
            </ArticleSection>

            <ArticleSection
              id={sections[2].id}
            >
              <p>
                Start with one happy path that earns its place: onboarding, sign
                in, or creating the first project. Before writing  <a
                  href="#work"
                  className="inline-flex h-7 items-center gap-1.5 rounded-md bg-muted px-2 align-middle text-xs font-medium text-foreground transition-colors hover:bg-accent"
                >
                  <HugeiconsIcon icon={CircleQuestionMarkIcon} className='size-3' />
                  YAML
                </a> I make the
                path deterministic. That usually means a test account, a known
                backend state, and a launch that does not depend on whatever the
                previous test left behind.
              </p>
              <div className="relative aspect-[2.32/1] overflow-hidden rounded-xl bg-muted">
                <Image
                  src="/maestro-2.png"
                  alt="Maestro displaying an app smoke test flow"
                  fill
                  sizes="(min-width: 1024px) 688px, 100vw"
                  className="object-cover"
                />
              </div>
              <aside className="rounded-xl border bg-muted/50 p-5 text-sm leading-6">
                <p className="font-medium text-foreground">A ten-minute preflight</p>
                <ul className="mt-3 space-y-2">
                  <li>Start from a known account, locale, and feature-flag state.</li>
                  <li>Make any required backend data explicit and disposable.</li>
                  <li>Decide the visible success state before choosing the first tap.</li>
                </ul>
              </aside>
              <div className='p-1.5 rounded-xl bg-muted border'>
                <ol className="grid gap-1.5 sm:grid-cols-2">
                  {[
                    ["01", "Name the outcome", "Describe the moment that should be true at the end, not the taps needed to reach it."],
                    ["02", "Control the starting state", "Clear local state and seed only the data the flow needs."],
                    ["03", "Use visible language", "Target text and accessibility labels a person can recognise, not coordinates."],
                    ["04", "End on evidence", "Assert the final state a user sees, such as a project name or success message."],
                  ].map(([number, title, description]) => (
                    <li key={number} className="rounded-xl border bg-background p-4 shadow-sm">
                      <span className="font-mono text-xs text-primary">{number}</span>
                      <h3 className="mt-2 font-medium text-foreground">{title}</h3>
                      <p className="mt-1 text-sm leading-6">{description}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </ArticleSection>

            <ArticleSection
              id={sections[3].id}
            >
              <p>
                A Maestro Flow is intentionally plain YAML: configuration first,
                then an ordered list of actions. That makes the test readable in a
                pull request and keeps it close to the language of the interface.
                This example checks a simple email entry point without hard-coding
                device coordinates or adding arbitrary sleeps.
              </p>
              <CodeBlock
                filename=".maestro/onboarding.yaml"
                code={onboardingFlow}
              />
              <p>
                Notice the boundaries. <InlineCode>clearState</InlineCode> makes
                the start explicit, <InlineCode>env</InlineCode> keeps disposable
                test data outside the steps, and <InlineCode>assertVisible</InlineCode>
                {" "}checks the outcome rather than an internal implementation.
                If the flow grows beyond one story, extract the repeated part into
                a subflow with <InlineCode>runFlow</InlineCode> instead of creating
                one giant test.
              </p>
              <div className="rounded-xl border bg-muted/50 p-5 text-sm leading-6">
                <h3 className="font-medium text-foreground">Write flows around stable intent</h3>
                <p className="mt-2">
                  Prefer a label that a person can recognise when the copy is part
                  of the product promise. When wording is intentionally flexible,
                  give the important control a stable identifier and let the flow
                  target that instead. The selector should describe <strong className="font-medium text-foreground">what the control is for</strong>, not where it
                  happens to sit on one device.
                </p>
              </div>
              <CodeBlock
                filename=".maestro/create-project.yaml"
                code={createProjectFlow}
              />
              <p>
                This flow is deliberately composed from one reusable sign-in
                subflow and one product-specific action. It proves the new project
                appears by name—the outcome a person sees—rather than asserting an
                internal store update or a navigation event.
              </p>
            </ArticleSection>

            <ArticleSection
              id={sections[4].id}
            >
              <p>
                Flaky tests rarely need a longer timeout. They usually reveal that
                the flow is asking the app to begin from an ambiguous state, or
                that it is targeting something users cannot reliably see. Fix the
                boundary first; only then consider a wait.
              </p>
              <div className="relative aspect-[2.32/1] overflow-hidden rounded-xl bg-muted">
                <Image
                  src="/maestro-3.png"
                  alt="Maestro running a review reply flow on a mobile app"
                  fill
                  sizes="(min-width: 1024px) 688px, 100vw"
                  className="object-cover"
                />
              </div>
              <aside className="rounded-xl border bg-muted/50 p-5 text-sm leading-6">
                <h3 className="font-medium text-foreground">React Native rules that make flows durable</h3>
                <ul className="mt-3 space-y-2">
                  <li>Expose meaningful text and accessibility labels for actions a person needs to understand.</li>
                  <li>Use a stable identifier for controls whose marketing copy, localisation, or visual treatment changes often.</li>
                  <li>Reset local state and seed remote state per flow; one passing test must never be another test&apos;s setup.</li>
                  <li>Assert the next visible state instead of adding a fixed sleep after every action.</li>
                </ul>
              </aside>
              <div className="overflow-x-auto rounded-2xl bg-background">
                <table className="min-w-[620px] w-full border-separate border-spacing-1 text-left text-sm">
                  <thead className="text-xs text-muted-foreground uppercase">
                    <tr>
                      <th className="rounded-tl-xl bg-muted  border px-4 py-3 font-medium">Symptom</th>
                      <th className="bg-muted  border px-4 py-3 font-medium">Usually means</th>
                      <th className="rounded-tr-xl bg-muted border  px-4 py-3 font-medium">Better move</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="bg-muted/20 border px-4 py-3 text-foreground">The first tap fails</td>
                      <td className="bg-muted/20 border px-4 py-3">State is leaking between runs</td>
                      <td className="bg-muted/20 border px-4 py-3">Launch with a clean, seeded state</td>
                    </tr>
                    <tr>
                      <td className="bg-muted/20 border px-4 py-3 text-foreground">A flow breaks after a copy edit</td>
                      <td className="bg-muted/20 border px-4 py-3">The selector is carrying too much meaning</td>
                      <td className="bg-muted/20 border px-4 py-3">Use a stable accessibility label or test ID</td>
                    </tr>
                    <tr>
                      <td className="rounded-bl-xl bg-muted/20 border px-4 py-3 text-foreground">CI fails but local passes</td>
                      <td className="bg-muted/20 border px-4 py-3">The test depends on timing or environment data</td>
                      <td className="rounded-br-xl bg-muted/20 border px-4 py-3">Remove the race and log the state you expect</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>
                Good flows feel almost boring. They name what the person sees,
                take one decisive action, and assert the next meaningful state.
                That restraint is why they stay useful six months later.
              </p>
              <p>
                In particular, let <InlineCode>assertVisible</InlineCode> carry
                ordinary loading waits. Reach for a longer, explicit wait only when
                the product genuinely performs work that takes longer than a normal
                screen transition. A timeout should document a known boundary, not
                hide an uncertain one.
              </p>
            </ArticleSection>

            <ArticleSection
              id={sections[5].id}
            >
              <p>
                Run the smoke suite on every pull request once it is fast enough
                to be trusted. For Expo projects using EAS Workflows, the useful
                shape is simple: build a testable app artifact, then hand that
                build to a Maestro job with an explicit list of flows.
              </p>
              <CodeBlock
                filename=".eas/workflows/e2e-android.yml"
                code={easWorkflow}
              />
              <aside className="rounded-xl border bg-muted/50 p-5 text-sm leading-6">
                <h3 className="font-medium text-foreground">The Expo build contract</h3>
                <p className="mt-2">
                  Give EAS a dedicated <InlineCode>e2e-test</InlineCode> build
                  profile. Android needs an installable <InlineCode>apk</InlineCode>;
                  iOS needs a simulator build. Keeping that profile separate from
                  a store build makes the test artifact intentional, repeatable,
                  and easier to diagnose when a run fails.
                </p>
              </aside>
              <p>
                Keep the pull-request suite small: sign in, one core creation
                path, and one recovery path. Broader regression coverage can run
                nightly. This split protects the team from both extremes: waiting
                forever for CI, or shipping without a meaningful mobile check.
              </p>
            </ArticleSection>

            <ArticleSection
              id={sections[6].id}
            >
              <p>
                These are the references I return to when a flow needs to grow
                beyond its first happy path.
              </p>
              <div className="rounded-xl bg-muted p-5 text-sm leading-6">
                <p className="font-medium text-foreground">A useful reading order</p>
                <p className="mt-2">
                  Start with a single local Maestro flow, then connect it to an
                  Expo EAS build. Once the flow is reliable, use the React Native
                  testing and accessibility guidance to improve the UI language it
                  relies on. The result is one testing system, not a separate
                  automation project.
                </p>
              </div>
              <ul className="divide-y rounded-xl border">
                {[
                  ["Maestro Flows", "YAML structure, commands, subflows, and flow control.", "https://docs.maestro.dev/maestro-flows"],
                  ["Maestro CLI", "Installing the runner and executing flows locally.", "https://docs.maestro.dev/maestro-cli"],
                  ["Expo + EAS Workflows", "Building an Expo artifact and running Maestro in CI.", "https://docs.expo.dev/eas/workflows/examples/e2e-tests/"],
                  ["Expo EAS Workflow syntax", "Maestro job options, artifacts, and workflow configuration.", "https://docs.expo.dev/eas/workflows/syntax/"],
                  ["React Native testing", "Choosing unit, component, integration, and end-to-end coverage.", "https://reactnative.dev/docs/next/testing-overview"],
                  ["React Native accessibility", "Writing labels and roles that help people and test automation.", "https://reactnative.dev/docs/view.html"],
                  ["Maestro workspace configuration", "Shared flow discovery, environment variables, and output settings.", "https://docs.maestro.dev/reference/workspace-configuration"],
                ].map(([title, description, href]) => (
                  <li key={href}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="group block p-4 transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                    >
                      <span className="font-medium text-foreground underline-offset-4 group-hover:underline">
                        {title}
                      </span>
                      <span className="mt-1 block text-sm leading-6">{description}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </ArticleSection>
          </div>
        </article>
      </div>
    </main>
  )
}
