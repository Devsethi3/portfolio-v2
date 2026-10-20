import type { Activity } from "@/components/kibo-ui/contribution-graph"

type GitHubContributionsResponse = {
  contributions: Activity[]
}

const GITHUB_USERNAME = "Devsethi3"
const CONTRIBUTION_DAYS = 366
const FETCH_TIMEOUT_MS = 4_000

const createEmptyContributionCalendar = (): Activity[] => {
  const now = new Date()
  const end = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  )

  return Array.from({ length: CONTRIBUTION_DAYS }, (_, index) => {
    const offset = CONTRIBUTION_DAYS - index - 1
    const date = new Date(end - offset * 86_400_000)

    return {
      date: date.toISOString().slice(0, 10),
      count: 0,
      level: 0,
    }
  })
}

export const getGitHubContributions = async (): Promise<Activity[]> => {
  const year = new Date().getUTCFullYear()
  const endpoint =
    process.env.GITHUB_CONTRIBUTIONS_API_URL ??
    `https://github-contributions-api.jogruber.de/v4/${GITHUB_USERNAME}?y=${year}`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const res = await fetch(endpoint, {
      signal: controller.signal,
      next: {
        revalidate: 86400,
        tags: ["github-contributions"],
      },
    })

    if (!res.ok) {
      throw new Error(`GitHub contributions request returned ${res.status}`)
    }

    const data = (await res.json()) as GitHubContributionsResponse

    if (!Array.isArray(data.contributions)) {
      throw new Error("GitHub contributions response was invalid")
    }

    return data.contributions
  } catch (error) {
    console.warn(
      "[github-contributions] Using an empty contribution calendar because the API request failed.",
      error instanceof Error ? error.message : error
    )

    return createEmptyContributionCalendar()
  } finally {
    clearTimeout(timeout)
  }
}
