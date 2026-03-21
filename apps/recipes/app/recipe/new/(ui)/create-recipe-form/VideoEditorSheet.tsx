import { Input } from "@repo/ui/shadcn/input"
import { Label } from "@repo/ui/shadcn/label"
import { Button } from "@repo/ui/shadcn/button"
import BottomDockedSheet from "./BottomDockedSheet"

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
    <BottomDockedSheet onClose={onCancel}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="recipe-video-url">Video URL</Label>
          <Input
            id="recipe-video-url"
            ref={inputRef}
            value={videoDraftUrl}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=…"
            autoComplete="off"
          />
        </div>
        <div className="flex items-center gap-3">
          <Button type="button" onClick={onSave}>
            Save
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </BottomDockedSheet>
  )
}
