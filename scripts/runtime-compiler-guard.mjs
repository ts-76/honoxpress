/** Metadata and hooks are runtime APIs; parsers and build plugins are not. */
export function isBuildOnlyModule(id) {
  return /(?:markdown-exit|markdown-it-container|honoxpress\/dist\/build\.js|void-plugin-hono-jsx\/(?:src|dist)\/plugins\/hono-markdown\.[jt]s|@ts-76\/hono-markdown\/(?:src|dist)\/compiler\/|@babel\/parser\/|\/shiki\/)/.test(
    id,
  );
}
