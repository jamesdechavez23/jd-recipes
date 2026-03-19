import { Button } from "@repo/ui/shadcn/button"

interface VideoEditorSheetProps {
  open: boolean
  videoDraftUrl: string
  inputRef: React.RefObject<HTMLInputElement | null>
  onChange: (value: string) => void
  onSave: () => void
  onCancel: () => void
}

export default function VideoEditorSheet({
  open,
  videoDraftUrl,
  inputRef,
  onChange,
  onSave,
  onCancel
}: VideoEditorSheetProps) {
  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-40 bg-background/80" onClick={onCancel} />
      <div className="fixed inset-x-0 bottom-24 z-50">
        <div className="mx-auto w-full max-w-3xl px-4">
          <div className="rounded-lg border border-border bg-background p-4">
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium">Video URL</p>
              <input
                ref={inputRef}
                value={videoDraftUrl}
                onChange={(e) => onChange(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                placeholder="https://www.youtube.com/watch?v=…"
                autoComplete="off"
              />
              <div className="flex items-center gap-3">
                <Button type="button" onClick={onSave}>
                  Save
                </Button>
                <Button type="button" variant="secondary" onClick={onCancel}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
