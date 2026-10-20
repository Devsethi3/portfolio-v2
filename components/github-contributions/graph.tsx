"use client";

import { format } from "date-fns";
import { ArrowUpRight01Icon, GithubIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { LoaderIcon } from "lucide-react";
import { use } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Activity } from "@/components/kibo-ui/contribution-graph";
import {
  ContributionGraph,
  ContributionGraphBlock,
  ContributionGraphCalendar,
  ContributionGraphFooter,
  ContributionGraphLegend,
  ContributionGraphTotalCount,
} from "@/components/kibo-ui/contribution-graph";

const GITHUB_USERNAME = 'Devsethi3'

export function GitHubContributionGraph({
  contributions,
}: {
  contributions: Promise<Activity[]>;
}) {
  const data = use(contributions);

  return (
    <TooltipProvider>
      <ContributionGraph
        className="w-full gap-5"
        data={data}
        blockSize={11}
        blockMargin={3}
        blockRadius={3}
      >
        <ContributionGraphTotalCount>
          {({ totalCount }) => (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <h2 id="github-contributions-heading">
                github <span className="mx-1.5">/</span>
                {totalCount.toLocaleString("en-US")} this year
              </h2>
              <a
                className="group inline-flex items-center gap-1 transition-colors hover:text-foreground focus-visible:text-foreground"
                href={`https://github.com/${GITHUB_USERNAME}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                @{GITHUB_USERNAME.toLowerCase()}
                <HugeiconsIcon
                  icon={ArrowUpRight01Icon}
                  strokeWidth={2}
                  className="size-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </a>
            </div>
          )}
        </ContributionGraphTotalCount>

       <div className='bg-muted/50 rounded-xl p-1'>
         <div className="rounded-xl bg-background p-4 sm:p-5">
          <ContributionGraphTotalCount>
            {({ totalCount, year }) => (
              <div className="mb-5 flex items-center justify-between gap-4 text-sm">
                <a
                  className="group inline-flex min-w-0 items-center gap-2 font-medium outline-none"
                  href={`https://github.com/${GITHUB_USERNAME}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <HugeiconsIcon icon={GithubIcon} strokeWidth={2} className="size-3.5 fill-primary" />
                  <span className="truncate underline-offset-4 group-hover:underline group-focus-visible:underline">
                    {GITHUB_USERNAME.toLowerCase()}
                  </span>
                  <HugeiconsIcon
                    icon={ArrowUpRight01Icon}
                    strokeWidth={2}
                    className="size-3.5 shrink-0 text-muted-foreground"
                  />
                </a>
                <span className="shrink-0 text-muted-foreground">
                  {totalCount.toLocaleString("en-US")} contributions in {year}
                </span>
              </div>
            )}
          </ContributionGraphTotalCount>

          <ContributionGraphCalendar
            className="no-scrollbar px-0"
            hideMonthLabels
            title="GitHub Contributions"
          >
            {({ activity, dayIndex, weekIndex }) => (
              <Tooltip>
                <TooltipTrigger
                  render={<g aria-label="View contribution details" tabIndex={0} />}
                >
                  <ContributionGraphBlock
                    activity={activity}
                    dayIndex={dayIndex}
                    weekIndex={weekIndex}
                  />
                </TooltipTrigger>
                <TooltipContent className="font-sans">
                  <p>
                    {activity.count} contribution{activity.count !== 1 ? "s" : ""}{" "}
                    on {format(new Date(`${activity.date}T00:00:00Z`), "dd.MM.yyyy")}
                  </p>
                </TooltipContent>
              </Tooltip>
            )}
          </ContributionGraphCalendar>

          <ContributionGraphFooter className="mt-4 justify-end text-xs">
            <ContributionGraphLegend />
          </ContributionGraphFooter>
        </div>
       </div>
      </ContributionGraph>
    </TooltipProvider>
  );
}

export function GitHubContributionFallback() {
  return (
    <div className="flex h-40.5 w-full items-center justify-center">
      <LoaderIcon className="animate-spin text-muted-foreground" />
    </div>
  );
}
