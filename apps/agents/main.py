#!/usr/bin/env python3
"""
OpenAPI スキーマ生成スクリプト
Bedrock Agent アプリケーションの OpenAPI スキーマを生成し、ファイルに保存します
"""

from pathlib import Path

from src.app import app  # 既存のappインスタンスをインポート


def main():
    """メイン関数"""
    # OpenAPI スキーマの取得
    schema = app.get_openapi_json_schema()

    # スキーマの保存先パスを作成
    resources_dir = Path(__file__).parent / "resources"
    resources_dir.mkdir(exist_ok=True)
    schema_path = resources_dir / "schema.json"

    # スキーマをファイルに保存
    with open(schema_path, "w") as f:
        f.write(schema)


if __name__ == "__main__":
    main()
