import { Button } from "@repo/ui/shadcn/button"

interface ConfirmResetDialogProps {
  open: boolean
  onCancel: () => void
  onConfirm: () => void
}

export default function ConfirmResetDialog({
  open,
  onCancel,
  onConfirm
}: ConfirmResetDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-background p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-lg font-semibold">Are you sure?</p>
            <p className="text-sm text-muted-foreground">
              This clears the entire draft recipe and cannot be undone.
            </p>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/85"
              onClick={onConfirm}
            >
              Start over
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
