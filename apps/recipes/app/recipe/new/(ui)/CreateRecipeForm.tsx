"use client"

import {
  startTransition,
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react"
import { useRouter } from "next/navigation"
import { Button } from "@repo/ui/shadcn/button"
import RecipeSectionsToggle, {
  type DisplayIngredient,
  type TabKey
} from "../../[id]/(ui)/RecipeSectionsToggle"
import type { IngredientListItem } from "../(actions)/getIngredients"
import type { CreateRecipeActionState } from "../(actions)/createRecipeAction"
import type { CreateIngredientActionState } from "../(actions)/createIngredientAction"

declare global {
  interface Window {
    // Minimal YouTube IFrame API surface we use.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    YT?: any
    onYouTubeIframeAPIReady?: () => void
  }
}

interface CreateRecipeFormProps {
  createRecipeAction: (
    prevState: CreateRecipeActionState,
    formData: FormData
  ) => Promise<CreateRecipeActionState>
  createIngredientAction: (
    prevState: CreateIngredientActionState,
    formData: FormData
  ) => Promise<CreateIngredientActionState>
  ingredients: IngredientListItem[]
  ingredientsError: string | null
}

type BuilderInstruction = {
  id: number
  step: number
  short_desc: string
  long_desc: string
  heat: string | null
  time_minutes: number | null
  step_instructions: Array<{
    ingredientId: number
    quantity: number | null
    unit: string | null
  }>
}

function normalizeCategory(category: string | null | undefined): string {
  const c = typeof category === "string" ? category.trim() : ""
  return c ? c : "Other"
}

function toYoutubeEmbedUrl(url: string): string | null {
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

export default function CreateRecipeForm({
  createRecipeAction,
  createIngredientAction,
  ingredients,
  ingredientsError
}: CreateRecipeFormProps) {
  const router = useRouter()
  const lastAutoDescriptionVideoUrlRef = useRef<string | null>(null)

  const youtubeIframeRef = useRef<HTMLIFrameElement | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const youtubePlayerRef = useRef<any>(null)
  const youtubeLastKnownStateRef = useRef<number | null>(null)
  const youtubeWasPlayingBeforeSheetRef = useRef<boolean>(false)
  const youtubeApiReadyPromiseRef = useRef<Promise<void> | null>(null)
  const [actionState, formAction, isPending] = useActionState(
    createRecipeAction,
    { status: "idle" }
  )

  const [
    createIngredientState,
    createIngredientFormAction,
    isCreatingIngredient
  ] = useActionState(createIngredientAction, { status: "idle" })

  const [availableIngredients, setAvailableIngredients] =
    useState<IngredientListItem[]>(ingredients)

  const [name, setName] = useState<string>("")
  const [description, setDescription] = useState<string>("")
  const [videoUrl, setVideoUrl] = useState<string>("")
  const [activeTab, setActiveTab] = useState<TabKey>("instructions")

  const [instructions, setInstructions] = useState<BuilderInstruction[]>([])
  const [builderIngredients, setBuilderIngredients] = useState<
    DisplayIngredient[]
  >([])

  const [nextInstructionId, setNextInstructionId] = useState<number>(1)

  const [isVideoEditorOpen, setIsVideoEditorOpen] = useState<boolean>(false)
  const [videoDraftUrl, setVideoDraftUrl] = useState<string>("")

  const [isAddInstructionOpen, setIsAddInstructionOpen] =
    useState<boolean>(false)
  const [editingInstructionIdx, setEditingInstructionIdx] = useState<
    number | null
  >(null)
  const [instructionDraftShort, setInstructionDraftShort] = useState<string>("")
  const [instructionDraftLong, setInstructionDraftLong] = useState<string>("")
  const [instructionDraftHeat, setInstructionDraftHeat] = useState<string>("")
  const [instructionDraftTimeMinutes, setInstructionDraftTimeMinutes] =
    useState<string>("")
  const [
    instructionDraftIngredientIdToAdd,
    setInstructionDraftIngredientIdToAdd
  ] = useState<string>("")
  const [instructionDraftStepIngredients, setInstructionDraftStepIngredients] =
    useState<Array<{ ingredientId: number; quantity: string; unit: string }>>(
      []
    )

  const [isAddIngredientOpen, setIsAddIngredientOpen] = useState<boolean>(false)
  const [editingIngredientId, setEditingIngredientId] = useState<number | null>(
    null
  )
  const [ingredientDraftSourceId, setIngredientDraftSourceId] =
    useState<string>("")
  const [ingredientDraftName, setIngredientDraftName] = useState<string>("")
  const [ingredientDraftError, setIngredientDraftError] = useState<string>("")
  const [ingredientDraftQuantity, setIngredientDraftQuantity] =
    useState<string>("")
  const [ingredientDraftUnit, setIngredientDraftUnit] = useState<string>("")

  const [isCreateIngredientOpen, setIsCreateIngredientOpen] =
    useState<boolean>(false)
  const [newIngredientName, setNewIngredientName] = useState<string>("")
  const [newIngredientCategory, setNewIngredientCategory] = useState<string>("")
  const [newIngredientUnit, setNewIngredientUnit] = useState<string>("")
  const [isCategorySuggestionsOpen, setIsCategorySuggestionsOpen] =
    useState<boolean>(false)

  const [ingredientPickerQuery, setIngredientPickerQuery] = useState<string>("")
  const [isIngredientPickerOpen, setIsIngredientPickerOpen] =
    useState<boolean>(false)

  const ingredientById = useMemo(() => {
    const byId = new Map<number, IngredientListItem>()
    for (const ing of availableIngredients) byId.set(ing.id, ing)
    return byId
  }, [availableIngredients])

  const categoryOptions = useMemo(() => {
    const byLower = new Map<string, string>()

    for (const ing of availableIngredients) {
      if (!ing.category) continue
      const trimmed = String(ing.category).trim()
      if (!trimmed) continue
      const key = trimmed.toLowerCase()
      if (!byLower.has(key)) byLower.set(key, trimmed)
    }

    for (const ing of builderIngredients) {
      if (!ing.category) continue
      const trimmed = String(ing.category).trim()
      if (!trimmed) continue
      const key = trimmed.toLowerCase()
      if (!byLower.has(key)) byLower.set(key, trimmed)
    }

    return Array.from(byLower.values()).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    )
  }, [availableIngredients, builderIngredients])

  const filteredCategoryOptions = useMemo(() => {
    const q = newIngredientCategory.trim().toLowerCase()
    if (!q) return categoryOptions
    return categoryOptions.filter((c) => c.toLowerCase().includes(q))
  }, [categoryOptions, newIngredientCategory])

  const groupedIngredientMatches = useMemo(() => {
    const q = ingredientPickerQuery.trim().toLowerCase()
    const matches = q
      ? availableIngredients.filter((x) =>
          x.name.trim().toLowerCase().includes(q)
        )
      : availableIngredients

    const byCategory = new Map<string, IngredientListItem[]>()
    for (const ing of matches) {
      const cat = normalizeCategory(ing.category)
      const bucket = byCategory.get(cat)
      if (bucket) bucket.push(ing)
      else byCategory.set(cat, [ing])
    }

    const categories = Array.from(byCategory.keys()).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    )

    return categories.map((category) => {
      const items = byCategory.get(category) ?? []
      items.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      )
      return { category, items }
    })
  }, [availableIngredients, ingredientPickerQuery])

  useEffect(() => {
    setAvailableIngredients(ingredients)
  }, [ingredients])

  const videoEmbedUrl = useMemo(() => {
    if (!videoUrl.trim()) return null
    return toYoutubeEmbedUrl(videoUrl)
  }, [videoUrl])

  const previewInstructions = useMemo(() => {
    return instructions.map((x) => ({
      step: x.step,
      short_desc: x.short_desc,
      long_desc: x.long_desc,
      heat: x.heat,
      time_minutes: x.time_minutes,
      step_instructions: x.step_instructions
    }))
  }, [instructions])

  const previewIngredients = useMemo((): DisplayIngredient[] => {
    return builderIngredients
  }, [builderIngredients])

  const ingredientsJson = useMemo(() => {
    return JSON.stringify(
      builderIngredients.map((x) => ({
        ingredientId: x.ingredientId,
        quantity: x.quantity,
        unit: x.unit
      }))
    )
  }, [builderIngredients])

  const instructionsJson = useMemo(() => {
    return JSON.stringify(
      instructions.map((x) => ({
        step: x.step,
        short_desc: x.short_desc,
        long_desc: x.long_desc,
        heat: x.heat,
        time_minutes: x.time_minutes,
        step_instructions: x.step_instructions
      }))
    )
  }, [instructions])

  const addButtonLabel =
    activeTab === "ingredients" ? "Add ingredient" : "Add instruction"

  function tryGetRecipeId(recipe: unknown): number | null {
    if (!recipe || typeof recipe !== "object") return null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyRecipe = recipe as any
    const id = Number(anyRecipe.id ?? anyRecipe.recipeId)
    return Number.isInteger(id) && id > 0 ? id : null
  }

  useEffect(() => {
    if (actionState.status !== "success") return
    const recipeId = tryGetRecipeId(actionState.recipe)
    if (!recipeId) return
    router.push(`/recipe/${recipeId}`)
  }, [actionState, router])

  function ensureYouTubeIframeApiLoaded(): Promise<void> {
    if (typeof window === "undefined") return Promise.reject()
    if (window.YT?.Player) return Promise.resolve()
    if (youtubeApiReadyPromiseRef.current)
      return youtubeApiReadyPromiseRef.current

    youtubeApiReadyPromiseRef.current = new Promise<void>((resolve, reject) => {
      const prevReady = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        prevReady?.()
        resolve()
      }

      const existing = document.querySelector(
        'script[src="https://www.youtube.com/iframe_api"]'
      )
      if (existing) return

      const script = document.createElement("script")
      script.src = "https://www.youtube.com/iframe_api"
      script.async = true
      script.onerror = () => reject(new Error("Failed to load YouTube API"))
      document.head.appendChild(script)
    })

    return youtubeApiReadyPromiseRef.current
  }

  function getYouTubePlayerState(): number | null {
    const player = youtubePlayerRef.current
    if (!player) return youtubeLastKnownStateRef.current
    try {
      if (typeof player.getPlayerState === "function") {
        const state = player.getPlayerState()
        if (typeof state === "number") return state
      }
    } catch {
      // Ignore.
    }
    return youtubeLastKnownStateRef.current
  }

  function isYouTubePlaying(): boolean {
    const state = getYouTubePlayerState()
    if (typeof state !== "number") return false
    const playing = window.YT?.PlayerState?.PLAYING
    if (typeof playing === "number") return state === playing
    // Fallback: PLAYING is 1 in the IFrame API.
    return state === 1
  }

  function pauseYouTubeIfPlaying() {
    youtubeWasPlayingBeforeSheetRef.current = false
    const player = youtubePlayerRef.current
    if (!player) return
    if (!isYouTubePlaying()) return

    youtubeWasPlayingBeforeSheetRef.current = true
    try {
      player.pauseVideo?.()
    } catch {
      // Ignore.
    }
  }

  function resumeYouTubeIfWePaused() {
    const player = youtubePlayerRef.current
    if (!player) return
    if (!youtubeWasPlayingBeforeSheetRef.current) return
    youtubeWasPlayingBeforeSheetRef.current = false
    try {
      player.playVideo?.()
    } catch {
      // Ignore.
    }
  }

  function closeAddInstructionPanel() {
    setIsAddInstructionOpen(false)
    setEditingInstructionIdx(null)
    requestAnimationFrame(() => resumeYouTubeIfWePaused())
  }

  function closeAddIngredientPanel() {
    setIsAddIngredientOpen(false)
    setEditingIngredientId(null)
    requestAnimationFrame(() => resumeYouTubeIfWePaused())
  }

  function openAddPanelForActiveTab() {
    pauseYouTubeIfPlaying()
    if (activeTab === "ingredients") {
      setEditingIngredientId(null)
      setIngredientDraftSourceId("")
      setIngredientDraftName("")
      setIngredientPickerQuery("")
      setIsIngredientPickerOpen(false)
      setIngredientDraftError("")
      setIngredientDraftQuantity("")
      setIngredientDraftUnit("")
      setIsAddIngredientOpen(true)
      return
    }
    setEditingInstructionIdx(null)
    setIsAddInstructionOpen(true)
  }

  function openEditIngredient(ingredientId: number) {
    pauseYouTubeIfPlaying()
    const existing = builderIngredients.find(
      (x) => x.ingredientId === ingredientId
    )
    if (!existing) return

    setEditingIngredientId(existing.ingredientId)
    setIngredientDraftSourceId(String(existing.ingredientId))
    setIngredientDraftName(existing.name)
    setIngredientPickerQuery(existing.name)
    setIsIngredientPickerOpen(false)
    setIngredientDraftError("")
    setIngredientDraftQuantity(
      existing.quantity !== null && existing.quantity !== undefined
        ? String(existing.quantity)
        : ""
    )
    setIngredientDraftUnit(existing.unit ? String(existing.unit) : "")
    setIsAddIngredientOpen(true)
  }

  function openEditInstruction(instructionIdx: number) {
    pauseYouTubeIfPlaying()
    const existing = instructions[instructionIdx]
    if (!existing) return

    setEditingInstructionIdx(instructionIdx)
    setInstructionDraftShort(existing.short_desc ?? "")
    setInstructionDraftLong(existing.long_desc ?? "")
    setInstructionDraftHeat(existing.heat ?? "")
    setInstructionDraftTimeMinutes(
      existing.time_minutes !== null && existing.time_minutes !== undefined
        ? String(existing.time_minutes)
        : ""
    )
    setInstructionDraftIngredientIdToAdd("")
    setInstructionDraftStepIngredients(
      (existing.step_instructions ?? []).map((si) => ({
        ingredientId: si.ingredientId,
        quantity:
          si.quantity !== null && si.quantity !== undefined
            ? String(si.quantity)
            : "",
        unit: si.unit ? String(si.unit) : ""
      }))
    )
    setIsAddInstructionOpen(true)
  }

  useEffect(() => {
    if (!videoEmbedUrl) {
      if (youtubePlayerRef.current?.destroy) {
        try {
          youtubePlayerRef.current.destroy()
        } catch {
          // Ignore.
        }
      }
      youtubePlayerRef.current = null
      youtubeLastKnownStateRef.current = null
      return
    }

    let cancelled = false

    ;(async () => {
      try {
        await ensureYouTubeIframeApiLoaded()
        if (cancelled) return

        const iframe = youtubeIframeRef.current
        if (!iframe) return

        if (youtubePlayerRef.current?.destroy) {
          try {
            youtubePlayerRef.current.destroy()
          } catch {
            // Ignore.
          }
        }

        youtubeLastKnownStateRef.current = null

        youtubePlayerRef.current = new window.YT.Player(iframe, {
          events: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onStateChange: (event: any) => {
              if (typeof event?.data === "number") {
                youtubeLastKnownStateRef.current = event.data
              }
            }
          }
        })
      } catch {
        // Best-effort: if the API fails to load, the embed still works; we just can't pause/resume.
      }
    })()

    return () => {
      cancelled = true
      if (youtubePlayerRef.current?.destroy) {
        try {
          youtubePlayerRef.current.destroy()
        } catch {
          // Ignore.
        }
      }
      youtubePlayerRef.current = null
      youtubeLastKnownStateRef.current = null
      youtubeWasPlayingBeforeSheetRef.current = false
    }
  }, [videoEmbedUrl])

  useEffect(() => {
    if (createIngredientState.status !== "success") return

    setAvailableIngredients((prev) => {
      if (prev.some((x) => x.id === createIngredientState.ingredient.id)) {
        return prev
      }
      return [...prev, createIngredientState.ingredient]
    })

    setIngredientDraftSourceId(String(createIngredientState.ingredient.id))
    setIngredientDraftName(createIngredientState.ingredient.name)
    setIngredientDraftUnit(createIngredientState.ingredient.unit ?? "")
    setIngredientDraftError("")

    setNewIngredientName("")
    setNewIngredientCategory("")
    setNewIngredientUnit("")
    setIsCreateIngredientOpen(false)
  }, [createIngredientState])

  function submitVideoDraft() {
    const next = videoDraftUrl.trim()
    if (!next) return
    setVideoUrl(next)
    setIsVideoEditorOpen(false)
  }

  useEffect(() => {
    const url = videoUrl.trim()
    if (!url) return
    if (description.trim()) return
    if (lastAutoDescriptionVideoUrlRef.current === url) return

    // Only attempt for recognizable YouTube URLs.
    if (!toYoutubeEmbedUrl(url)) return

    const controller = new AbortController()

    ;(async () => {
      try {
        const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(
          url
        )}&format=json`

        const res = await fetch(oembedUrl, {
          method: "GET",
          signal: controller.signal,
          cache: "no-store"
        })

        if (!res.ok) return

        const json: unknown = await res.json()
        const anyJson = json as Record<string, unknown>
        const title =
          typeof anyJson.title === "string" ? anyJson.title.trim() : ""
        const author =
          typeof anyJson.author_name === "string"
            ? anyJson.author_name.trim()
            : ""

        if (!title && !author) return

        const nextDescription = `Learned from YouTube recipe ${title || "this video"} from channel ${author || "the creator"}.`

        setDescription((prev) => {
          if (prev.trim()) return prev
          lastAutoDescriptionVideoUrlRef.current = url
          return nextDescription
        })
      } catch {
        // Ignore metadata failures; user can still type a description manually.
      }
    })()

    return () => controller.abort()
  }, [videoUrl, description])

  function removeVideo() {
    setVideoUrl("")
    setVideoDraftUrl("")
    setIsVideoEditorOpen(false)
  }

  function submitInstructionDraft() {
    const short = instructionDraftShort.trim()
    const long = instructionDraftLong.trim()
    const heatRaw = instructionDraftHeat.trim()
    const heat = heatRaw ? heatRaw : null

    const timeRaw = instructionDraftTimeMinutes.trim()
    const timeParsed = timeRaw ? Number(timeRaw) : NaN
    const time_minutes =
      Number.isFinite(timeParsed) && timeParsed > 0 ? timeParsed : null

    const step_instructions = instructionDraftStepIngredients
      .map((si) => {
        const quantityRaw = si.quantity.trim()
        const quantityParsed = quantityRaw ? Number(quantityRaw) : NaN
        const quantity = Number.isFinite(quantityParsed) ? quantityParsed : null
        const unitRaw = si.unit.trim()
        const unit = unitRaw ? unitRaw : null

        return {
          ingredientId: si.ingredientId,
          quantity,
          unit
        }
      })
      .filter((x) => Number.isFinite(x.ingredientId) && x.ingredientId > 0)

    if (
      !short &&
      !long &&
      !heat &&
      time_minutes === null &&
      step_instructions.length === 0
    ) {
      return
    }

    if (editingInstructionIdx !== null) {
      setInstructions((prev) => {
        if (editingInstructionIdx < 0 || editingInstructionIdx >= prev.length) {
          return prev
        }

        return prev.map((x, idx) => {
          if (idx !== editingInstructionIdx) return x
          const stepNumber = idx + 1
          return {
            ...x,
            step: stepNumber,
            short_desc: short || `Step ${stepNumber}`,
            long_desc: long || short || `Step ${stepNumber}`,
            heat,
            time_minutes,
            step_instructions
          }
        })
      })

      setInstructionDraftShort("")
      setInstructionDraftLong("")
      setInstructionDraftHeat("")
      setInstructionDraftTimeMinutes("")
      setInstructionDraftIngredientIdToAdd("")
      setInstructionDraftStepIngredients([])
      closeAddInstructionPanel()
      return
    }

    const id = nextInstructionId
    setNextInstructionId((x) => x + 1)
    setInstructions((prev) => [
      ...prev,
      {
        id,
        step: prev.length + 1,
        short_desc: short || `Step ${prev.length + 1}`,
        long_desc: long || short || `Step ${prev.length + 1}`,
        heat,
        time_minutes,
        step_instructions
      }
    ])

    setInstructionDraftShort("")
    setInstructionDraftLong("")
    setInstructionDraftHeat("")
    setInstructionDraftTimeMinutes("")
    setInstructionDraftIngredientIdToAdd("")
    setInstructionDraftStepIngredients([])
    closeAddInstructionPanel()
  }

  function addInstructionDraftStepIngredient() {
    const parsed = Number.parseInt(instructionDraftIngredientIdToAdd, 10)
    if (!Number.isInteger(parsed) || parsed <= 0) return

    setInstructionDraftStepIngredients((prev) => {
      if (prev.some((x) => x.ingredientId === parsed)) return prev
      return [...prev, { ingredientId: parsed, quantity: "", unit: "" }]
    })
  }

  function removeInstructionDraftStepIngredient(ingredientId: number) {
    setInstructionDraftStepIngredients((prev) =>
      prev.filter((x) => x.ingredientId !== ingredientId)
    )
  }

  function updateInstructionDraftStepIngredient(
    ingredientId: number,
    patch: Partial<{ quantity: string; unit: string }>
  ) {
    setInstructionDraftStepIngredients((prev) =>
      prev.map((x) =>
        x.ingredientId === ingredientId ? { ...x, ...patch } : x
      )
    )
  }

  function submitIngredientDraft() {
    setIngredientDraftError("")

    const unitTrimmed = ingredientDraftUnit.trim()
    const quantityTrimmed = ingredientDraftQuantity.trim()

    const quantity = quantityTrimmed ? Number(quantityTrimmed) : NaN
    const normalizedQuantity = Number.isFinite(quantity) ? quantity : null

    const bySelectedId = (() => {
      const parsed = Number.parseInt(ingredientDraftSourceId, 10)
      return Number.isInteger(parsed) ? ingredientById.get(parsed) : null
    })()

    const byName = (() => {
      const n = ingredientDraftName.trim().toLowerCase()
      if (!n) return null
      return (
        availableIngredients.find((x) => x.name.trim().toLowerCase() === n) ??
        null
      )
    })()

    const source = bySelectedId ?? byName
    if (!source) return

    if (editingIngredientId !== null) {
      const fromId = editingIngredientId
      const toId = source.id

      if (
        toId !== fromId &&
        builderIngredients.some((x) => x.ingredientId === toId)
      ) {
        setIngredientDraftError("That ingredient is already in the recipe.")
        return
      }

      setBuilderIngredients((prev) => {
        const existingIdx = prev.findIndex((x) => x.ingredientId === fromId)
        if (existingIdx === -1) return prev

        return prev.map((x) => {
          if (x.ingredientId !== fromId) return x
          return {
            ingredientId: toId,
            name: source.name,
            category: source.category ?? null,
            quantity: normalizedQuantity,
            unit: unitTrimmed || source.unit || null
          }
        })
      })

      if (toId !== fromId) {
        setInstructions((prev) =>
          prev.map((step) => ({
            ...step,
            step_instructions: step.step_instructions.map((si) =>
              si.ingredientId === fromId ? { ...si, ingredientId: toId } : si
            )
          }))
        )
      }

      setIngredientDraftQuantity("")
      setIngredientDraftUnit("")
      closeAddIngredientPanel()
      return
    }

    setBuilderIngredients((prev) => {
      if (prev.some((x) => x.ingredientId === source.id)) return prev
      return [
        ...prev,
        {
          ingredientId: source.id,
          name: source.name,
          category: source.category ?? null,
          quantity: normalizedQuantity,
          unit: unitTrimmed || source.unit || null
        }
      ]
    })

    setIngredientDraftQuantity("")
    setIngredientDraftUnit("")
    closeAddIngredientPanel()
  }

  function onSelectDraftIngredientSource(sourceId: string) {
    setIngredientDraftError("")
    setIngredientDraftSourceId(sourceId)
    const parsed = Number.parseInt(sourceId, 10)
    const ing = Number.isFinite(parsed) ? ingredientById.get(parsed) : undefined
    if (!ing) return
    setIngredientDraftName(ing.name)
    setIngredientPickerQuery(ing.name)
    if (ing.unit) setIngredientDraftUnit(String(ing.unit))
  }

  function onChangeIngredientDraftName(nextName: string) {
    setIngredientDraftError("")
    setIngredientDraftName(nextName)

    const normalized = nextName.trim().toLowerCase()
    if (!normalized) {
      setIngredientDraftSourceId("")
      return
    }

    const match =
      availableIngredients.find(
        (x) => x.name.trim().toLowerCase() === normalized
      ) ?? null

    if (!match) {
      setIngredientDraftSourceId("")
      return
    }

    setIngredientDraftSourceId(String(match.id))
    if (match.unit) setIngredientDraftUnit(String(match.unit))
  }

  function submitCreateIngredientDraft() {
    const fd = new FormData()
    fd.set("name", newIngredientName)
    fd.set("category", newIngredientCategory)
    fd.set("unit", newIngredientUnit)
    startTransition(() => {
      createIngredientFormAction(fd)
    })
  }

  return (
    <form action={formAction} className="flex flex-col gap-6 pb-24">
      <input type="hidden" name="videoUrl" value={videoUrl} />
      <input type="hidden" name="ingredientsJson" value={ingredientsJson} />
      <input type="hidden" name="instructionsJson" value={instructionsJson} />

      <div className="flex flex-col gap-1">
        <label className="sr-only" htmlFor="create-recipe-name">
          Name
        </label>
        <input
          id="create-recipe-name"
          name="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-transparent text-2xl font-bold text-foreground outline-none placeholder:text-muted-foreground"
          placeholder="New recipe name"
          autoComplete="off"
        />

        <label className="sr-only" htmlFor="create-recipe-description">
          Description
        </label>
        <textarea
          id="create-recipe-description"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full resize-none bg-transparent text-muted-foreground outline-none placeholder:text-muted-foreground"
          placeholder="Optional description"
          rows={2}
        />
      </div>

      {videoEmbedUrl ? (
        <iframe
          className="aspect-video w-full rounded"
          ref={youtubeIframeRef}
          src={videoEmbedUrl}
          title={name.trim() || "Recipe video"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      ) : videoUrl.trim() ? (
        <a
          className="underline"
          href={videoUrl}
          target="_blank"
          rel="noreferrer"
        >
          Watch video
        </a>
      ) : (
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setVideoDraftUrl(videoUrl)
              setIsVideoEditorOpen(true)
            }}
          >
            Add video
          </Button>
        </div>
      )}

      {videoUrl.trim() ? (
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setVideoDraftUrl(videoUrl)
              setIsVideoEditorOpen(true)
            }}
          >
            Change video
          </Button>
          <Button type="button" variant="secondary" onClick={removeVideo}>
            Remove video
          </Button>
        </div>
      ) : null}

      <RecipeSectionsToggle
        ingredients={previewIngredients}
        instructions={previewInstructions}
        onTabChange={setActiveTab}
        onEditIngredient={openEditIngredient}
        onEditInstruction={openEditInstruction}
        footerExtra={
          <Button type="submit" variant="success" disabled={isPending}>
            {isPending ? "Creating…" : "Create recipe"}
          </Button>
        }
      />

      {actionState.status === "error" ? (
        <p className="text-sm text-red-600">{actionState.message}</p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="button" onClick={openAddPanelForActiveTab}>
          {addButtonLabel}
        </Button>
      </div>

      {isVideoEditorOpen ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-background/80"
            onClick={() => setIsVideoEditorOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-24 z-50">
            <div className="mx-auto w-full max-w-3xl px-4">
              <div className="rounded-lg border border-border bg-background p-4">
                <div className="flex flex-col gap-3">
                  <p className="text-sm font-medium">Video URL</p>
                  <input
                    value={videoDraftUrl}
                    onChange={(e) => setVideoDraftUrl(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                    placeholder="https://www.youtube.com/watch?v=…"
                    autoComplete="off"
                  />
                  <div className="flex items-center gap-3">
                    <Button type="button" onClick={submitVideoDraft}>
                      Save
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setIsVideoEditorOpen(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {isAddInstructionOpen ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-background/80"
            onClick={closeAddInstructionPanel}
          />
          <div className="fixed inset-x-0 bottom-24 z-50">
            <div className="mx-auto w-full max-w-3xl px-4">
              <div className="rounded-lg border border-border bg-background p-4">
                <div className="flex flex-col gap-3">
                  <p className="text-sm font-medium">
                    {editingInstructionIdx !== null
                      ? "Edit instruction"
                      : "New instruction"}
                  </p>
                  <input
                    value={instructionDraftShort}
                    onChange={(e) => setInstructionDraftShort(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                    placeholder="Short step (e.g. Cook salmon)"
                    autoComplete="off"
                  />
                  <textarea
                    value={instructionDraftLong}
                    onChange={(e) => setInstructionDraftLong(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                    placeholder="Details (optional)"
                    rows={4}
                  />

                  <div className="flex items-center gap-2">
                    <input
                      value={instructionDraftHeat}
                      onChange={(e) => setInstructionDraftHeat(e.target.value)}
                      className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-foreground"
                      placeholder="Heat (optional) e.g. medium"
                      autoComplete="off"
                    />
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={instructionDraftTimeMinutes}
                      onChange={(e) =>
                        setInstructionDraftTimeMinutes(e.target.value)
                      }
                      className="w-28 rounded-md border border-border bg-background px-3 py-2 text-foreground"
                      placeholder="Min"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Step ingredients
                    </p>

                    {builderIngredients.length ? (
                      <div className="flex items-center gap-2">
                        <select
                          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-foreground"
                          value={instructionDraftIngredientIdToAdd}
                          onChange={(e) =>
                            setInstructionDraftIngredientIdToAdd(e.target.value)
                          }
                        >
                          <option value="">Select ingredient…</option>
                          {builderIngredients.map((ing) => (
                            <option
                              key={ing.ingredientId}
                              value={String(ing.ingredientId)}
                            >
                              {ing.name}
                              {ing.quantity !== null &&
                              ing.quantity !== undefined
                                ? ing.unit
                                  ? ` — ${ing.quantity} ${ing.unit} available`
                                  : ` — ${ing.quantity} available`
                                : ing.unit
                                  ? ` — ${ing.unit} available`
                                  : ""}
                            </option>
                          ))}
                        </select>

                        <Button
                          type="button"
                          variant="secondary"
                          onClick={addInstructionDraftStepIngredient}
                          disabled={!instructionDraftIngredientIdToAdd}
                        >
                          Add
                        </Button>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Add ingredients to the recipe first to attach them to a
                        step.
                      </p>
                    )}

                    {instructionDraftStepIngredients.length ? (
                      <div className="flex flex-col gap-2">
                        {instructionDraftStepIngredients.map((si) => {
                          const baseIngredient = builderIngredients.find(
                            (x) => x.ingredientId === si.ingredientId
                          )
                          const ingName =
                            baseIngredient?.name ??
                            `Ingredient ${si.ingredientId}`

                          const availableText =
                            baseIngredient &&
                            (baseIngredient.quantity !== null &&
                            baseIngredient.quantity !== undefined
                              ? baseIngredient.unit
                                ? `${baseIngredient.quantity} ${baseIngredient.unit}`
                                : String(baseIngredient.quantity)
                              : baseIngredient.unit
                                ? String(baseIngredient.unit)
                                : "")

                          return (
                            <div
                              key={si.ingredientId}
                              className="flex flex-col gap-2 rounded-md border border-border bg-background/50 px-3 py-2"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex flex-col">
                                  <p className="text-sm font-medium leading-tight">
                                    {ingName}
                                  </p>
                                  {availableText ? (
                                    <p className="text-xs text-muted-foreground">
                                      Available: {availableText}
                                    </p>
                                  ) : null}
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  onClick={() =>
                                    removeInstructionDraftStepIngredient(
                                      si.ingredientId
                                    )
                                  }
                                >
                                  Remove
                                </Button>
                              </div>

                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  step="any"
                                  value={si.quantity}
                                  onChange={(e) =>
                                    updateInstructionDraftStepIngredient(
                                      si.ingredientId,
                                      {
                                        quantity: e.target.value
                                      }
                                    )
                                  }
                                  className="w-28 rounded-md border border-border bg-background px-3 py-2 text-foreground"
                                  placeholder="Qty"
                                />
                                <input
                                  value={si.unit}
                                  onChange={(e) =>
                                    updateInstructionDraftStepIngredient(
                                      si.ingredientId,
                                      {
                                        unit: e.target.value
                                      }
                                    )
                                  }
                                  className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-foreground"
                                  placeholder="Unit"
                                  autoComplete="off"
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-3">
                    <Button type="button" onClick={submitInstructionDraft}>
                      {editingInstructionIdx !== null ? "Save" : "Add"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={closeAddInstructionPanel}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {isAddIngredientOpen ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-background/80"
            onClick={closeAddIngredientPanel}
          />
          <div className="fixed inset-x-0 bottom-24 z-50">
            <div className="mx-auto w-full max-w-3xl px-4">
              <div className="rounded-lg border border-border bg-background p-4">
                <div className="flex flex-col gap-3">
                  <p className="text-sm font-medium">
                    {editingIngredientId !== null
                      ? "Edit ingredient"
                      : "Add ingredient"}
                  </p>

                  {ingredientsError ? (
                    <p className="text-sm text-red-600">{ingredientsError}</p>
                  ) : null}

                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">Name</span>
                    <input
                      value={ingredientDraftName}
                      onChange={(e) =>
                        onChangeIngredientDraftName(e.target.value)
                      }
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                      placeholder="e.g. Salmon"
                      autoComplete="off"
                      list="ingredient-name-suggestions"
                    />
                    {availableIngredients.length ? (
                      <datalist id="ingredient-name-suggestions">
                        {availableIngredients.map((ing) => (
                          <option key={ing.id} value={ing.name} />
                        ))}
                      </datalist>
                    ) : null}
                  </label>

                  {availableIngredients.length ? (
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground">
                        Or pick from list
                      </span>
                      <input
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                        value={ingredientPickerQuery}
                        onChange={(e) => {
                          setIngredientPickerQuery(e.target.value)
                          setIsIngredientPickerOpen(true)
                        }}
                        onFocus={() => setIsIngredientPickerOpen(true)}
                        onBlur={() => setIsIngredientPickerOpen(false)}
                        placeholder="Start typing to search…"
                        autoComplete="off"
                      />

                      {isIngredientPickerOpen ? (
                        <div className="max-h-56 overflow-auto rounded-md border border-border bg-background">
                          {groupedIngredientMatches.length ? (
                            <div className="p-2">
                              {groupedIngredientMatches.map((group) => (
                                <div key={group.category} className="mb-2">
                                  <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
                                    {group.category}
                                  </p>
                                  <div className="flex flex-col">
                                    {group.items.map((ing) => (
                                      <button
                                        key={ing.id}
                                        type="button"
                                        className="rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                                        onMouseDown={(e) => {
                                          e.preventDefault()
                                          onSelectDraftIngredientSource(
                                            String(ing.id)
                                          )
                                          setIsIngredientPickerOpen(false)
                                        }}
                                      >
                                        {ing.name}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="p-3 text-sm text-muted-foreground">
                              No matches.
                            </p>
                          )}
                        </div>
                      ) : null}
                    </label>
                  ) : null}

                  {ingredientDraftName.trim() && !ingredientDraftSourceId ? (
                    <p className="text-xs text-muted-foreground">
                      Choose an existing ingredient name (this recipe save
                      requires an ingredient that already exists).
                    </p>
                  ) : null}

                  {ingredientDraftError ? (
                    <p className="text-sm text-red-600">
                      {ingredientDraftError}
                    </p>
                  ) : null}
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      inputMode="decimal"
                      step="any"
                      value={ingredientDraftQuantity}
                      onChange={(e) =>
                        setIngredientDraftQuantity(e.target.value)
                      }
                      className="w-28 rounded-md border border-border bg-background px-3 py-2 text-foreground"
                      placeholder="Qty"
                    />
                    <input
                      value={ingredientDraftUnit}
                      onChange={(e) => setIngredientDraftUnit(e.target.value)}
                      className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-foreground"
                      placeholder="Unit (e.g. tbsp)"
                      autoComplete="off"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      onClick={() => {
                        const hasMatch = Boolean(ingredientDraftSourceId)
                        if (!hasMatch) {
                          setIngredientDraftError(
                            "Pick an ingredient that already exists (use the suggestions/list)."
                          )
                          return
                        }

                        submitIngredientDraft()
                      }}
                      disabled={
                        !availableIngredients.length && !ingredientDraftSourceId
                      }
                    >
                      {editingIngredientId !== null ? "Save" : "Add"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setNewIngredientName(ingredientDraftName.trim())
                        setNewIngredientCategory("")
                        setNewIngredientUnit(ingredientDraftUnit.trim())
                        setIsCreateIngredientOpen(true)
                      }}
                    >
                      Create new ingredient
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={closeAddIngredientPanel}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {isCreateIngredientOpen ? (
        <>
          <div
            className="fixed inset-0 z-50 bg-background/80"
            onClick={() => setIsCreateIngredientOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-24 z-50">
            <div className="mx-auto w-full max-w-3xl px-4">
              <div className="rounded-lg border border-border bg-background p-4">
                <div className="flex flex-col gap-3">
                  <p className="text-sm font-medium">Create ingredient</p>

                  {createIngredientState.status === "error" ? (
                    <p className="text-sm text-red-600">
                      {createIngredientState.message}
                    </p>
                  ) : null}

                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">Name</span>
                    <input
                      value={newIngredientName}
                      onChange={(e) => setNewIngredientName(e.target.value)}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                      placeholder="e.g. Salmon"
                      autoComplete="off"
                    />
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">
                      Category (optional)
                    </span>
                    <input
                      value={newIngredientCategory}
                      onChange={(e) => {
                        setNewIngredientCategory(e.target.value)
                        setIsCategorySuggestionsOpen(true)
                      }}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                      placeholder="e.g. Protein"
                      autoComplete="off"
                      onFocus={() => setIsCategorySuggestionsOpen(true)}
                      onBlur={() => setIsCategorySuggestionsOpen(false)}
                    />

                    {isCategorySuggestionsOpen &&
                    filteredCategoryOptions.length ? (
                      <div className="max-h-40 overflow-auto rounded-md border border-border bg-background">
                        <div className="p-2">
                          {filteredCategoryOptions.map((c) => (
                            <button
                              key={c}
                              type="button"
                              className="w-full rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                              onMouseDown={(e) => {
                                e.preventDefault()
                                setNewIngredientCategory(c)
                                setIsCategorySuggestionsOpen(false)
                              }}
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">
                      Default unit (optional)
                    </span>
                    <input
                      value={newIngredientUnit}
                      onChange={(e) => setNewIngredientUnit(e.target.value)}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                      placeholder="e.g. tbsp"
                      autoComplete="off"
                    />
                  </label>

                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      disabled={
                        isCreatingIngredient || !newIngredientName.trim()
                      }
                      onClick={submitCreateIngredientDraft}
                    >
                      {isCreatingIngredient ? "Creating…" : "Create"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setIsCreateIngredientOpen(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </form>
  )
}
