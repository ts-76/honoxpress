import { createRoute } from "honox/factory";
import docsSite from "../docs.config";

export default createRoute((c) =>
  c.render(
    <>
      <h1>{docsSite.name}</h1>
      <p>A small, editable foundation for your project documentation.</p>
      <ul>
        <li>
          <a href="/docs/getting-started">Get started</a>
        </li>
        <li>
          <a href="/demo/clock">Open the live demo</a>
        </li>
      </ul>
    </>,
  ),
);
