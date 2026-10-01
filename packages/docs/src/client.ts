export interface ClientManifest {
  readonly [entry: string]: { readonly file: string };
}
/** The client build must finish before SSG reads its manifest. */
export function resolveClientScript(manifest: ClientManifest | undefined, entry: string): string {
  const file = manifest?.[entry]?.file;
  if (!file || file.startsWith("/") || file.includes("..") || !/^[\w/-]+\.js$/.test(file))
    throw new Error(`Build client before SSG; missing or unsafe manifest entry: ${entry}`);
  return `/${file}`;
}
