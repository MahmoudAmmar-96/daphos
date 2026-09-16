import { WeekView } from '@/features/forecast-week/WeekView'

function App() {
  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-5 p-6">
      <header>
        <h1 className="font-heading text-xl font-medium">Daphos Forecast Review</h1>
        <p className="text-sm text-muted-foreground">
          Review the staffing demand forecast for your ward and correct it where it looks wrong.
        </p>
      </header>
      <WeekView />
    </main>
  )
}

export default App
