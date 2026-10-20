import { Suspense } from "react";

import { getGitHubContributions } from "../../data/github-contributions";
import { GitHubContributionFallback, GitHubContributionGraph } from "./graph";

export function GitHubContributions() {
  const contributions = getGitHubContributions();

  return (
    <section aria-labelledby="github-contributions-heading">
      <Suspense fallback={<GitHubContributionFallback />}>
        <GitHubContributionGraph contributions={contributions} />
      </Suspense>
    </section>
  );
}
