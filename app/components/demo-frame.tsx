export default function DemoFrame({ title = 'Live Worker demo' }: { title?: string }) {
  return <figure>
    <iframe src="/demo/clock" title={title} loading="lazy" />
    <figcaption><a href="/demo/clock">Open live demo</a></figcaption>
  </figure>
}
