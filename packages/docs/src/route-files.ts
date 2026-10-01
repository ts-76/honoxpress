/** Match HonoX standard MDX route exclusion; directory underscores remain valid. */
export function isVisibleMdxRoute(route: string): boolean {
  const parts = route.split("/");
  const filename = parts.pop();
  return Boolean(
    filename?.endsWith(".mdx") &&
    !/^[_$.-]/.test(filename) &&
    !parts.some((part) => part.startsWith("-") || part.startsWith(".")),
  );
}
