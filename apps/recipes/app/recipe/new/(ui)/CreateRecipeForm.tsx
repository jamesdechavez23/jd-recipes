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
import { Alert, AlertDescription } from "@repo/ui/shadcn/alert"
import { Button } from "@repo/ui/shadcn/button"
import ConfirmResetDialog from "./create-recipe-form/ConfirmResetDialog"
import CreateIngredientSheet from "./create-recipe-form/CreateIngredientSheet"
import IngredientEditorSheet from "./create-recipe-form/IngredientEditorSheet"
import InstructionEditorSheet from "./create-recipe-form/InstructionEditorSheet"
import RecipeSectionsToggle, {
  type DisplayIngredient,
  type TabKey
} from "../../[id]/(ui)/RecipeSectionsToggle"
import type {
  BuilderIngredient,
  BuilderInstruction,
  RecipeEditorInitialData
} from "./create-recipe-form/types"
import {
  getNextInstructionId,
  normalizeCategory,
  parseQuantityInput,
  renumberInstructions,
  toYoutubeEmbedUrl
} from "./create-recipe-form/utils"
import type { IngredientListItem } from "@recipes/server/ingredients/getIngredients"
import type {
  CreateIngredientActionState,
  RecipeEditorActionState
} from "./create-recipe-form/actionTypes"
import VideoEditorSheet from "./create-recipe-form/VideoEditorSheet"

declare global {
  interface Window {
    // Minimal YouTube IFrame API surface we use.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    YT?: any
    onYouTubeIframeAPIReady?: () => void
  }
}

interface CreateRecipeFormProps {
  recipeAction: (
    prevState: RecipeEditorActionState,
    formData: FormData
  ) => Promise<RecipeEditorActionState>
  createIngredientAction: (
    prevState: CreateIngredientActionState,
    formData: FormData
  ) => Promise<CreateIngredientActionState>
  canCreateIngredients: boolean
  ingredients: IngredientListItem[]
  ingredientsError: string | null
  initialRecipe?: RecipeEditorInitialData
  mode?: "create" | "edit"
  draftStorageKey?: string | null
}

const DEFAULT_DRAFT_STORAGE_KEY = "jd-recipes-create-recipe-form-v1"

const EMPTY_RECIPE: RecipeEditorInitialData = {
  name: "",
  description: "",
  videoUrl: "",
  instructions: [],
  ingredients: []
}

export default function CreateRecipeForm({
  recipeAction,
  createIngredientAction,
  canCreateIngredients,
  ingredients,
  ingredientsError,
  initialRecipe = EMPTY_RECIPE,
  mode = "create",
  draftStorageKey = DEFAULT_DRAFT_STORAGE_KEY
}: CreateRecipeFormProps) {
  const formRef = useRef<HTMLFormElement | null>(null)
  const router = useRouter()
  const lastAutoDescriptionVideoUrlRef = useRef<string | null>(null)
  const isCreateMode = mode === "create"
  const resetButtonLabel = isCreateMode ? "Start over" : "Reset changes"
  const submitButtonLabel = isCreateMode ? "Create recipe" : "Save changes"
  const pendingSubmitButtonLabel = isCreateMode ? "Creating…" : "Saving…"

  const youtubeIframeRef = useRef<HTMLIFrameElement | null>(null)
  const ingredientPickerInputRef = useRef<HTMLInputElement | null>(null)
  const instructionShortInputRef = useRef<HTMLInputElement | null>(null)
  const videoDraftInputRef = useRef<HTMLInputElement | null>(null)
  const createIngredientNameInputRef = useRef<HTMLInputElement | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const youtubePlayerRef = useRef<any>(null)
  const youtubeLastKnownStateRef = useRef<number | null>(null)
  const youtubeWasPlayingBeforeSheetRef = useRef<boolean>(false)
  const youtubeApiReadyPromiseRef = useRef<Promise<void> | null>(null)
  const [actionState, formAction, isPending] = useActionState(recipeAction, {
    status: "idle"
  })

  const [
    createIngredientState,
    createIngredientFormAction,
    isCreatingIngredient
  ] = useActionState(createIngredientAction, { status: "idle" })

  const [availableIngredients, setAvailableIngredients] =
    useState<IngredientListItem[]>(ingredients)

  const [name, setName] = useState<string>(initialRecipe.name)
  const [description, setDescription] = useState<string>(
    initialRecipe.description
  )
  const [videoUrl, setVideoUrl] = useState<string>(initialRecipe.videoUrl)
  const [activeTab, setActiveTab] = useState<TabKey>("instructions")
  const [instructions, setInstructions] = useState<BuilderInstruction[]>(() =>
    renumberInstructions(initialRecipe.instructions)
  )
  const [builderIngredients, setBuilderIngredients] = useState<
    BuilderIngredient[]
  >(initialRecipe.ingredients)

  function clearDraftStorage() {
    if (!draftStorageKey || typeof window === "undefined") return
    try {
      window.localStorage.removeItem(draftStorageKey)
    } catch {}
  }

  function restoreInitialRecipe() {
    setName(initialRecipe.name)
    setDescription(initialRecipe.description)
    setVideoUrl(initialRecipe.videoUrl)
    setActiveTab("instructions")
    setInstructions(renumberInstructions(initialRecipe.instructions))
    setBuilderIngredients(initialRecipe.ingredients)
    setNextInstructionId(getNextInstructionId(initialRecipe.instructions))
  }

  // Restore from localStorage on mount
  useEffect(() => {
    if (!draftStorageKey || typeof window === "undefined") return
    try {
      const raw = window.localStorage.getItem(draftStorageKey)
      if (!raw) return
      const data = JSON.parse(raw)
      if (typeof data !== "object" || !data) return
      if (typeof data.name === "string") setName(data.name)
      if (typeof data.description === "string") setDescription(data.description)
      if (typeof data.videoUrl === "string") setVideoUrl(data.videoUrl)
      if (typeof data.activeTab === "string") setActiveTab(data.activeTab)
      if (Array.isArray(data.instructions)) {
        const restoredInstructions = data.instructions as BuilderInstruction[]
        setInstructions(renumberInstructions(restoredInstructions))
        setNextInstructionId(getNextInstructionId(restoredInstructions))
      }
      if (Array.isArray(data.builderIngredients))
        setBuilderIngredients(data.builderIngredients)
    } catch {}
  }, [draftStorageKey])

  // Save to localStorage on change
  useEffect(() => {
    if (!draftStorageKey || typeof window === "undefined") return
    const data = {
      name,
      description,
      videoUrl,
      activeTab,
      instructions,
      builderIngredients
    }
    try {
      window.localStorage.setItem(draftStorageKey, JSON.stringify(data))
    } catch {}
  }, [
    activeTab,
    builderIngredients,
    description,
    draftStorageKey,
    instructions,
    name,
    videoUrl
  ])

  const [nextInstructionId, setNextInstructionId] = useState<number>(() =>
    getNextInstructionId(initialRecipe.instructions)
  )

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
  const [highlightedCategoryOption, setHighlightedCategoryOption] = useState<
    string | null
  >(null)

  const [ingredientPickerQuery, setIngredientPickerQuery] = useState<string>("")
  const [isIngredientPickerOpen, setIsIngredientPickerOpen] =
    useState<boolean>(false)
  const [highlightedIngredientId, setHighlightedIngredientId] = useState<
    number | null
  >(null)
  const [showConfirmReset, setShowConfirmReset] = useState<boolean>(false)

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

  useEffect(() => {
    if (!isCategorySuggestionsOpen) {
      setHighlightedCategoryOption(null)
      return
    }

    if (!filteredCategoryOptions.length) {
      setHighlightedCategoryOption(null)
      return
    }

    const hasHighlighted = filteredCategoryOptions.includes(
      highlightedCategoryOption ?? ""
    )
    if (!hasHighlighted) {
      setHighlightedCategoryOption(filteredCategoryOptions[0] ?? null)
    }
  }, [
    filteredCategoryOptions,
    highlightedCategoryOption,
    isCategorySuggestionsOpen
  ])

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

  const flatIngredientMatches = useMemo(() => {
    return groupedIngredientMatches.flatMap((group) => group.items)
  }, [groupedIngredientMatches])

  useEffect(() => {
    if (!isIngredientPickerOpen) {
      setHighlightedIngredientId(null)
      return
    }

    if (!flatIngredientMatches.length) {
      setHighlightedIngredientId(null)
      return
    }

    const hasHighlighted = flatIngredientMatches.some(
      (ingredient) => ingredient.id === highlightedIngredientId
    )
    if (!hasHighlighted) {
      setHighlightedIngredientId(flatIngredientMatches[0]?.id ?? null)
    }
  }, [flatIngredientMatches, highlightedIngredientId, isIngredientPickerOpen])

  useEffect(() => {
    setAvailableIngredients(ingredients)
  }, [ingredients])

  const videoEmbedUrl = useMemo(() => {
    if (!videoUrl.trim()) return null
    return toYoutubeEmbedUrl(videoUrl)
  }, [videoUrl])

  const previewInstructions = useMemo(() => {
    return instructions.map((x) => ({
      id: x.id,
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
        quantity_display: x.quantityDisplay ?? null,
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
        step_instructions: x.step_instructions.map((si) => ({
          ingredientId: si.ingredientId,
          quantity: si.quantity,
          quantity_display: si.quantity_display ?? null,
          unit: si.unit
        }))
      }))
    )
  }, [instructions])

  function tryGetRecipeId(recipe: unknown): number | null {
    if (!recipe || typeof recipe !== "object") return null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyRecipe = recipe as any
    const id = Number(anyRecipe.id ?? anyRecipe.recipeId)
    return Number.isInteger(id) && id > 0 ? id : null
  }

  useEffect(() => {
    if (actionState.status !== "success") return
    clearDraftStorage()
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

  useEffect(() => {
    if (!isAddIngredientOpen) return

    const rafId = requestAnimationFrame(() => {
      ingredientPickerInputRef.current?.focus()
    })

    return () => cancelAnimationFrame(rafId)
  }, [isAddIngredientOpen])

  useEffect(() => {
    if (!isAddInstructionOpen) return

    const rafId = requestAnimationFrame(() => {
      instructionShortInputRef.current?.focus()
    })

    return () => cancelAnimationFrame(rafId)
  }, [isAddInstructionOpen])

  useEffect(() => {
    if (!isVideoEditorOpen) return

    const rafId = requestAnimationFrame(() => {
      videoDraftInputRef.current?.focus()
    })

    return () => cancelAnimationFrame(rafId)
  }, [isVideoEditorOpen])

  useEffect(() => {
    if (!isCreateIngredientOpen) return

    const rafId = requestAnimationFrame(() => {
      createIngredientNameInputRef.current?.focus()
    })

    return () => cancelAnimationFrame(rafId)
  }, [isCreateIngredientOpen])

  function openAddIngredientPanel() {
    pauseYouTubeIfPlaying()
    setActiveTab("ingredients")
    setEditingIngredientId(null)
    setIngredientDraftSourceId("")
    setIngredientDraftName("")
    setIngredientPickerQuery("")
    setIsIngredientPickerOpen(false)
    setHighlightedIngredientId(null)
    setIngredientDraftError("")
    setIngredientDraftQuantity("")
    setIngredientDraftUnit("")
    setIsAddIngredientOpen(true)
  }

  function openAddInstructionPanel() {
    pauseYouTubeIfPlaying()
    setActiveTab("instructions")
    setEditingInstructionIdx(null)
    setInstructionDraftShort("")
    setInstructionDraftLong("")
    setInstructionDraftHeat("")
    setInstructionDraftTimeMinutes("")
    setInstructionDraftIngredientIdToAdd("")
    setInstructionDraftStepIngredients([])
    setIsAddInstructionOpen(true)
  }

  function openAddPanelForActiveTab() {
    if (activeTab === "ingredients") {
      openAddIngredientPanel()
      return
    }
    openAddInstructionPanel()
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
      existing.quantityDisplay
        ? String(existing.quantityDisplay)
        : existing.quantity !== null && existing.quantity !== undefined
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
        quantity: si.quantity_display
          ? String(si.quantity_display)
          : si.quantity !== null && si.quantity !== undefined
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

        const nextDescription = `Learned from YouTube recipe '${title || "this video"}' from channel '${author || "the creator"}'.`

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
        const parsedQuantity = parseQuantityInput(si.quantity)
        const unitRaw = si.unit.trim()
        const unit = unitRaw ? unitRaw : null

        return {
          ingredientId: si.ingredientId,
          quantity: parsedQuantity.quantity,
          quantity_display: parsedQuantity.quantityDisplay,
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
      // Find the ingredient's default unit from builderIngredients
      const baseIngredient = builderIngredients.find(
        (x) => x.ingredientId === parsed
      )
      const defaultUnit = baseIngredient?.unit
        ? String(baseIngredient.unit)
        : ""
      return [
        ...prev,
        { ingredientId: parsed, quantity: "", unit: defaultUnit }
      ]
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
    const parsedQuantity = parseQuantityInput(quantityTrimmed)
    const normalizedQuantity = parsedQuantity.quantity

    const bySelectedId = (() => {
      const parsed = Number.parseInt(ingredientDraftSourceId, 10)
      return Number.isInteger(parsed) ? ingredientById.get(parsed) : null
    })()

    const source = bySelectedId
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
            quantityDisplay: parsedQuantity.quantityDisplay,
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
          quantityDisplay: parsedQuantity.quantityDisplay,
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
    setHighlightedIngredientId(ing.id)
    if (ing.unit) setIngredientDraftUnit(String(ing.unit))
  }

  function onChangeIngredientPickerQuery(nextQuery: string) {
    setIngredientDraftError("")
    setIngredientPickerQuery(nextQuery)
    setIngredientDraftName(nextQuery)
    setIngredientDraftSourceId("")
    setIsIngredientPickerOpen(true)
  }

  function onChangeCategoryQuery(nextQuery: string) {
    setNewIngredientCategory(nextQuery)
    setIsCategorySuggestionsOpen(true)
  }

  function onCategorySuggestionsKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (!isCategorySuggestionsOpen && event.key === "ArrowDown") {
      event.preventDefault()
      setIsCategorySuggestionsOpen(true)
      setHighlightedCategoryOption(filteredCategoryOptions[0] ?? null)
      return
    }

    if (!filteredCategoryOptions.length) {
      if (event.key === "Escape") setIsCategorySuggestionsOpen(false)
      return
    }

    const currentIndex = filteredCategoryOptions.findIndex(
      (option) => option === highlightedCategoryOption
    )

    if (event.key === "ArrowDown") {
      event.preventDefault()
      setIsCategorySuggestionsOpen(true)
      const nextIndex =
        currentIndex >= 0
          ? (currentIndex + 1) % filteredCategoryOptions.length
          : 0
      setHighlightedCategoryOption(filteredCategoryOptions[nextIndex] ?? null)
      return
    }

    if (event.key === "ArrowUp") {
      event.preventDefault()
      setIsCategorySuggestionsOpen(true)
      const nextIndex =
        currentIndex >= 0
          ? (currentIndex - 1 + filteredCategoryOptions.length) %
            filteredCategoryOptions.length
          : filteredCategoryOptions.length - 1
      setHighlightedCategoryOption(filteredCategoryOptions[nextIndex] ?? null)
      return
    }

    if (event.key === "Enter") {
      if (!isCategorySuggestionsOpen) return
      event.preventDefault()
      if (!highlightedCategoryOption) return
      setNewIngredientCategory(highlightedCategoryOption)
      setIsCategorySuggestionsOpen(false)
      return
    }

    if (event.key === "Escape") {
      event.preventDefault()
      setIsCategorySuggestionsOpen(false)
    }
  }

  function onIngredientPickerKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (!isIngredientPickerOpen && event.key === "ArrowDown") {
      event.preventDefault()
      setIsIngredientPickerOpen(true)
      setHighlightedIngredientId(flatIngredientMatches[0]?.id ?? null)
      return
    }

    if (!flatIngredientMatches.length) {
      if (event.key === "Escape") setIsIngredientPickerOpen(false)
      return
    }

    const currentIndex = flatIngredientMatches.findIndex(
      (ingredient) => ingredient.id === highlightedIngredientId
    )

    if (event.key === "ArrowDown") {
      event.preventDefault()
      setIsIngredientPickerOpen(true)
      const nextIndex =
        currentIndex >= 0
          ? (currentIndex + 1) % flatIngredientMatches.length
          : 0
      setHighlightedIngredientId(flatIngredientMatches[nextIndex]?.id ?? null)
      return
    }

    if (event.key === "ArrowUp") {
      event.preventDefault()
      setIsIngredientPickerOpen(true)
      const nextIndex =
        currentIndex >= 0
          ? (currentIndex - 1 + flatIngredientMatches.length) %
            flatIngredientMatches.length
          : flatIngredientMatches.length - 1
      setHighlightedIngredientId(flatIngredientMatches[nextIndex]?.id ?? null)
      return
    }

    if (event.key === "Enter") {
      if (!isIngredientPickerOpen) return
      event.preventDefault()
      const selectedIngredient = flatIngredientMatches.find(
        (ingredient) => ingredient.id === highlightedIngredientId
      )
      if (!selectedIngredient) return
      onSelectDraftIngredientSource(String(selectedIngredient.id))
      setIsIngredientPickerOpen(false)
      return
    }

    if (event.key === "Escape") {
      event.preventDefault()
      setIsIngredientPickerOpen(false)
    }
  }

  function submitCreateIngredientDraft() {
    if (!newIngredientName.trim()) return
    const fd = new FormData()
    fd.set("name", newIngredientName)
    fd.set("category", newIngredientCategory)
    fd.set("unit", newIngredientUnit)
    startTransition(() => {
      createIngredientFormAction(fd)
    })
  }

  function trySubmitIngredientDraft() {
    const hasMatch = Boolean(ingredientDraftSourceId)
    if (!hasMatch) {
      setIngredientDraftError(
        "Pick an ingredient that already exists (use the suggestions/list)."
      )
      return
    }

    submitIngredientDraft()
  }

  function closeCurrentPanel() {
    if (showConfirmReset) {
      setShowConfirmReset(false)
      return
    }
    if (isCreateIngredientOpen) {
      setIsCreateIngredientOpen(false)
      return
    }
    if (isAddIngredientOpen) {
      if (isIngredientPickerOpen) {
        setIsIngredientPickerOpen(false)
        return
      }
      closeAddIngredientPanel()
      return
    }
    if (isAddInstructionOpen) {
      closeAddInstructionPanel()
      return
    }
    if (isVideoEditorOpen) {
      setIsVideoEditorOpen(false)
      return
    }
  }

  useEffect(() => {
    const onWindowKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return

      if (event.key === "Escape") {
        const hasOpenPanel =
          showConfirmReset ||
          isCreateIngredientOpen ||
          isAddIngredientOpen ||
          isAddInstructionOpen ||
          isVideoEditorOpen
        if (!hasOpenPanel) return
        event.preventDefault()
        closeCurrentPanel()
        return
      }

      if (event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
        const key = event.key.toLowerCase()
        const hasOpenPanel =
          showConfirmReset ||
          isCreateIngredientOpen ||
          isAddIngredientOpen ||
          isAddInstructionOpen ||
          isVideoEditorOpen

        if (key === "1") {
          if (!hasOpenPanel) {
            event.preventDefault()
            setActiveTab("instructions")
          }
          return
        }

        if (key === "2") {
          if (!hasOpenPanel) {
            event.preventDefault()
            setActiveTab("ingredients")
          }
          return
        }

        if (key === "i") {
          if (!hasOpenPanel) {
            event.preventDefault()
            openAddPanelForActiveTab()
          }
          return
        }
        return
      }

      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault()

        if (showConfirmReset) {
          resetForm()
          return
        }
        if (isCreateIngredientOpen) {
          submitCreateIngredientDraft()
          return
        }
        if (isAddIngredientOpen) {
          trySubmitIngredientDraft()
          return
        }
        if (isAddInstructionOpen) {
          submitInstructionDraft()
          return
        }
        if (isVideoEditorOpen) {
          submitVideoDraft()
          return
        }
        if (!isPending) {
          formRef.current?.requestSubmit()
        }
      }
    }

    window.addEventListener("keydown", onWindowKeyDown)
    return () => window.removeEventListener("keydown", onWindowKeyDown)
  }, [
    isAddIngredientOpen,
    isAddInstructionOpen,
    isCreateIngredientOpen,
    isIngredientPickerOpen,
    isPending,
    isVideoEditorOpen,
    newIngredientName,
    showConfirmReset,
    ingredientDraftSourceId,
    activeTab,
    submitInstructionDraft,
    submitVideoDraft
  ])

  function deleteInstruction(instructionIdx: number) {
    setInstructions((prev) =>
      renumberInstructions(prev.filter((_, idx) => idx !== instructionIdx))
    )
  }

  function reorderInstruction(fromIndex: number, toIndex: number) {
    setInstructions((prev) => {
      if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= prev.length ||
        toIndex >= prev.length ||
        fromIndex === toIndex
      ) {
        return prev
      }

      const next = [...prev]
      const [movedInstruction] = next.splice(fromIndex, 1)
      if (!movedInstruction) return prev
      next.splice(toIndex, 0, movedInstruction)
      return renumberInstructions(next)
    })
  }

  function deleteIngredient(ingredientId: number) {
    setBuilderIngredients((prev) =>
      prev.filter((ingredient) => ingredient.ingredientId !== ingredientId)
    )
    setInstructions((prev) =>
      prev.map((step) => ({
        ...step,
        step_instructions: step.step_instructions.filter(
          (stepIngredient) => stepIngredient.ingredientId !== ingredientId
        )
      }))
    )
  }

  function resetForm() {
    restoreInitialRecipe()
    setVideoDraftUrl("")
    setIsVideoEditorOpen(false)
    setIsAddInstructionOpen(false)
    setEditingInstructionIdx(null)
    setInstructionDraftShort("")
    setInstructionDraftLong("")
    setInstructionDraftHeat("")
    setInstructionDraftTimeMinutes("")
    setInstructionDraftIngredientIdToAdd("")
    setInstructionDraftStepIngredients([])
    setIsAddIngredientOpen(false)
    setEditingIngredientId(null)
    setIngredientDraftSourceId("")
    setIngredientDraftName("")
    setIngredientDraftError("")
    setIngredientDraftQuantity("")
    setIngredientDraftUnit("")
    setIsCreateIngredientOpen(false)
    setNewIngredientName("")
    setNewIngredientCategory("")
    setNewIngredientUnit("")
    setIsCategorySuggestionsOpen(false)
    setIngredientPickerQuery("")
    setIsIngredientPickerOpen(false)
    setShowConfirmReset(false)
    clearDraftStorage()
  }

  const recipeHeaderFields = (
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
        placeholder={isCreateMode ? "New recipe name" : "Recipe name"}
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
  )

  const openVideoEditor = () => {
    setVideoDraftUrl(videoUrl)
    setIsVideoEditorOpen(true)
  }

  const recipeVideoControls = videoUrl.trim() ? (
    <div className="flex items-center gap-3">
      <Button type="button" variant="secondary" onClick={openVideoEditor}>
        Change video
      </Button>
      <Button type="button" variant="secondary" onClick={removeVideo}>
        Remove video
      </Button>
    </div>
  ) : null

  const recipeErrorNotice =
    actionState.status === "error" ? (
      <Alert variant="destructive">
        <AlertDescription>{actionState.message}</AlertDescription>
      </Alert>
    ) : null

  const recipeSections = (
    <RecipeSectionsToggle
      ingredients={previewIngredients}
      instructions={previewInstructions}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      instructionsTabLabel="Instructions (Alt+1)"
      ingredientsTabLabel="Ingredients (Alt+2)"
      onEditIngredient={openEditIngredient}
      onEditInstruction={openEditInstruction}
      onDeleteIngredient={deleteIngredient}
      onDeleteInstruction={deleteInstruction}
      onReorderInstruction={reorderInstruction}
      ingredientsHeaderExtra={
        <Button
          type="button"
          size="sm"
          onClick={() => {
            setActiveTab("ingredients")
            openAddPanelForActiveTab()
          }}
        >
          Add ingredient (Alt+I)
        </Button>
      }
      instructionsHeaderExtra={
        <Button
          type="button"
          size="sm"
          onClick={() => {
            setActiveTab("instructions")
            openAddPanelForActiveTab()
          }}
        >
          Add instruction (Alt+I)
        </Button>
      }
      footerExtra={
        <>
          <Button
            type="button"
            variant={isCreateMode ? "destructive" : "outline"}
            className={
              isCreateMode
                ? "w-full bg-destructive text-destructive-foreground hover:bg-destructive/85 min-w-0 flex-1 basis-[calc(50%-0.375rem)] md:basis-0"
                : "w-full min-w-0 flex-1 basis-[calc(50%-0.375rem)] md:basis-0"
            }
            onClick={() => setShowConfirmReset(true)}
          >
            {resetButtonLabel}
          </Button>

          <Button
            type="submit"
            variant="success"
            className="min-w-0 flex-1 basis-[calc(50%-0.375rem)] md:basis-0"
            disabled={isPending}
          >
            {isPending ? pendingSubmitButtonLabel : submitButtonLabel}
          </Button>
        </>
      }
    />
  )

  const expandedRecipeContent = videoEmbedUrl ? (
    <div className="flex flex-col gap-6">
      {recipeHeaderFields}

      <div className="w-full overflow-hidden rounded">
        <iframe
          className="aspect-video w-full rounded"
          ref={youtubeIframeRef}
          src={videoEmbedUrl}
          title={name.trim() || "Recipe video"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>

      {recipeVideoControls}
      {recipeErrorNotice}
      {recipeSections}
    </div>
  ) : null

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-6 pb-24"
    >
      <input type="hidden" name="videoUrl" value={videoUrl} />
      <input type="hidden" name="ingredientsJson" value={ingredientsJson} />
      <input type="hidden" name="instructionsJson" value={instructionsJson} />

      {videoEmbedUrl ? (
        <div className="w-full">
          <div className="mx-auto flex w-full flex-col gap-3 rounded transition-[max-width] duration-200 ease-out">
            {expandedRecipeContent}
          </div>
        </div>
      ) : (
        <>
          {recipeHeaderFields}

          {videoUrl.trim() ? (
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
                onClick={openVideoEditor}
              >
                Add video
              </Button>
            </div>
          )}

          {recipeVideoControls}
          {recipeErrorNotice}
          {recipeSections}
        </>
      )}

      <ConfirmResetDialog
        open={showConfirmReset}
        onCancel={() => setShowConfirmReset(false)}
        onConfirm={resetForm}
      />

      <VideoEditorSheet
        open={isVideoEditorOpen}
        videoDraftUrl={videoDraftUrl}
        inputRef={videoDraftInputRef}
        onChange={setVideoDraftUrl}
        onSave={submitVideoDraft}
        onCancel={() => setIsVideoEditorOpen(false)}
      />

      <InstructionEditorSheet
        open={isAddInstructionOpen}
        editingInstructionIdx={editingInstructionIdx}
        instructionShortInputRef={instructionShortInputRef}
        instructionDraftShort={instructionDraftShort}
        instructionDraftLong={instructionDraftLong}
        instructionDraftHeat={instructionDraftHeat}
        instructionDraftTimeMinutes={instructionDraftTimeMinutes}
        instructionDraftIngredientIdToAdd={instructionDraftIngredientIdToAdd}
        instructionDraftStepIngredients={instructionDraftStepIngredients}
        builderIngredients={builderIngredients}
        onShortChange={setInstructionDraftShort}
        onLongChange={setInstructionDraftLong}
        onHeatChange={setInstructionDraftHeat}
        onTimeMinutesChange={setInstructionDraftTimeMinutes}
        onIngredientToAddChange={setInstructionDraftIngredientIdToAdd}
        onAddStepIngredient={addInstructionDraftStepIngredient}
        onRemoveStepIngredient={removeInstructionDraftStepIngredient}
        onUpdateStepIngredient={updateInstructionDraftStepIngredient}
        onSubmit={submitInstructionDraft}
        onClose={closeAddInstructionPanel}
      />

      <IngredientEditorSheet
        open={isAddIngredientOpen}
        canCreateIngredients={canCreateIngredients}
        editingIngredientId={editingIngredientId}
        ingredientsError={ingredientsError}
        availableIngredients={availableIngredients}
        groupedIngredientMatches={groupedIngredientMatches}
        ingredientPickerInputRef={ingredientPickerInputRef}
        ingredientPickerQuery={ingredientPickerQuery}
        ingredientDraftSourceId={ingredientDraftSourceId}
        ingredientDraftError={ingredientDraftError}
        ingredientDraftQuantity={ingredientDraftQuantity}
        ingredientDraftUnit={ingredientDraftUnit}
        highlightedIngredientId={highlightedIngredientId}
        isIngredientPickerOpen={isIngredientPickerOpen}
        onIngredientQueryChange={onChangeIngredientPickerQuery}
        onIngredientPickerKeyDown={onIngredientPickerKeyDown}
        onIngredientPickerFocus={() => setIsIngredientPickerOpen(true)}
        onIngredientPickerBlur={() => setIsIngredientPickerOpen(false)}
        onSelectDraftIngredientSource={onSelectDraftIngredientSource}
        onHighlightIngredient={setHighlightedIngredientId}
        onSetIngredientPickerOpen={setIsIngredientPickerOpen}
        onQuantityChange={setIngredientDraftQuantity}
        onUnitChange={setIngredientDraftUnit}
        onSubmit={trySubmitIngredientDraft}
        onOpenCreateIngredient={() => {
          if (!canCreateIngredients) return
          setNewIngredientName(ingredientPickerQuery.trim())
          setNewIngredientCategory("")
          setNewIngredientUnit(ingredientDraftUnit.trim())
          setIsCreateIngredientOpen(true)
        }}
        onClose={closeAddIngredientPanel}
      />

      <CreateIngredientSheet
        open={canCreateIngredients && isCreateIngredientOpen}
        createIngredientState={createIngredientState}
        isCreatingIngredient={isCreatingIngredient}
        createIngredientNameInputRef={createIngredientNameInputRef}
        newIngredientName={newIngredientName}
        newIngredientCategory={newIngredientCategory}
        newIngredientUnit={newIngredientUnit}
        filteredCategoryOptions={filteredCategoryOptions}
        isCategorySuggestionsOpen={isCategorySuggestionsOpen}
        highlightedCategoryOption={highlightedCategoryOption}
        onNameChange={setNewIngredientName}
        onCategoryChange={onChangeCategoryQuery}
        onCategoryKeyDown={onCategorySuggestionsKeyDown}
        onCategoryFocus={() => setIsCategorySuggestionsOpen(true)}
        onCategoryBlur={() => setIsCategorySuggestionsOpen(false)}
        onUnitChange={setNewIngredientUnit}
        onHighlightCategory={setHighlightedCategoryOption}
        onSelectCategory={setNewIngredientCategory}
        onSetCategorySuggestionsOpen={setIsCategorySuggestionsOpen}
        onSubmit={submitCreateIngredientDraft}
        onClose={() => setIsCreateIngredientOpen(false)}
      />
    </form>
  )
}
