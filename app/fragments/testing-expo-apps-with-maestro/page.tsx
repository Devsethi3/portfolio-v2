import type { Metadata } from "next"
import { MaestroArticle } from "@/components/fragments/maestro-article"

export const metadata: Metadata = {
  title: "Testing Expo apps with Maestro",
  description:
    "A practical setup for fast, reliable mobile UI checks in an Expo app using Maestro.",
}

export default function TestingExpoAppsWithMaestroPage() {
  return <MaestroArticle />
}
