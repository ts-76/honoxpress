import docsConfig from "../app/docs.config";
import { catalog } from "../app/docs-catalog";
export default function Home() {
  return (
    <main>
      <h1>{docsConfig.name}</h1>
      <ul>
        {catalog.navigation(docsConfig.defaultLocale).map((page) => (
          <li key={page.href}>
            <a href={page.href}>{page.title}</a>
          </li>
        ))}
      </ul>
    </main>
  );
}
