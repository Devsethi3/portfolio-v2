"use client"

import { Fragment, type ReactNode } from "react"

import { CopyButton } from "@/components/copy-button"
import { cn } from "@/lib/utils"

type CodeBlockLanguage = "yaml" | "text"

type CodeBlockProps = {
  code: string
  filename: string
  language?: CodeBlockLanguage
  className?: string
}

function YamlValue({ value }: { value: string }) {
  if (!value) return null

  const parts = value.split(/(\$\{[^}]+\})/g)

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith("${") && part.endsWith("}")) {
          return (
            <span key={index} className="font-medium text-primary">
              {part}
            </span>
          )
        }

        if (/^(true|false|null)$/i.test(part.trim())) {
          return (
            <span key={index} className="text-primary">
              {part}
            </span>
          )
        }

        return (
          <span key={index} className="text-foreground">
            {part}
          </span>
        )
      })}
    </>
  )
}

function YamlLine({ line }: { line: string }) {
  if (!line) return "\u00a0"

  if (line.trimStart().startsWith("#")) {
    return <span className="text-muted-foreground">{line}</span>
  }

  const match = line.match(/^(\s*)(-\s+)?([^:#][^:]*?)(:)(\s*)(.*)$/)

  if (!match) return <span className="text-foreground">{line}</span>

  const [, indent, dash = "", key, colon, space, value] = match

  return (
    <>
      {indent}
      {dash && <span className="text-muted-foreground">{dash}</span>}
      <span className="text-primary">{key}</span>
      <span className="text-muted-foreground">{colon}</span>
      {space}
      <YamlValue value={value} />
    </>
  )
}

function renderCode(code: string, language: CodeBlockLanguage): ReactNode {
  if (language === "text") return code

  const lines = code.split("\n")

  return lines.map((line, index) => (
    <Fragment key={`${line}-${index}`}>
      <YamlLine line={line} />
      {index < lines.length - 1 && "\n"}
    </Fragment>
  ))
}

export function CodeBlock({
  code,
  filename,
  language = "yaml",
  className,
}: CodeBlockProps) {
  return (
    <section
      aria-label={`${filename} code example`}
      className={cn(
        "overflow-hidden rounded-2xl border border-border/60 bg-muted/50 shadow-sm",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-4 border-b border-border/60 px-5 py-2.5">
        <span className="font-mono text-xs text-muted-foreground">{filename}</span>
        <CopyButton
          className="relative"
          variant="secondary"
          size="icon-xs"
          text={code}
        />
      </div>
      <pre className="overflow-x-auto px-5 py-4 font-mono text-[13px] leading-6 sm:text-xs">
        <code>{renderCode(code, language)}</code>
      </pre>
    </section>
  )
}
