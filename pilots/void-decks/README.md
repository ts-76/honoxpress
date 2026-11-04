# Void + hono-decks サンプル

Void のルートから hono-decks を配信し、トップページに同一オリジンの iframe でスライドを埋め込みます。公開後は `https://hono-decks.com` のドキュメントからも埋め込めます。

## 起動と確認

Node.js 24.22.1 以降の 24 系と npm 11.19.1 を使います。このディレクトリはルートの pnpm ワークスペースとは独立した npm サンプルです。`package-lock.json` をコミットし、依存の導入には `npm ci` を使います。

```sh
cd pilots/void-decks
npm ci
npm run typecheck
npm run build
npm run dev
```

`http://127.0.0.1:5197/` を開きます。`npm run preview` はビルドした Worker を `http://127.0.0.1:4197/` で確認します。Vite+ がある場合は、各 npm コマンドを `vp env exec --node 24.22.1 --package-manager npm@11.19.1 npm ...` で実行できます。

## 構成と埋め込み

- `decks/welcome/deck.mdx`: スライドの内容。Vite プラグインが開発時に変更を監視します。
- `hono-decks.config.ts`: マウントパス、コンパイル先、埋め込み設定。
- `lib/decks.ts`: 生成済みデッキと Hono ルーターを接続。
- `routes/slides/[...path].ts`: Void の catch-all から Hono ルーターへリクエストを渡す。
- `routes/index.ts`: `decks.paths()` で取得した相対 URL を iframe に指定。

`npm run typecheck` はデッキを `lib/generated` へ生成してから型検査します。開発・ビルド時は `hono-decks/vite` が仮想モジュールを生成します。生成物は直接編集しません。

埋め込み用の `/slides/welcome/embed` は CSP の `frame-ancestors` で自サイトと `https://hono-decks.com` だけを許可します。他のサブドメインや任意の外部サイトは許可しません。CSP はブラウザの埋め込み制限であり、公開スライドへのアクセス認証ではありません。プレゼンター、印刷、プレゼンテーション、エクスポートは提供しません。

公開 URL が決まった後、ドキュメント側には次の iframe を置きます。`PUBLIC_ORIGIN` は実際に公開して確認した HTTPS オリジンへ置き換えます。

```html
<iframe
  src="PUBLIC_ORIGIN/slides/welcome/embed"
  title="Void + hono-decks サンプル"
  style="width:100%;aspect-ratio:16/9;border:0"
  allowfullscreen
></iframe>
```

## 公開手順（この準備では未実行）

公開先は既存の `hono-decks-docs` とは別の Cloudflare Worker `void-hono-decks-example` です。設定は `void.config.ts` を編集し、`.void-wrangler.jsonc` やビルド出力を編集しません。初期公開はその Worker の `workers.dev` URL を使い、バージョンのプレビュー URL は無効にしています。ドメインの新規割り当てはこの設定には含めません。

1. Cloudflare の対象アカウント（既存 docs と同じ運用なら `tsapp`）と既存ルート・ドメインを確認し、`void-hono-decks-example` が別用途の既存 Worker と衝突しないことを確かめます。衝突する場合は公開前に `cloudflare.name` を変更します。既存ドキュメント Worker に上書きしません。
2. このディレクトリで `npm ci`、`npm run typecheck`、`npm run build` を実行し、ローカルプレビューを確認します。
3. 公開を承認した担当者だけが `npx void deploy --platform cloudflare` を実行します。Void はリソースの準備、ビルド、アップロード、トラフィック更新を行います。初回公開は準備段階で実リソースを作る場合があります。
4. 出力された公開 URL で `/`、`/slides/welcome`、`/slides/welcome/embed`、`/slides/welcome/render` と参照する JS/CSS を確認します。`/embed` の CSP が `frame-ancestors 'self' https://hono-decks.com` であることと、無効なサーフェスが 404 になることを確認します。
5. 自サイトのトップページと `hono-decks.com` で iframe、左右キー、全画面、モバイル表示を確認し、それ以外のオリジンの iframe がブラウザで拒否されることを確認してからドキュメントに掲載します。

アカウント情報やトークンをコミットしません。`.void/`、`.wrangler/`、`.env*`、`.dev.vars*` は除外しています。`void.lock.json` はリソース ID やマイグレーションを記録した場合も保持し、公開後に変更された内容を確認してコミットします。

Void 1.5.0 同梱の `docs/integrations/cloudflare.md` と `docs/reference/cli/deploy.md` に基づく手順です。公開操作、本番 URL とドキュメント側 iframe の実表示は別途確認が必要です。
