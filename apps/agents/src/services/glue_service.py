"""AWS Glueデータカタログからテーブル情報を取得するサービス."""

from typing import Any

import boto3  # type: ignore
from aws_lambda_powertools import Logger
from botocore.client import BaseClient  # type: ignore

from src.utils.log_utils import sanitize_log_message

logger = Logger()


class GlueService:
    """AWS Glueデータカタログからテーブル情報を取得するサービスクラス."""

    def __init__(
        self,
        glue_client: BaseClient | None = None,
        region_name: str | None = None,
        database_name: str | None = None,
    ) -> None:
        """GlueServiceの初期化.

        Args:
            glue_client: boto3 Glueクライアント。指定されない場合は新規に作成
            region_name: AWSリージョン名
            database_name: デフォルトのGlueデータベース名
        """
        self.region_name = region_name or "us-west-2"
        self.glue_client = glue_client or boto3.client("glue", region_name=self.region_name)
        self.database_name = database_name or ""

    def get_tables(self, database_name: str) -> list[dict[str, Any]]:
        """指定されたデータベースのすべてのテーブル情報を取得.

        Args:
            database_name: Glueデータベース名

        Returns:
            テーブル情報のリスト

        Raises:
            botocore.exceptions.ClientError: Glueクライアントエラーが発生した場合
        """
        logger.info(f"Getting tables from database: {sanitize_log_message(database_name)}")

        try:
            paginator = self.glue_client.get_paginator("get_tables")
            tables = []

            for page in paginator.paginate(DatabaseName=database_name):
                tables.extend(
                    [
                        {
                            "name": table.get("Name"),
                            "description": table.get("Description", ""),
                            "columns_count": len(table.get("StorageDescriptor", {}).get("Columns", [])),
                            "created": (table.get("CreateTime").isoformat() if table.get("CreateTime") else None),
                        }
                        for table in page.get("TableList", [])
                    ],
                )

            logger.info(f"Found {len(tables)} tables in database {sanitize_log_message(database_name)}")
            return tables

        except Exception as e:
            logger.error(
                f"Error getting tables from database {sanitize_log_message(database_name)}: {sanitize_log_message(str(e))}"
            )
            raise

    def get_table_schema(self, database_name: str, table_name: str) -> dict[str, Any]:
        """指定されたテーブルのスキーマ情報を取得.

        Args:
            database_name: Glueデータベース名
            table_name: テーブル名

        Returns:
            テーブルスキーマ情報
        """
        logger.info(
            f"Getting schema for table {sanitize_log_message(table_name)} in database {sanitize_log_message(database_name)}"
        )

        try:
            response = self.glue_client.get_table(DatabaseName=database_name, Name=table_name)

            table = response.get("Table", {})
            storage_descriptor = table.get("StorageDescriptor", {})

            # カラム情報を整形
            columns = []
            for column in storage_descriptor.get("Columns", []):
                columns.append(
                    {
                        "name": column.get("Name"),
                        "type": column.get("Type"),
                        "comment": column.get("Comment", ""),
                    },
                )

            # パーティションキー情報を整形
            partition_keys = []
            for partition_key in table.get("PartitionKeys", []):
                partition_keys.append(
                    {
                        "name": partition_key.get("Name"),
                        "type": partition_key.get("Type"),
                        "comment": partition_key.get("Comment", ""),
                    },
                )

            # スキーマ情報を構築
            schema = {
                "name": table.get("Name"),
                "description": table.get("Description", ""),
                "location": storage_descriptor.get("Location", ""),
                "format": storage_descriptor.get("InputFormat", "").split(".")[-1].replace("InputFormat", ""),
                "columns": columns,
                "partition_keys": partition_keys,
                "created": (table.get("CreateTime").isoformat() if table.get("CreateTime") else None),
                "last_updated": (table.get("UpdateTime").isoformat() if table.get("UpdateTime") else None),
            }

            return schema

        except Exception as e:
            logger.error(
                f"Error getting schema for table {sanitize_log_message(table_name)}: {sanitize_log_message(str(e))}"
            )
            raise
