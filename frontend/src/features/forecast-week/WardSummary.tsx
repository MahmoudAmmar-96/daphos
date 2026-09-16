/** The week's three computed numbers for the selected ward. */

import { useWardSummary } from './api'

interface WardSummaryProps {
  wardId: number | null
  week: string
}

export function WardSummary({ wardId, week }: WardSummaryProps) {
  const summary = useWardSummary(wardId, week)

  if (summary.isError) {
    return <p className="text-sm text-destructive">{summary.error.message}</p>
  }

  const data = summary.data

  return (
    <dl className="grid grid-cols-3 gap-3 rounded-lg border bg-card p-4">
      <Metric
        label="Total understaffing"
        value={data ? `${data.total_understaffing}` : '-'}
        caption="staff short across the week"
      />
      <Metric
        label="Corrections"
        value={data ? `${data.correction_count}` : '-'}
        caption="days edited by a manager"
      />
      <Metric
        label="Avg deviation"
        value={data ? data.avg_deviation.toFixed(2) : '-'}
        caption="how far corrections moved the forecast"
      />
    </dl>
  )
}

function Metric({
  label,
  value,
  caption,
}: {
  label: string
  value: string
  caption: string
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>
        <span className="block text-2xl font-medium tabular-nums">{value}</span>
        <span className="block text-xs text-muted-foreground">{caption}</span>
      </dd>
    </div>
  )
}
