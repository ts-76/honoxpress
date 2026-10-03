import { createRoute } from "honox/factory";
export default createRoute((c) =>
  c.render(
    <>
      <h1>honoxpress</h1>
      <p>hono-decks real documentation pilot using published honoxpress@0.1.1.</p>
      <ul>
        <li>
          <a href="/docs/getting-started">Get started</a>
        </li>
        <li>
          <a href="/ja/docs/getting-started">導入</a>
        </li>
        <li>
          <a href="/demo/clock">Dynamic demo</a>
        </li>
      </ul>
    </>,
  ),
);
