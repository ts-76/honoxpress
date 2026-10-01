import { test, expect } from '@playwright/test'

test('English / Japanese: MDX, links, counter hydration and repeat navigation', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('response', (r) => {
    if (/\.(js|css)(?:\?|$)/.test(r.url()) && r.status() >= 400) errors.push(`${r.status()} ${r.url()}`)
  })
  await page.goto('/')
  await page.getByRole('link', { name: 'Get started', exact: true }).click()
  await expect(page).toHaveURL(/\/docs\/getting-started$/)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page).toHaveTitle('Getting started · HonoX Docs PoC')
  await expect(page.getByRole('heading', { name: 'Getting started', exact: true })).toBeVisible()
  await expect(page.locator('[data-hono-hydrated="true"]')).toHaveCount(1)
  await expect(page.locator('html')).toHaveAttribute('data-islands-ready', 'true')
  await page.getByRole('button', { name: 'Increment', exact: true }).click({ clickCount: 3 })
  await expect(page.getByTestId('count')).toHaveText('3')
  await expect(page.frameLocator('iframe').getByTestId('demo-time')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('english.png'), fullPage: true })

  await page.getByRole('link', { name: '日本語を読む', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'ja')
  await expect(page).toHaveTitle('はじめに · HonoX Docs PoC')
  await expect(page.getByRole('heading', { name: 'はじめに', exact: true })).toBeVisible()
  await expect(page.locator('[data-hono-hydrated="true"]')).toHaveCount(1)
  await expect(page.locator('html')).toHaveAttribute('data-islands-ready', 'true')
  await expect(page.getByTestId('count')).toHaveText('0')
  await page.getByRole('button', { name: '増やす', exact: true }).click()
  await expect(page.getByTestId('count')).toHaveText('1')
  await expect(page.frameLocator('iframe').getByTestId('demo-time')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('japanese.png'), fullPage: true })

  await page.getByRole('link', { name: 'Read in English', exact: true }).click()
  await expect(page.locator('[data-hono-hydrated="true"]')).toHaveCount(1)
  await expect(page.locator('html')).toHaveAttribute('data-islands-ready', 'true')
  await expect(page.getByTestId('count')).toHaveText('0')
  await page.getByRole('button', { name: 'Increment', exact: true }).click()
  await expect(page.getByTestId('count')).toHaveText('1')
  await page.getByRole('link', { name: 'Open live demo', exact: true }).click()
  await expect(page).toHaveURL(/\/demo\/clock$/)
  await expect(page.getByRole('heading', { name: 'Dynamic Worker clock' })).toBeVisible()
  expect(errors).toEqual([])
})

test('HTTP routes, assets, real 404 and per-request demo', async ({ request }, testInfo) => {
  for (const path of ['/docs/getting-started', '/ja/docs/getting-started']) {
    const res = await request.get(path)
    expect(res.status()).toBe(200)
    const html = await res.text()
    expect(html).toContain('DOCS_BODY_')
    expect(html).toContain('component-name')
    const script = html.match(/<script[^>]+src="([^"]+)"/)
    expect(script).toBeTruthy()
    expect((await request.get(script![1])).status()).toBe(200)
    expect((await request.get('/style.css')).headers()['content-type']).toContain('text/css')
    if (testInfo.project.name === 'production-local') {
      expect(script![1]).toMatch(/^\/static\/client-[\w-]+\.js$/)
      expect(res.headers()['x-demo-request']).toBeUndefined()
      const redirect = await request.get(`${path}/`, { maxRedirects: 0 })
      expect(redirect.status()).toBe(307)
      expect(redirect.headers().location).toBe(path)
    }
  }
  for (const path of ['/missing', '/docs/missing', '/ja/docs/missing', '/demo/missing', '/static/missing.js']) {
    const res = await request.get(path)
    expect(res.status(), path).toBe(404)
    if (!path.startsWith('/static/') || testInfo.project.name === 'production-local') {
      expect(await res.text()).toContain('Page not found')
    }
  }
  const a = await request.get('/demo/clock')
  const b = await request.get('/demo/clock')
  expect(a.status()).toBe(200)
  expect(b.status()).toBe(200)
  expect(a.headers()['cache-control']).toBe('no-store')
  expect(a.headers()['x-demo-request']).toBeTruthy()
  expect(a.headers()['x-demo-request']).not.toBe(b.headers()['x-demo-request'])
  expect((await request.get('/demo/status')).headers()['content-type']).toContain('application/json')
  if (testInfo.project.name === 'production-local') {
    for (const path of ['/.vite/manifest.json', '/app/routes/docs/getting-started.mdx', '/worker/index.js']) {
      expect((await request.get(path)).status()).toBe(404)
    }
  }
})
