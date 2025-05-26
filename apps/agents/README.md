# Sales Analysis Agent - Bedrock Agent

このモジュールは、Amazon Bedrock Agents の Action Group として設定される Lambda 関数を提供します。

## 機能

- AWS Glue データカタログからテーブル情報を取得
- ユーザーの自然言語クエリに基づいて Athena で SQL を実行

## 開発環境のセットアップ

```bash
# 依存関係のインストール
uv sync --frozen
```

## OpenAPI スキーマの生成

```bash
# AWS 認証情報が必要
# スキーマ生成スクリプトを実行
pnpm run generate-schema
```

## テスト

```bash
# テストの実行
pnpm test
```

## デプロイ

このモジュールは、`apps/infra`の CDK スタックによってデプロイされます。
