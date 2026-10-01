import { useState } from 'hono/jsx'

export default function Counter({ label = 'Increment' }: { label?: string }) {
  const [count, setCount] = useState(0)
  return <section class="counter" aria-label="Counter island">
    <output data-testid="count" aria-live="polite">{count}</output>
    <button type="button" onClick={() => setCount((n) => n + 1)}>{label}</button>
  </section>
}
