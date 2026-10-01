# HonoX docs PoC

信頼済みローカルMDXをHono JSXで静的生成し、Counter Islandと動的Hono `/demo/*`を同じCloudflare Worker構成で共存させる最小PoCです。2026-10-01、MacBook Air（macOS / arm64）で検証しました。

## 実装した構成

| URL | ソース | 開発 | 本番構成 |
| --- | --- | --- | --- |
| `/docs/getting-started` | `app/routes/docs/getting-started.mdx` | HonoX SSR | Workers Static AssetsのHTML |
| `/ja/docs/getting-started` | `app/routes/ja/docs/getting-started.mdx` | HonoX SSR | Workers Static AssetsのHTML |
| `/demo/clock` | `app/routes/demo/index.tsx` | Honoによるリクエスト時生成 | 同じWorkerの動的Hono |
| `/demo/status` | 同上 | リクエスト時JSON生成 | 同じWorkerの動的Hono |
| `/` | `app/routes/index.tsx` | HonoX SSR | WorkerのHonoX SSR |

ルートはHonoX標準の`app/routes`と`_renderer.tsx`です。frontmatterは`title`と`description`のみで、`id`はありません。URLはファイルパスが決めます。日英MDX内にCounter IslandとDemoFrameを置いています。React、検索、下書き、独自`docs.mount`、hono-decksは導入していません。

```text
app/
  server.ts               # 開発・SSG: 標準createApp()のeager file router
  worker.ts               # 本番Worker: 公式server/baseへ動的ルートだけ渡す
  client.ts               # 公式createClient()、hydration完了マーカー
  islands/counter.tsx      # Hono useState
  components/demo-frame.tsx
  routes/
    _renderer.tsx          # 言語、frontmatter、manifestからscriptを出力
    _404.tsx
    index.tsx
    demo/index.tsx         # Honoインスタンス
    docs/getting-started.mdx
    ja/docs/getting-started.mdx
build/
  docs-only.ts             # SSGのリクエスト実行前フィルター
  build.mjs                # clean → client → SSG → Worker
  snapshot-evidence.mjs
dist/                      # git管理外
  public/                  # CSS、ハッシュ付きJS、日英HTMLのみ公開
  worker/index.js          # assetsと別の出力先
  evidence/                # manifest、module graph、SSG・browser結果
```

Wranglerは`dist/worker/index.js`と`dist/public`を1つのWorker設定で扱います。assetsは先に解決し、`/demo/*`は`run_worker_first`でWorkerへ送ります。`html_handling: drop-trailing-slash`で拡張子なしURLを提供し、`not_found_handling: none`で未一致はWorkerの404へ渡します。HonoXのContext storageに合わせて`nodejs_compat`を指定しています。

## 再現コマンド

Node **22.23.3**で検証しました（最低22.12、現行の22系推奨）。依存の実バージョンは`package-lock.json`と[`evidence/verification.json`](evidence/verification.json)に固定されています。

```sh
npm ci
npx playwright install chromium
npm run verify
npm run preview:dry-run
node build/snapshot-evidence.mjs
```

Macの既存Node 22.0.0はVite 8の要件を満たさなかったため、このrepoには開発依存としてNode 22も入れています。既存Nodeで初回導入する場合は、導入後にrepo内のNodeを使ってoptional dependenciesを再評価してください。マシン全体のNode設定は変更しません。

```sh
npm ci
PATH="$PWD/node_modules/node/bin:$PATH" npm install --include=optional
PATH="$PWD/node_modules/node/bin:$PATH" npx playwright install chromium
npm run verify
```

手動確認は、別ターミナルで次を実行します。

```sh
npm run dev       # http://127.0.0.1:5173
npm run build
npm run preview   # http://127.0.0.1:8787、wrangler dev --local
```

`verify`は型チェック、全ビルド、ビルド検査、両環境のPlaywright検査を実行します。Playwrightが5173/8787を起動・停止するため、その検査前には手動サーバーを止めてください。`preview:dry-run`は実デプロイしません。

個別の`build:client` → `build:ssg` → `build:worker`もありますが、通常は`npm run build`を使ってください。全ビルドは最初に`dist`だけを削除し、各後続段階は先行するassets/HTMLを保持します。Workerは専用ディレクトリだけをcleanします。manifestはclient生成後にSSG・Workerへ渡し、最後に公開ディレクトリの`.vite`を削除します。検証用manifestは`dist/evidence`へ残します。

## 検証結果

最終確認はすべて成功しました。

| 検査 | 結果 |
| --- | --- |
| `npm run typecheck` | 成功 |
| client / SSG / Workerの3段階ビルド | 成功 |
| ビルド自動検査 | 4 / 4成功 |
| Playwright: Vite開発 | 2 / 2成功 |
| Playwright: Wrangler本番ローカル | 2 / 2成功 |
| Wrangler設定から型生成 | 成功 |
| Wrangler deploy dry-run | 成功、実デプロイなし |
| 公式Hono CLIによる生成Worker `/demo/status`へのrequest | 成功 |
| GitHub Actions CI | 未設置 |
| Cloudflare実デプロイ | 未実行（依頼範囲外） |

ビルド検査では、日英HTML、CounterのIsland識別子、client manifestの実ファイル、iframeパス、Worker/clientの読み込まれたmodule graph、bundle本文を検査しています。旧HTML・旧client JS・旧Worker出力を意図的に作り、後続の全ビルドで削除され、新しい日英HTMLとassetsが残ることも確認しています。

SSGの実行前hookが`/`、`/demo/clock`、`/demo/status`を除外した記録は[`evidence/ssg.json`](evidence/ssg.json)にあります。別のHonoアプリに実行回数を数える`/demo/clock`と`/demo/:name`を置く検査でも、SSG時の呼び出し回数は**0**でした。

ブラウザーでは、日英URL・タイトル・言語、本文リンク、Counterの増加、英→日→英の再遷移後の再hydration、iframe読み込み、直接demoリンク、CSS/JSの200、各階層の404を確認しました。demoのリクエストごとのUUIDと`no-store`も確認しています。本番では末尾slashの307、manifest・MDXソース・Workerソースの非公開も確認しました。開発の未存在static JSはVite自身の空bodyの404、本番はWorkerの404になります。

再生成可能な証拠は`dist/evidence`へ出力し、今回の検証記録は[`evidence/verification.json`](evidence/verification.json)、[`Worker module graph`](evidence/worker-modules.json)、[`client manifest`](evidence/client-manifest.json)に保存しました。本番ローカルの操作後スクリーンショット: [English](evidence/screenshots/english.png) / [日本語](evidence/screenshots/japanese.png)。

## 設計上の発見と制約

1. **標準createAppのeager importはWorkerへ本文を入れる。** `honox/server`のデフォルトglobは全MDXを読み込みます。通常のrouterでWorkerを作る比較テストでは日英本文sentinelと2つのMDX moduleが残ります（[`比較結果`](evidence/eager-control.json)）。今回のWorkerは公式`honox/server/base`とliteral globで入口を制限し、本文・MDX module・`@mdx-js`/remark依存が読み込みgraphにも生成bundleにもないことを確認しました。単に実行時の404へ変更したり、createAppの後でルートを除外する方法ではありません。
2. **SSGの出力除外と実行除外は別。** Hono SSGはルート情報の取得でもリクエストを実行します。`disableSSG`やレスポンス後のフィルターだけでは動的処理を避けられません。docs以外を`beforeRequestHook`で除外し、demoにも`isSSGContext`による実行ガードを設けました。任意のdocsパラメータルートはこのPoCでは対象外です。
3. **MDXのIsland検出には注意が必要。** HonoX 0.1.61ではこのMDXを`honox-island`へ変換できましたが、raw MDX依存の自動追跡が`__importing_islands`を付けず、`Script/HasIslands`はSSGでscriptを出しませんでした。標準Renderer内でdocsのclient scriptをmanifestから直接出力することで解決しています。未生成manifestではSSGを失敗させます。全ページがCounterを持つ今回の最小構成に適した対応です。
4. **hydration属性は完了通知ではない。** HonoXは`data-hono-hydrated`を動的import前に設定します。ブラウザー検査は`createClient()`のPromise完了を待ちます。通常のdocument navigationを使い、再遷移時のCounterは0から始まります。SPA遷移・永続stateは実装していません。
5. **MDXはコードです。** ビルド時に実行する信頼済みローカルファイルのみを対象にします。外部投稿MDXの実行、runtime compile、検索・draft機能は対象外です。動的Workerのrouteを増やす場合は`app/worker.ts`の入力globとテストを更新します。
6. **現行依存との互換性。** HonoX 0.1.61はclient設定に非推奨`esbuild`オプションを使い、Vite 8.3.1が警告します。今回のビルドとブラウザー操作は成功しました。Cloudflareの実サービス、他ブラウザー、CI、性能負荷試験は検証していません。

## 確認した公式資料

- [HonoX公式: standard routes / Renderer / Islands / MDX / SSG](https://github.com/honojs/honox)
- [HonoX公式: createAppのeager glob実装](https://github.com/honojs/honox/blob/main/src/server/with-defaults.ts)
- [Hono SSG helper: beforeRequestHook](https://hono.dev/docs/helpers/ssg)
- [Cloudflare Static Assets: Worker script routing](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/)
- [Cloudflare Static Assets: HTML handling](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/)
- [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/) / [CLI commands](https://developers.cloudflare.com/workers/wrangler/commands/)

挙動とmodule graphの最終的な根拠は、lockfileで固定したローカル依存のソースと、このrepoの自動検査です。
