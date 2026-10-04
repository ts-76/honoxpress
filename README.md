# honoxpress

Hono JSX と MDX でドキュメントを作るための、メタデータ API・ビルドヘルパー・編集可能な UI テンプレート。

HonoX のファイルルーティングに沿って、ページ一覧、目次、言語切り替えを組み立てます。ルート、レイアウト、Island、CSS はアプリ側で管理するため、既存の HonoX アプリに合わせて見た目や動作を調整できます。

[npm](https://www.npmjs.com/package/honoxpress) · [API / integration guide](docs/api.md) · [English package README](packages/docs/README.md) · [Releases](https://github.com/ts-76/honoxpress/releases) · [MIT License](LICENSE)

![サンプルのドキュメント画面。ページ一覧、本文、目次、言語切り替え、コードコピー、Island とライブデモを配置。](examples/poc/evidence/screenshots/english.png)

## できること

- **ページの整理** — MDX の frontmatter からタイトル、説明、表示順を読み取り、ナビゲーションを生成します。
- **多言語ドキュメント** — ファイルパスから URL と言語を決め、同じ相対パスの翻訳ページを結びます。未翻訳の言語にはリンクを作りません。
- **目次とアンカー** — Markdown の見出しから目次を生成します。日本語などの Unicode 文字と、重複する見出しに対応します。
- **静的ドキュメントと動的デモ** — ドキュメントだけを静的生成し、デモを Worker の動的ルートとして扱うためのビルドヘルパーを提供します。
- **自分で編集できる UI** — ナビゲーション、目次、言語切り替え、コードコピー、デモ表示、CSS をコピーして使えます。HonoX の Island を MDX に組み込めます。

既存の HonoX アプリにドキュメントを追加したい場合や、レイアウトを自分のコードで管理したい場合に向いています。検索、CMS、ホスティング、プロジェクト生成 CLI は含みません。

## インストールと最小例

```sh
pnpm add honoxpress hono
```

パッケージは ESM です。Node.js の要件は `^22.20.0 || ^24.12.0 || >=26.0.0`、Hono の peer dependency は `^4.13.12` です。HonoX と MDX のビルド依存は、アプリ側に追加します。

`createDocsCatalog` は、ページの情報を URL・ナビゲーション・翻訳リンクに変換する API です。次の例はメタデータの使い方を示します。

```ts
import { createDocsCatalog } from "honoxpress";

const docs = createDocsCatalog({
  locales: ["en", "ja"],
  defaultLocale: "en",
  entries: [
    { route: "docs/getting-started.mdx", title: "Getting started", order: 1 },
    { route: "ja/docs/getting-started.mdx", title: "はじめに", order: 1 },
  ],
});

docs.page("/docs/getting-started")?.title; // "Getting started"
docs.navigation("ja").map((page) => page.href); // ["/ja/docs/getting-started"]
docs.translations("/docs/getting-started");
// [{ locale: "en", href: "/docs/getting-started" },
//  { locale: "ja", href: "/ja/docs/getting-started" }]
```

HonoX アプリでは、ビルドプラグインが MDX からカタログを生成します。ページ情報を手作業で二重管理する必要はありません。設定と renderer の実装は [組み込みガイド](docs/api.md) を参照してください。

## サンプルを動かす

[examples/poc](examples/poc) は、日英の MDX、Island、コードコピー、動的デモを含む HonoX アプリです。Node.js 24.12.0 と pnpm 11.22.0 で次を実行できます。

```sh
git clone https://github.com/ts-76/honoxpress.git
cd honoxpress
pnpm install --frozen-lockfile
pnpm build:package
pnpm dev
```

[http://127.0.0.1:5173/docs/getting-started](http://127.0.0.1:5173/docs/getting-started) を開くと英語版、`/ja/docs/getting-started` を開くと日本語版を表示します。サンプルの開発サーバーはポート 5173 を使います。

```sh
pnpm build
pnpm preview
```

ビルドは **client → docs SSG → Worker** の順で実行します。プレビューは Cloudflare のローカル環境を使うため、追加で `cf@1.0.0-beta.6` が必要です。依存バージョンと環境要件は [互換性ガイド](docs/compatibility.md) にまとめています。

## MDX の配置とページ情報

標準の `app/routes` 配下に、信頼できるローカル MDX を置きます。既定言語が `en` の場合、次のファイルが対応する URL になります。

| ファイル                                 | URL                        |
| ---------------------------------------- | -------------------------- |
| `app/routes/docs/index.mdx`              | `/docs`                    |
| `app/routes/docs/getting-started.mdx`    | `/docs/getting-started`    |
| `app/routes/ja/docs/getting-started.mdx` | `/ja/docs/getting-started` |

```mdx
---
title: はじめに
description: インストールと最初のページの作り方
order: 1
---

# はじめに

## インストール

ここに本文を書きます。
```

`title` は必須、`description` と数値の `order` は任意です。ページの識別にはファイルパスを使い、frontmatter の `id` は使いません。表示順は `order`、同値の場合は URL で決まります。

## UI をカスタマイズする

テンプレートは `honoxpress/templates/*` からファイルとして取得できます。

| テンプレート     | アプリ側のコピー先              |
| ---------------- | ------------------------------- |
| `docs-ui.tsx`    | `app/components/docs-ui.tsx`    |
| `copy-code.tsx`  | `app/islands/copy-code.tsx`     |
| `demo-frame.tsx` | `app/components/demo-frame.tsx` |
| `docs.css`       | 公開するスタイルシート          |

コピー後のファイルは、アプリに合わせて編集します。`copy-code.tsx` は HonoX が検出できるよう **`app/islands` に置いてください**。パッケージから直接 import するだけでは、アプリの Island として登録されません。

テンプレートには、モバイル用のナビゲーション・目次、キーボードフォーカス、本文へのスキップリンク、コードコピーの結果表示、ダークモード用の色設定を含みます。更新時は差分を確認して手動で取り込み、コピーしたファイルにも MIT のライセンス表記を保持してください。取得方法は [組み込みガイド](docs/api.md#copy-and-customize-the-ui) にあります。

## ビルドと利用範囲

`honoxpress` は実行時のメタデータ API、`honoxpress/build` はビルド時の MDX 読み込み・見出し変換・SSG フィルターを提供します。ルーターと renderer は HonoX アプリ側で設定します。

- MDX は JavaScript を実行できるため、信頼できるローカルファイルを対象にしてください。
- Worker で `worker: true` を指定するとメタデータの MDX 読み込みを止めます。本文も Worker から除くには、`honox/server/base` で動的ルートの import 対象を明示する必要があります。SSG のフィルターだけでは本文の import は除去されません。
- ページ移動は通常のドキュメント遷移です。Island の状態はページを離れるとリセットされます。
- CI は Node.js 22.23.3 / 24.12.0 / 24.21.0 で、パッケージ、サンプル、配布 tarball を独立したアプリへインストールする検証を行います。Node.js 26、その他の OS・ブラウザー、本番 Cloudflare デプロイは検証対象外です。

0.x 系のパッケージです。採用時はバージョンを固定し、更新前に [変更履歴](CHANGELOG.md) と [互換性ガイド](docs/compatibility.md) を確認してください。

## ドキュメントと開発

- [組み込みガイド / API](docs/api.md) — MDX、Vite、renderer、テンプレート、Worker の設定
- [互換性ガイド](docs/compatibility.md) — 検証する環境と既知の制約
- [サンプルアプリ](examples/poc) — client・SSG・Worker の一連の構成
- [変更履歴](CHANGELOG.md) / [リリース](https://github.com/ts-76/honoxpress/releases)
- [コントリビューションガイド](CONTRIBUTING.md) — 開発環境、検証、PR の進め方

不具合や提案は [GitHub Issues](https://github.com/ts-76/honoxpress/issues) へ。使用バージョン、再現手順、対象 URL、dev / SSG / Worker のどの段階で起きるかを添えてください。

## ライセンスと謝辞

[MIT](LICENSE) © 2026 ts-76。

UI の設計では [Cloudflare Nimbus](https://github.com/cloudflare/nimbus) の読み幅・余白・ナビゲーションと、[Fumapress](https://github.com/fuma-nama/fumapress) の現在ページ表示・コード操作・モバイル目次を参考にしました。JSX、CSS、アイコンは独自に実装しています。
