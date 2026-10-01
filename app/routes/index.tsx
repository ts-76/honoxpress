import { createRoute } from 'honox/factory'
export default createRoute((c) => c.render(<>
  <h1>HonoX Docs PoC</h1>
  <p>Static documentation with an interactive island and a live Worker demo.</p>
  <ul><li><a href="/docs/getting-started">Get started</a></li>
    <li><a href="/ja/docs/getting-started">はじめに</a></li>
    <li><a href="/demo/clock">Dynamic demo</a></li></ul>
</>))
