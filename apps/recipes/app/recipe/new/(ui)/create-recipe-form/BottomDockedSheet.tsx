import type { ReactNode } from "react"

interface BottomDockedSheetProps {
  onClose: () => void
  overlayZIndexClassName?: string
  sheetZIndexClassName?: string
  children: ReactNode
}

export default function BottomDockedSheet({
  onClose,
  overlayZIndexClassName = "z-40",
  sheetZIndexClassName = "z-50",
  children
}: BottomDockedSheetProps) {
  return (
    <>
      <div
        className={`fixed inset-0 bg-background/80 ${overlayZIndexClassName}`}
        onClick={onClose}
      />
      <div className={`fixed inset-x-0 bottom-24 ${sheetZIndexClassName}`}>
        <div className="mx-auto w-full max-w-3xl px-4">
          <div className="rounded-lg border border-border bg-background p-4">
            {children}
          </div>
        </div>
      </div>
    </>
  )
}
