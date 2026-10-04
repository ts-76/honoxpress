/** @jsxImportSource hono/jsx */
// Consumer-owned live demo frame; embedding is a browser request, never an SSG execution.
export default function DemoFrame({
  title = "Live Worker demo",
  src = "/demo/clock",
  linkLabel = "Open live demo",
}: {
  title?: string;
  src?: string;
  linkLabel?: string;
}) {
  return (
    <figure class="demo-frame">
      <figcaption>
        <span class="demo-indicator" aria-hidden="true" />
        {title}
        <a href={src}>
          {linkLabel}
          <span aria-hidden="true"> ↗</span>
        </a>
      </figcaption>
      <iframe src={src} title={title} loading="lazy" />
    </figure>
  );
}
