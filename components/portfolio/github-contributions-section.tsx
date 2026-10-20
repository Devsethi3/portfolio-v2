
export function GithubContributionsSection() {
  return (
    <section id="github" aria-labelledby="github-heading">
      <div className="mb-5 flex items-center justify-between text-xs">
        <h2 id="github-heading" className="font-medium text-foreground/50">
          GitHub <span className="mx-1.5">/</span>
          <span>recent activity</span>
        </h2>
        <a
          href="https://github.com/devsethi3"
          target="_blank"
          rel="noreferrer"
          className="text-foreground/50 transition-colors hover:text-foreground focus-visible:text-foreground"
        >
          @devsethi3
        </a>
      </div>

    </section>
  )
}
