import type { BuilderInstruction } from "./types"

export function renumberInstructions(
  steps: BuilderInstruction[]
): BuilderInstruction[] {
  return steps.map((instruction, idx) => ({
    ...instruction,
    step: idx + 1,
    short_desc: instruction.short_desc || `Step ${idx + 1}`,
    long_desc:
      instruction.long_desc || instruction.short_desc || `Step ${idx + 1}`
  }))
}

export function getNextInstructionId(steps: BuilderInstruction[]): number {
  return (
    steps.reduce((maxId, step) => {
      return Number.isFinite(step.id) ? Math.max(maxId, step.id) : maxId
    }, 0) + 1
  )
}

export function normalizeCategory(category: string | null | undefined): string {
  const c = typeof category === "string" ? category.trim() : ""
  return c ? c : "Other"
}

export function parseQuantityInput(input: string): {
  quantity: number | null
  quantityDisplay: string | null
} {
  const value = input.trim()
  if (!value) return { quantity: null, quantityDisplay: null }

  const mixedFraction = value.match(/^(\d+)\s+(\d+)\/(\d+)$/)
  if (mixedFraction) {
    const whole = Number(mixedFraction[1])
    const numerator = Number(mixedFraction[2])
    const denominator = Number(mixedFraction[3])
    if (denominator > 0) {
      return {
        quantity: whole + numerator / denominator,
        quantityDisplay: value
      }
    }
  }

  const simpleFraction = value.match(/^(\d+)\/(\d+)$/)
  if (simpleFraction) {
    const numerator = Number(simpleFraction[1])
    const denominator = Number(simpleFraction[2])
    if (denominator > 0) {
      return {
        quantity: numerator / denominator,
        quantityDisplay: value
      }
    }
  }

  const decimal = Number(value)
  if (Number.isFinite(decimal)) {
    return { quantity: decimal, quantityDisplay: value }
  }

  return { quantity: null, quantityDisplay: null }
}

export function toYoutubeEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url)

    const buildEmbed = (id: string) => {
      const params = new URLSearchParams({
        rel: "0",
        modestbranding: "1",
        enablejsapi: "1"
      })

      if (typeof window !== "undefined" && window.location?.origin) {
        params.set("origin", window.location.origin)
      }

      return `https://www.youtube.com/embed/${id}?${params.toString()}`
    }

    if (parsed.hostname === "youtu.be") {
      const id = parsed.pathname.replace("/", "").trim()
      return id ? buildEmbed(id) : null
    }

    if (
      parsed.hostname === "www.youtube.com" ||
      parsed.hostname === "youtube.com" ||
      parsed.hostname === "m.youtube.com"
    ) {
      const pathParts = parsed.pathname.split("/").filter(Boolean)
      if (pathParts[0] === "embed" && pathParts[1]) {
        return buildEmbed(pathParts[1])
      }
      const id = parsed.searchParams.get("v")
      return id ? buildEmbed(id) : null
    }

    return null
  } catch {
    return null
  }
}
