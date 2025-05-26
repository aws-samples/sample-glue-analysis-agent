# 開発者ガイド

このガイドは、Sales Analysis Agent プロジェクトに貢献したい開発者向けのガイドラインです。コードの修正、テスト、PR 提出など、プロジェクト参加に必要な情報を提供します。

## モジュール構成

このアプリケーションは Turborepo を利用したモノレポ構造を採用しており、以下のモジュールで構成されています：

```
.
|-- apps       # Applications
|   |-- agents     # AWS Lambda for Bedrock Agents (Python)
|   |-- controller # AWS Lambda for AppSync Events Resolver (Python)
|   |-- infra      # AWS CDK (TypeScript)
|   `-- web        # Web UI (TypeScript)
`-- packages   # Shared libraries
```

## 開発環境のセットアップ

### 前提条件

- Turborepo
- Node.js 22 以上
- pnpm ... `pnpm` コマンドのみを使用してください。`npm` コマンドは禁止されています
- Python 3.13 以上
- uv ... `uv` コマンドのみを使用してください。`python`, `pip` コマンドは禁止されています
- AWS CLI
- Git

### 初期セットアップ

```bash
# 依存関係のインストール
pnpm install --frozen-lockfile

# apps/api
cd apps/api
uv sync --frozen

# apps/agents
cd apps/agents
uv sync --frozen
```

### AWS 認証情報の設定

```bash
aws configure
# または
aws sso configure
```

## 必須の開発タスク

**コードを変更した場合、必ず以下のコマンドを実行してテストを行い、問題を修正してください**

```sh
# ユニットテストの実行
turbo run test --log-order=grouped
# 統合テストの実行
turbo run integ --log-order=grouped
# lint, format, typecheck をまとめて実行
turbo run check --log-order=grouped
```

## ローカル開発サーバーの起動

**次のコマンドは `Ctrl + C` で終了されるまで実行されるため、人間のコントリビューター専用です**

```sh
# CloudFormation Outputs から .env.local を作成
./scripts/update-env.sh

# ローカル開発サーバーの起動
cd apps/web
pnpm dev
```

## コミットメッセージ

[Conventional Commits](https://www.conventionalcommits.org/) に従う

## アーキテクチャガイドライン

新機能やコンポーネントの追加時は以下の原則に従ってください：

1. **モジュール性**: 機能は明確に分離された責任を持つ
2. **再利用性**: 共通コンポーネントは`packages`ディレクトリに配置
3. **型安全性**: 厳密な型チェックを常に使用
4. **テスト容易性**: 依存性注入を使用し、単体テストを容易に
5. **パフォーマンス**: 不要な再レンダリングを避ける最適化

---

Happy coding! 🚀
