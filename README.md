# HELLO WORLD Markets

世界のマーケットを見渡す日本語ダッシュボード。略称は **HWMarkets** です。

公開サイト: https://orbit-markets-jp.vercel.app/

## このリポジトリについて

2026年11月8日に、Vercelで公開中のデプロイ `4iN4B9L9LZWwPSctHA2F9CAme1cP` のソースを回収して保存したスナップショットです。以前のローカルZIP以降に加わったニュースページや、価格の最終取得・再取得失敗の表示修正も含みます。

GitHubへの保存を行ったもので、公開サイトのデプロイやVercelとのGit連携は変更していません。

## 主な機能

- 株価指数・為替・暗号資産・コモディティのチャート
- 為替18通貨ペア、銘柄検索、ボード編集、ウォッチリスト
- CoinMarketCapの時価総額TOP50
- Hyperliquidの株式・指数に連動する無期限契約の一覧とチャート
- 株式・暗号資産のポートフォリオ、日本株の会社検索、CSV取り込み
- Descopeのメール認証と、ボード・ウォッチリストなどのアカウント別保存
- `/ai-news` のAI・暗号資産ニュースと公開用JSONデータ

## ファイル構成

- `index.html`、`app.js`、`styles.css`: メイン画面
- `crypto-top50.*`、`hyperliquid.*`: 暗号資産・株式連動契約
- `portfolio*.js`、`portfolio*.css`: 保有資産の管理・日本株検索・CSV
- `account.*`、`auth.html`: アカウント画面と認証
- `api/`、`lib/`: Vercelのサーバー処理
- `ai-news.html`、`ai-news.js`、`ai-news.css`、`data/`: ニュースページ
- `japan-companies.json`: 日本株の会社検索用スナップショット
- `vercel.json`: `cleanUrls` による `/ai-news` のURL設定

## 環境と設定

Node.js 24.xを使用します。依存パッケージは `npm ci` で取得できます。フロント画面はHTML/CSS/JavaScriptで、APIはVercel Functionsです。

実際の認証情報はVercelの **Settings → Environment Variables** で管理します。

| 名前 | 用途 |
| --- | --- |
| `CMC_API_KEY` | CoinMarketCapの価格取得 |
| `DESCOPE_PROJECT_ID` | Descopeのプロジェクト |
| `DESCOPE_MANAGEMENT_KEY` | 認証済み利用者の設定保存 |

`.env.example` は変数名の例だけです。実際のキー・パスワード・トークンをGitへ追加しないでください。別のドメインへ公開する場合は、Descopeの承認ドメイン・戻り先、サーバー側の許可オリジンも確認してください。

## データについて

ポートフォリオの保有数量・購入単価などの利用者データは、このコードには含まれません。保有情報は利用者のブラウザ内で管理します。ボードやウォッチリストのアカウント設定はDescope側に保存します。

株式価格は手入力またはCSV取り込み時点の値です。暗号資産はCoinMarketCap TOP50の取得価格または手入力を利用します。ニュースは静的JSONを手動で更新する方式で、このコードに自動収集処理は含まれません。ニュースのJSONと日本株の会社一覧は保存時点の公開データで、常に最新であることを意味しません。

チャート・価格の配信条件は提供元や市場によって異なります。指数・商品にはCFD、Hyperliquidには無期限契約を含みます。画面内の銘柄区分・時刻・注記をご確認ください。

国旗SVGの利用に関するMIT表記は `app.js` 内に保持しています。その他の外部サービスやデータには各提供元の条件が適用されます。
