import { createRoute } from "honox/factory";
import docsSite from "../docs.config";
export default createRoute((c) =>
  c.render(
    <>
      <h1>{docsSite.name}</h1>
      <p>Static documentation with an interactive island and a live Worker demo.</p>
      <ul>
        <li>
          <a href={docsSite.docsHref ?? "/docs/getting-started"}>Get started</a>
        </li>
        <li>
          <a href="/demo/clock">Dynamic demo</a>
        </li>
      </ul>
    </>,
  ),
);
