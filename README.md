# honoxpress

信頼済みローカルMDXをHono JSXで静的生成し、Counter Islandと動的Hono `/demo/*`を同じCloudflare Worker構成で共存させる最小PoCです。2026-10-01、MacBook Air（macOS / arm64）で検証しました。

## 実装した構成

| URL                        | ソース                                   | 開発                       | 本番構成                    |
| -------------------------- | ---------------------------------------- | -------------------------- | --------------------------- |
| `/docs/getting-started`    | `app/routes/docs/getting-started.mdx`    | HonoX SSR                  | Workers Static AssetsのHTML |
| `/ja/docs/getting-started` | `app/routes/ja/docs/getting-started.mdx` | HonoX SSR                  | Workers Static AssetsのHTML |
| `/demo/clock`              | `app/routes/demo/index.tsx`              | Honoによるリクエスト時生成 | 同じWorkerの動的Hono        |
| `/demo/status`             | 同上                                     | リクエスト時JSON生成       | 同じWorkerの動的Hono        |
| `/`                        | `app/routes/index.tsx`                   | HonoX SSR                  | WorkerのHonoX SSR           |

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

cf設定は`dist/worker/index.js`と`dist/public`を1つのWorker設定で扱います。assetsは先に解決し、`/demo/*`は`run_worker_first`でWorkerへ送ります。`html_handling: drop-trailing-slash`で拡張子なしURLを提供し、`not_found_handling: none`で未一致はWorkerの404へ渡します。HonoXのContext storageに合わせて`nodejs_compat`を指定しています。

## 再現コマンド

Devbox管理のNode **24.12.0**（`.node-version`）、pnpm **11.22.0**（`packageManager`）、Vite Plus **1.0.0**で検証しました。cf **1.0.0-beta.6**はMacの既存グローバルCLIを使用します。projectにcf本体は入れず、設定APIと型を提供する`@cloudflare/config` **0.20.0**へ直接依存します。実バージョンと再現可能な依存解決は`pnpm-lock.yaml`と[`examples/poc/evidence/verification.json`](examples/poc/evidence/verification.json)に記録しています。npm lockfileとNodeの開発依存は除去しました。Node/pnpmは既存Devbox global、シェル設定は既存chezmoi管理を保持し、追加PATHや別のNode管理ツールは導入していません。

通常のログインシェルでは既存chezmoiの`.zshrc`がDevbox globalを有効にします。`command -v node`と`command -v pnpm`がDevbox profileを指し、`node --version`が24.12.0、`pnpm --version`が11.22.0、`command -v cf`が既存グローバルCLIを指すことを確認して実行します。pnpmの最新版取得もDevbox管理に従い、この環境でDevboxが提供する11.22.0を保持します。Vite Plus単体の要件よりcfの要件が高いため、repoのengineは`^22.20.0 || ^24.12.0 || >=26.0.0`です。

```sh
pnpm install --frozen-lockfile
pnpm --filter honoxpress-example exec playwright install chromium
pnpm verify
pnpm evidence
```

手動確認は別ターミナルで実行します。

```sh
pnpm dev        # Vite Plus / HonoX開発: http://127.0.0.1:5173
pnpm build      # clean → client → SSG → Worker
pnpm preview    # cf dev / 本番ローカル: http://127.0.0.1:8787
pnpm build:cf   # cf build: .cloudflare/output/v0へBuild Output生成
pnpm preview:dry-run  # cf deploy --dry-run --prebuilt、アップロードなし
pnpm types:cf   # cf workers types: .cloudflare/typesへ型生成
```

`verify`はVite Plusのformat・Oxlint/tsgo型チェック、警告禁止lint、従来の`tsc`、3段階ビルド、cf型生成、Vitest5のビルド検査、両環境のPlaywright、cf prebuilt dry-runを実行します。ビルド検査の最後に`cf build`も実行します。Playwrightが5173/8787を起動・停止するため、検査前に手動サーバーを止めてください。実Cloudflareデプロイは行いません。

Vite Plus組み込みの`vp build`は1段階のViteビルドです。子ビルドには`NODE_ENV=production`を明示し、Vitestが付ける`NODE_ENV=test`の影響を防いでいます。通常ビルドとテスト内再ビルドでmanifestとWorker出力が同一であることも検査します。このPoCの全パイプラインには`pnpm build`（または`pnpm exec vp run build`）を使います。`build:client` → `build:ssg` → `build:worker`もそれぞれ`vp build --mode ...`です。全ビルドの先頭で`dist`だけを削除し、後続段階は先行assets/HTMLを保持します。manifestはclient生成後にSSG・Workerへ渡し、最後に公開ディレクトリの`.vite`を削除します。検証用manifestは`dist/evidence`に残します。検査は共有出力を書き換えるためVitestを逐次実行し、PlaywrightをVitestの対象から除外しています。検証にtask cacheを設定していません。

pnpmのcatalogと`vite@*` overrideは公式migratorの設定を保持しています。Hono系プラグインがimportする`vite`をVite Plus coreへ揃えます。直接`vite`依存は削除しても全ビルド・検査が通ることを確認しました。transitive Viteにはoverrideを適用します。`defineConfig`とテスト内の`createServer`/`build`は`vite-plus`、unit APIは`vite-plus/test`です。Vite Plus経由のAPI解決も確認しました。OxfmtがTSX・MDX・Markdown・CSSを整形し、`lazyPlugins`は静的チェック時のアプリplugin起動を防ぎます。

## cf設定と制約

`cloudflare.config.ts`がWorker入口・互換性・asset routingを持ち、`wrangler.config.ts`は内部ビルドツールのassets directory・dev IP/portを持ちます。設定importは`@cloudflare/config/public`です。グローバルcfの`cf/config`もこのpublic exportを再exportするだけですが、projectからグローバルpackageへのimportは解決できないため、設定ライブラリだけを導入しました。既存`wrangler.jsonc`は移行前の参考設定として残していますが、cfは読みません。直接Wranglerを実行するnpm scriptsはありません。

このHonoXの分離ビルド構成では、cfは内部でWrangler **4.145.0**へ委譲するため、その直接依存は保持しています。実際に除去した検査ではcfが「Cloudflare dev-server未宣言」として失敗しました。cfはprojectのpackage.jsonにWranglerなどのdev-serverがちょうど1つ宣言されていることを要求します。cf自体はbundlerではありません。Cloudflare Vite pluginを追加する別構成への変更は行っていません。`cf build`がpackage.jsonの全build scriptを実行することもないため、先に`pnpm build`が必要です。

`cf dev`は既定でローカル起動し、`--local`を拒否します。設定にremote resource bindingはありません。`cf deploy --dry-run --prebuilt`は既に作ったBuild Outputを検証するだけでAPI送信・デプロイを行いません。cfが最終生成したbundleにもdocs本文/MDXコンパイラーがなく、asset一覧とHTMLが`dist/public`と一致することを自動検査します。古いcf assetの削除も検査しています。

cfはbetaで、設定とBuild Output仕様が変わる可能性があります。今回`cf build`はDocker daemon未起動のメッセージを出しますが、Containersなしの本PoCでは終了コード0でBuild Output生成・dry-run・全テストが成功しました。Viteの依存`@rollup/pluginutils`の欠落source map警告もunit時に出ますが、テストは成功します。

## 検証結果

最終確認はDevbox Node 24.12.0・pnpm 11.22.0と既存グローバルcfで成功しました。通常の対話ログインシェルとrepo内の双方でNode/pnpmがDevbox profileを解決し、chezmoiのsource/targetは一致しています。shellenvが制限付き実行で止まるとNodebrewの旧Nodeが選ばれるため、確認は通常シェルで行いました。chezmoi管理元・配置先、Devbox package設定の変更は不要でした。

| 検査                                   | 結果                                     |
| -------------------------------------- | ---------------------------------------- |
| 通常シェル / repo内: Devbox Node・pnpm | 成功                                     |
| `pnpm install --frozen-lockfile`       | 成功、ポリシー適合                       |
| `pnpm typecheck`                       | 成功                                     |
| client / SSG / Workerの3段階ビルド     | 成功                                     |
| package API/build/UI unit              | 15 / 15成功                              |
| ビルド自動検査                         | 5 / 5成功                                |
| Playwright: Vite開発                   | 3 / 3成功                                |
| Playwright: cf dev本番ローカル         | 3 / 3成功                                |
| cf workers types                       | 成功                                     |
| cf build / prebuilt dry-run            | 成功、実デプロイなし                     |
| Vite Plus format / Oxlint・tsgo / tsc  | 成功                                     |
| GitHub Actions CI                      | 3 Node matrixを設置。結果は該当runで確認 |
| Cloudflare実デプロイ                   | 未実行（依頼範囲外）                     |

ビルド検査では、日英HTML、CounterのIsland識別子、client manifestの実ファイル、iframeパス、Worker/clientの読み込まれたmodule graph、bundle本文を検査しています。旧HTML・旧client JS・旧Worker出力を意図的に作り、後続の全ビルドで削除され、新しい日英HTMLとassetsが残ることも確認しています。

SSGの実行前hookが`/`、`/demo/clock`、`/demo/status`を除外した記録は[`evidence/ssg.json`](examples/poc/evidence/ssg.json)にあります。別のHonoアプリに実行回数を数える`/demo/clock`と`/demo/:name`を置く検査でも、SSG時の呼び出し回数は**0**でした。

ブラウザーでは、日英URL・タイトル・言語、本文リンク、Counterの増加、英→日→英の再遷移後の再hydration、iframe読み込み、直接demoリンク、CSS/JSの200、各階層の404を確認しました。demoのリクエストごとのUUIDと`no-store`も確認しています。本番では末尾slashの307、manifest・MDXソース・Workerソースの非公開も確認しました。開発の未存在static JSはVite自身の空bodyの404、本番はWorkerの404になります。

再生成可能な証拠は`dist/evidence`へ出力し、今回の検証記録は[`examples/poc/evidence/verification.json`](examples/poc/evidence/verification.json)、[`Worker module graph`](examples/poc/evidence/worker-modules.json)、[`client manifest`](examples/poc/evidence/client-manifest.json)に保存しました。本番ローカルの操作後スクリーンショット: [English](examples/poc/evidence/screenshots/english.png) / [日本語](examples/poc/evidence/screenshots/japanese.png)。

## 設計上の発見と制約

1. **標準createAppのeager importはWorkerへ本文を入れる。** `honox/server`のデフォルトglobは全MDXを読み込みます。通常のrouterでWorkerを作る比較テストでは日英本文sentinelと2つのMDX moduleが残ります（[`比較結果`](examples/poc/evidence/eager-control.json)）。今回のWorkerは公式`honox/server/base`とliteral globで入口を制限し、本文・MDX module・`@mdx-js`/remark依存が読み込みgraphにも生成bundleにもないことを確認しました。単に実行時の404へ変更したり、createAppの後でルートを除外する方法ではありません。
2. **SSGの出力除外と実行除外は別。** Hono SSGはルート情報の取得でもリクエストを実行します。`disableSSG`やレスポンス後のフィルターだけでは動的処理を避けられません。docs以外を`beforeRequestHook`で除外し、demoにも`isSSGContext`による実行ガードを設けました。任意のdocsパラメータルートはこのPoCでは対象外です。
3. **MDXのIsland検出には注意が必要。** HonoX 0.1.61ではこのMDXを`honox-island`へ変換できましたが、raw MDX依存の自動追跡が`__importing_islands`を付けず、`Script/HasIslands`はSSGでscriptを出しませんでした。標準Renderer内でdocsのclient scriptをmanifestから直接出力することで解決しています。未生成manifestではSSGを失敗させます。全ページがCounterを持つ今回の最小構成に適した対応です。
4. **hydration属性は完了通知ではない。** HonoXは`data-hono-hydrated`を動的import前に設定します。ブラウザー検査は`createClient()`のPromise完了を待ちます。通常のdocument navigationを使い、再遷移時のCounterは0から始まります。SPA遷移・永続stateは実装していません。
5. **MDXはコードです。** ビルド時に実行する信頼済みローカルファイルのみを対象にします。外部投稿MDXの実行、runtime compile、検索・draft機能は対象外です。動的Workerのrouteを増やす場合は`app/worker.ts`の入力globとテストを更新します。
6. **現行依存との互換性。** HonoX 0.1.61はclient設定に非推奨`esbuild`オプションを使い、Vite Plus同梱Vite 8.3.1が警告します。今回のビルドとブラウザー操作は成功しました。Cloudflareの実サービス、他ブラウザー、性能負荷試験、実Cloudflareサービスは検証していません。CIの実行結果は各runのSHA/conclusionで確認します。

## 確認した公式資料

- [HonoX公式: standard routes / Renderer / Islands / MDX / SSG](https://github.com/honojs/honox)
- [HonoX公式: createAppのeager glob実装](https://github.com/honojs/honox/blob/main/src/server/with-defaults.ts)
- [Hono SSG helper: beforeRequestHook](https://hono.dev/docs/helpers/ssg)
- [Cloudflare Static Assets: Worker script routing](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/)
- [Cloudflare Static Assets: HTML handling](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/)
- [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/) / [CLI commands](https://developers.cloudflare.com/workers/wrangler/commands/)

挙動とmodule graphの最終的な根拠は、lockfileで固定したローカル依存のソースと、このrepoの自動検査です。

## ツールチェイン移行で確認した公式資料

- [Vite Plus migration](https://viteplus.dev/guide/migrate) / [migration rules](https://viteplus.dev/guide/migrate-rules)
- [Vite Plus check](https://viteplus.dev/guide/check) / [Vitest5](https://viteplus.dev/guide/vitest-v5)
- [pnpm import](https://pnpm.io/cli/import)
- [Devbox globalとshellenv](https://www.jetify.com/docs/devbox/cli-reference/devbox-global) / [chezmoi apply](https://www.chezmoi.io/reference/commands/apply/)
- [Cloudflare cf overview](https://developers.cloudflare.com/cf/) / [migrate](https://developers.cloudflare.com/cf/wrangler/migrate/)
- [cf develop/build/dry-runと内部ツールへの委譲](https://developers.cloudflare.com/cf/projects/)

Macのghq checkoutは`~/ghq/github.com/ts-76/honox-docs-poc`です。ChatGPT Projectsの作成・会話移動・ローカルフォルダの紐付けは、このrepoの実装やcf設定とは別の作業で、未実行です。

## OSS化の成果順

package候補名はユーザー決定の`honoxpress`です。ライセンス・repo公開化・npm公開は未決定で、private workspaceとして評価し、利用者はHonoX標準routes/_rendererを所有します。runtimeの純粋metadata APIにcompiler/Node/build処理を混ぜません。

1. [#1 package境界とmetadata API](https://github.com/ts-76/honox-docs-poc/issues/1)
2. [#2 薄いMDX/SSG build連携](https://github.com/ts-76/honox-docs-poc/issues/2)
3. [#3 nav/TOC/言語リンク・コピーUI](https://github.com/ts-76/honox-docs-poc/issues/3)
4. [#4 tarballと外部consumer](https://github.com/ts-76/honox-docs-poc/issues/4)
5. [#5 CIと公開判断ガイド](https://github.com/ts-76/honox-docs-poc/issues/5)
6. [#6 判断後のhono-decks実ページpilot](https://github.com/ts-76/honox-docs-poc/issues/6)（ユーザー判断待ち）

各成果は作業branchのDraft PRでレビューします。mainへのmerge、npm publish/auth/token作成、公開化、実deployは実行しません。パッケージの利用者APIは[package README](packages/docs/README.md)を参照してください。

## Workspace境界

再利用packageは`packages/docs`、標準HonoXアプリは`examples/poc`です。cf beta6はworkspace rootでアプリ検出を拒否するため、rootのdev/build/preview/test/evidence scriptsはexampleへ委譲します。app/routesと_rendererの構造はexample内で保持し、URLは変えません。上のapp/build/dist相対パスはexampleのcwdを基準にしています。runtime/build/UIの15件のunit検査はrootで別途実行します。

Issue #2 adds a separate build-only package entry. MDX frontmatter and generated TOC come from the actual route files in dev/SSG, eliminating the temporary duplicate catalog. Worker mode provides an empty metadata catalog and never discovers MDX. The explicit renderer uses the package's manifest resolver; the consumer still owns client→SSG→Worker ordering, cleaning and literal Worker route selection. Core/build helper unit coverage is 10 cases in addition to the 5 application build regressions.

## 標準UIの参考・謝辞

[Cloudflare Nimbus](https://nimbus-docs.com/philosophy/)（[registry](https://nimbus-docs.com/registry/)、[repo](https://github.com/cloudflare/nimbus)）と[Fumapress](https://press.fumadocs.dev/docs)（[plugins](https://press.fumadocs.dev/docs/plugins)、[config source](https://github.com/fuma-nama/fumapress/blob/main/packages/core/src/config.tsx)、[repo](https://github.com/fuma-nama/fumapress)）のdesktop/mobile実UIを観察し、本文幅・余白・文字組み・sidebar/TOC・選択表示・code操作・mobile配置を参考にしました。両プロジェクトに感謝します。Fumapressの指定サイトは元設計書どおりで、別製品への読み替えではありません。

両repoのMITライセンスを確認しました（[Nimbus](https://github.com/cloudflare/nimbus/blob/main/LICENSE) / [Fumapress](https://github.com/fuma-nama/fumapress/blob/main/LICENSE)）。今回のJSX/CSS/アイコンは独自実装で、コード・ロゴ・fontなどの素材は流用していません。今後流用する場合は対象ファイルのlicenseと必要なcopyright/NOTICEを保持します。このproject自体の最終licenseは未決定です。詳しいコピー手順と謝辞は配布対象の[package README](packages/docs/README.md)にも含めています。

標準UIのPlaywright追加検査は開発・本番local各1件、合計6 browser testsです。active nav、heading/TOC anchor、実clipboard成功と拒否時の案内、native mobile開閉、skip link/keyboard focus、390pxでのoverflow、dark modeの本文contrastを検査します。全項目のa11y認証は行っていません。

## tarballと外部consumer

`pnpm pack:docs`はprivate評価packageのtarballを`artifacts/package`へ作るだけで、公開しません。`pnpm test:consumer`はpackageの古い出力削除→pack files/exports/types検査→repo外の一時consumerへtarball install→凍結install→runtime/型/配布asset検査→standard HonoXの全受入を実行します。アプリ部分は既存exampleのコピーですが、package source/workspaceリンクやrepoのnode_modulesに依存しません。UI/CSSは実際にインストールしたpackageからコピーして上書きします。

検証スクリプトは[scripts/verify-consumer.mjs](scripts/verify-consumer.mjs)、型とruntime fixtureは[fixtures/consumer](fixtures/consumer)。成功時は一時consumerを削除し、失敗時は診断用に残します。ログとtarballはGit対象外の`artifacts`、確認結果は[consumer evidence](packages/docs/evidence/consumer.json)です。全`pnpm verify`にも外部consumer受入を含めています。npm publish/auth/tokenやhono-decks実ページへの導入は行いません。

## CIとOSS公開判断

[Verify workflow](.github/workflows/verify.yml)はPRのhead commitを明示checkoutし、UbuntuのNode 22.23.3 / 24.12.0 / 24.21.0で凍結install、format・typed lint・tsc、package unit15件、3段build、build検査5件、browser検査6件、tarball外部consumerの同じ受入を実行します。cfはjob内だけglobalに用意し、実deploy・npm auth/publishはありません。公式Actionsはcommit SHA固定、repo権限はread-onlyです。各Nodeの証拠・tarball・診断は7日保持します。ローカル保存のsnapshotとCI run結果は別で、exact SHAとconclusionを確認して成功判定します。

[API導入ガイド](docs/api.md)、[互換性と未検証範囲](docs/compatibility.md)、[貢献手順](CONTRIBUTING.md)、[公開判断・release gate](docs/release-decisions.md)を用意しました。Node24.21.0が確認時の最新LTS、Macは既存Devboxの24.12.0を保持し両方をCI対象にしています。26系はCurrentかつ未検証です。名前`honoxpress`は反映済みです。license・repo公開化・npm公開権限・version/release方針の判断は[#6](https://github.com/ts-76/honox-docs-poc/issues/6)で行い、その後にhono-decksの実ページpilotへ進めます。現時点でpackageはprivateのままです。

[stage型release CIの準備](docs/npm-release.md)を追加しました。品質検証済みtarballとcommit・版/tag・SHA256を照合し、npm 11.21.0のstage dry-runを認証なしのloopback registryで検証します。公開gateはdisabledで、license・version・npm ownerなどが未決定ならblockedとして報告します。初回stageは公開placeholderを作り、既存packageが必要なTrusted Publishingのbootstrapとは別の承認対象です。実stage・publish・OIDC登録・main統合は行っていません。

## honoxpress命名と累積レビュー

ユーザー決定の候補名`honoxpress`をpackage/import/build virtual ID・UI・README・sample・配布tarballへ反映しました。npm registryのread-only確認は2026-10-01に404でしたが、名前の予約や公開はしていません。GitHub repoのURLとghqパスは`honox-docs-poc`のままです。privateとlicense未選択guardを保持しています。

累積独立レビューでP2を2件修正しました。Unicode routeのencoded hrefとHono decoded pathの不一致はlookup正規化・raw URL pathname使用・解決済みhrefのactive navで修正。HonoX標準の補助MDX除外とmetadata discoveryの不一致は共有内部判定で修正しました。実Hono request＋実rendererのIsland script/nav/TOC/翻訳と、補助ファイル/ディレクトリの一時fixtureを含むpackage unitは15件です。レビューの詳細と残る判断は[review report](docs/review-honoxpress.md)に記録します。
