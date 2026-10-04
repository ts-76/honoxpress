/** @jsxImportSource hono/jsx */
import type { Child } from "hono/jsx";
import { Callout } from "./docs-content";

/** A consumer-owned registry extension, rendered without per-page imports. */
export function ProjectNote({ children }: { children?: Child }) {
  return (
    <Callout type="tip" title="Project note">
      {children}
    </Callout>
  );
}
