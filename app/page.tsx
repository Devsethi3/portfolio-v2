import { GitHubContributions } from "@/components/github-contributions"
import PixelFishingScene from "@/components/pixel-fishing-scene"
import { CaseStudiesSection } from "@/components/portfolio/case-studies-section"
import { GithubContributionsSection } from "@/components/portfolio/github-contributions-section"
import { IntroductionSection } from "@/components/portfolio/introduction-section"
import { LabsSection } from "@/components/portfolio/labs-section"
import { MoonlitDock } from "@/components/portfolio/moonlit-dock"
import { WorkSection } from "@/components/portfolio/work-section"

export default function Page() {
  return (
    <main className="px-6 py-16 sm:py-24">
      <div className="mx-auto flex max-w-xl flex-col gap-10">
        <IntroductionSection />
        <PixelFishingScene />
        {/* <MoonlitDock /> */}
        <WorkSection />
        <LabsSection />
        <CaseStudiesSection />
        
        <GitHubContributions />
      </div>
    </main>
  )
}
