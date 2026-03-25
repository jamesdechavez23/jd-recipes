"use client"

type BrandHomeButtonProps = {
  className: string
  labelClassName: string
}

export default function BrandHomeButton({
  className,
  labelClassName
}: BrandHomeButtonProps) {
  function handleClick() {
    window.location.assign("/")
  }

  return (
    <button
      type="button"
      aria-label="Speed Knight Challenge"
      className={className}
      onClick={handleClick}
    >
      <span className={labelClassName}>Speed Knight Challenge</span>
    </button>
  )
}
