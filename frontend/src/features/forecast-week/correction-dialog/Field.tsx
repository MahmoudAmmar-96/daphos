/**
 * One labelled form control with its error message. The control is handed the ids that 
 * point a screen reader at its own error, so neither caller has to repeat that plumbing.
 */

import type { ReactNode } from 'react'

interface FieldProps {
  id: string
  label: ReactNode
  error?: string
  children: (control: {
    id: string
    'aria-invalid': boolean
    'aria-describedby': string | undefined
  }) => ReactNode
}

export function Field({ id, label, error, children }: FieldProps) {
  const errorId = `${id}-error`

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children({
        id,
        'aria-invalid': error !== undefined,
        'aria-describedby': error && errorId,
      })}
      {error && (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
