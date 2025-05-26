# Sales Analysis Agent Web Client

このプロジェクトは、Sales Analysis Agent のフロントエンドアプリケーションです。React、TypeScript、Vite を使用して構築されています。

## 機能

- Amazon Cognito 認証
- AWS AppSync Events を使用した WebSocket によるバックエンド API 通信
- リアルタイムチャット機能
- データ可視化

## 開発環境のセットアップ

### 前提条件

- Node.js 22 以上
- AWS CLI のインストールと設定
- バックエンドインフラのデプロイ完了

### 開発サーバーの起動

```bash
pnpm run dev
```

### ビルドと本番デプロイ

```bash
pnpm run build
```

ビルド成果物は`dist`ディレクトリに生成されます。これを S3 バケットなどにデプロイしてください。
