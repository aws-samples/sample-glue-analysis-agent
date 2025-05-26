"""Bedrock Agent用のアプリケーションモジュール。.

AWS Glueデータカタログからテーブル情報を取得し、Athenaでクエリを実行するAPIを提供します。
"""

import os
from typing import Annotated, Any

import boto3  # type: ignore
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.event_handler import BedrockAgentResolver
from aws_lambda_powertools.event_handler.openapi.params import Body, Query
from aws_lambda_powertools.utilities.typing import LambdaContext

from src.services.athena_service import AthenaService
from src.services.glue_service import GlueService

# Powertools の初期化
logger = Logger()
tracer = Tracer()

# 環境変数の読み込み
ATHENA_RESULTS_BUCKET_NAME = os.environ.get("ATHENA_RESULTS_BUCKET_NAME", "")
GLUE_DATABASE_NAME = os.environ.get("GLUE_DATABASE_NAME", "")
AWS_REGION = os.environ.get("AWS_REGION", "us-west-2")

app = BedrockAgentResolver()

glue_client = boto3.client("glue", region_name=AWS_REGION)
glue_service = GlueService(
    glue_client=glue_client,
    region_name=AWS_REGION,
    database_name=GLUE_DATABASE_NAME,
)

athena_client = boto3.client("athena", region_name=AWS_REGION)
sts_client = boto3.client("sts", region_name=AWS_REGION)
athena_service = AthenaService(
    athena_client=athena_client,
    sts_client=sts_client,
    region_name=AWS_REGION,
    output_location=ATHENA_RESULTS_BUCKET_NAME,
)


# ルートの登録
@app.get(
    "/get_tables",
    description="Get all tables from the Glue Data Catalog",
    operation_id="get_tables",
)
@tracer.capture_method
def get_tables(
    database: Annotated[str, Query(description="Database name in Glue Data Catalog")],
) -> dict[str, Any]:
    """Glueデータカタログから指定されたデータベースのすべてのテーブルを取得します。."""
    tables = glue_service.get_tables(database)
    return {"database": database, "tables": tables, "count": len(tables)}


@app.get(
    "/get_table_schema",
    description="Get schema for a specific table",
    operation_id="get_table_schema",
)
@tracer.capture_method
def get_table_schema(
    database: Annotated[str, Query(description="Database name in Glue Data Catalog")],
    table_name: Annotated[str, Query(description="Table name to get schema for")],
) -> dict[str, Any]:
    """指定されたテーブルのスキーマ情報を取得します。."""
    schema = glue_service.get_table_schema(database, table_name)
    return {
        "database": database,
        "table_name": table_name,
        "schema": schema,
    }


@app.post(
    "/execute_query",
    description="Execute SQL query using Athena",
    operation_id="execute_query",
)
@tracer.capture_method
def execute_query(
    database: Annotated[str, Body(description="Database name in Glue Data Catalog")],
    query: Annotated[str, Body(description="SQL statement")],
) -> dict[str, Any]:
    """Athenaを使用してSQLクエリを実行し、結果を返します。."""
    result = athena_service.execute_query(database, query)
    return {"query_result": result}


@tracer.capture_lambda_handler
@logger.inject_lambda_context(log_event=True)
def lambda_handler(event: dict[str, Any], context: LambdaContext) -> dict[str, Any]:
    """Lambda ハンドラー関数。.

    Args:
        event: Lambda イベント
        context: Lambda コンテキスト

    Returns:
        Lambda レスポンス
    """
    return app.resolve(event, context)
