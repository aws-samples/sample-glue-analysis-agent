"""
glue_service.pyのテスト

GlueServiceクラスのテストクラス。
boto3クライアントは全てmockして、AWS実リソースに接続しないようにする。
"""

from datetime import datetime
from typing import Generator
from unittest.mock import MagicMock, patch

import pytest

from src.services.glue_service import GlueService


@pytest.fixture
def mock_glue_client() -> Generator[MagicMock, None, None]:
    """Glueクライアントのモック"""
    with patch("boto3.client") as mock_client_factory:
        mock_client = MagicMock()
        mock_client_factory.return_value = mock_client
        yield mock_client


@pytest.fixture
def glue_service() -> Generator[tuple[GlueService, MagicMock], None, None]:
    """テスト用GlueServiceクラス（完全にモック化したもの）"""
    # boto3のクライアント生成部分をパッチ
    with patch("boto3.client") as mock_boto3_client:
        # Glueクライアントモック
        mock_glue = MagicMock()

        # client呼び出しに応じてGlueクライアントモックを返す
        mock_boto3_client.return_value = mock_glue

        # サービスの初期化
        # 依存性注入を利用してモッククライアントを直接渡すことも可能
        service = GlueService(region_name="us-west-2", glue_client=None)  # クライアントは内部で作成される

        # 作成したサービスとモッククライアントを返す
        yield service, mock_glue


def test_get_tables(glue_service: tuple[GlueService, MagicMock]) -> None:
    """get_tables関数のテスト"""
    service, mock_glue = glue_service

    # モックの設定
    mock_paginator = MagicMock()
    mock_glue.get_paginator.return_value = mock_paginator

    mock_paginator.paginate.return_value = [
        {
            "TableList": [
                {
                    "Name": "order",
                    "Description": "注文テーブル",
                    "CreateTime": datetime(2023, 1, 1),
                    "StorageDescriptor": {
                        "Columns": [{"Name": "order_id", "Type": "string"}, {"Name": "revenue", "Type": "double"}],
                    },
                },
                {
                    "Name": "customers",
                    "Description": "顧客テーブル",
                    "CreateTime": datetime(2023, 2, 15),
                    "StorageDescriptor": {
                        "Columns": [
                            {"Name": "customer_id", "Type": "string"},
                            {"Name": "name", "Type": "string"},
                            {"Name": "email", "Type": "string"},
                        ],
                    },
                },
            ],
        },
    ]

    # メソッド実行
    result = service.get_tables("test_db")

    # アサーション
    assert len(result) == 2
    assert result[0]["name"] == "order"
    assert result[0]["description"] == "注文テーブル"
    assert result[0]["columns_count"] == 2
    assert result[0]["created"] == "2023-01-01T00:00:00"

    assert result[1]["name"] == "customers"
    assert result[1]["description"] == "顧客テーブル"
    assert result[1]["columns_count"] == 3
    assert result[1]["created"] == "2023-02-15T00:00:00"

    # モックの呼び出し確認
    mock_glue.get_paginator.assert_called_once_with("get_tables")
    mock_paginator.paginate.assert_called_once_with(DatabaseName="test_db")


def test_get_tables_empty(glue_service: tuple[GlueService, MagicMock]) -> None:
    """テーブルが存在しない場合のget_tables関数のテスト"""
    service, mock_glue = glue_service

    # テーブルが存在しないケース
    mock_paginator = MagicMock()
    mock_glue.get_paginator.return_value = mock_paginator

    mock_paginator.paginate.return_value = [{"TableList": []}]

    # メソッド実行
    result = service.get_tables("empty_db")

    # アサーション
    assert len(result) == 0

    # モックの呼び出し確認
    mock_glue.get_paginator.assert_called_once_with("get_tables")
    mock_paginator.paginate.assert_called_once_with(DatabaseName="empty_db")


def test_get_table_schema(glue_service: tuple[GlueService, MagicMock]) -> None:
    """get_table_schema関数のテスト"""
    service, mock_glue = glue_service

    # モックの設定
    mock_glue.get_table.return_value = {
        "Table": {
            "Name": "order",
            "Description": "注文テーブル",
            "CreateTime": datetime(2023, 1, 1),
            "UpdateTime": datetime(2023, 1, 2),
            "StorageDescriptor": {
                "Location": "s3://bucket/path",
                "InputFormat": "org.apache.hadoop.mapred.TextInputFormat",
                "Columns": [
                    {"Name": "order_id", "Type": "string", "Comment": "注文ID"},
                    {"Name": "revenue", "Type": "double", "Comment": "売上高"},
                ],
            },
            "PartitionKeys": [{"Name": "dt", "Type": "string", "Comment": "日付パーティション"}],
        },
    }

    # メソッド実行
    result = service.get_table_schema("test_db", "order")

    # アサーション
    assert result["name"] == "order"
    assert result["description"] == "注文テーブル"
    assert result["location"] == "s3://bucket/path"
    assert result["format"] == "Text"
    assert len(result["columns"]) == 2
    assert result["columns"][0]["name"] == "order_id"
    assert result["columns"][0]["type"] == "string"
    assert result["columns"][0]["comment"] == "注文ID"
    assert len(result["partition_keys"]) == 1
    assert result["partition_keys"][0]["name"] == "dt"
    assert result["created"] == "2023-01-01T00:00:00"
    assert result["last_updated"] == "2023-01-02T00:00:00"

    # モックの呼び出し確認
    mock_glue.get_table.assert_called_once_with(DatabaseName="test_db", Name="order")


def test_get_table_schema_exception(glue_service: tuple[GlueService, MagicMock]) -> None:
    """get_table_schema関数の例外処理テスト"""
    service, mock_glue = glue_service

    # 例外を発生させるモック設定
    mock_glue.get_table.side_effect = Exception("Table not found")

    # 例外が発生することを確認
    with pytest.raises(Exception, match="Table not found") as excinfo:
        service.get_table_schema("test_db", "non_existent_table")

    # エラーメッセージの確認
    assert "Table not found" in str(excinfo.value)

    # モックの呼び出し確認
    mock_glue.get_table.assert_called_once_with(DatabaseName="test_db", Name="non_existent_table")
