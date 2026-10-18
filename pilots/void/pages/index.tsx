import { Link } from "void-plugin-hono-jsx/pages";
export default function Index() {
  return (
    <>
      <h1>honoxpress · Void</h1>
      <p>
        <Link href="/en">English</Link> / <Link href="/ja">日本語</Link>
      </p>
    </>
  );
}
