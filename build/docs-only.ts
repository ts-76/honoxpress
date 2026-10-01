import type { SSGPlugin } from 'hono/ssg'

export const isDocsPath = (pathname: string) =>
  /^\/(?:ja\/)?docs\/[^:*]+$/.test(pathname)

export function docsOnlyPlugin(report: { accepted: string[]; skipped: string[] }): SSGPlugin {
  return {
    beforeRequestHook(req) {
      const path = new URL(req.url).pathname
      if (!isDocsPath(path)) {
        report.skipped.push(path)
        return false
      }
      report.accepted.push(path)
      return req
    },
  }
}
