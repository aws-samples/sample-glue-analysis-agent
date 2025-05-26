"""Amazon Athenaを使用してSQLクエリを実行するサービス。."""

import time
from typing import Any

import boto3  # type: ignore
from aws_lambda_powertools import Logger
from botocore.client import BaseClient  # type: ignore

from src.utils.log_utils import sanitize_log_message

logger = Logger()


class AthenaService:
    """Amazon Athenaを使用してSQLクエリを実行するサービスクラス。."""

    def __init__(
        self,
        athena_client: BaseClient | None = None,
        sts_client: BaseClient | None = None,
        region_name: str | None = None,
        output_location: str | None = None,
    ) -> None:
        """AthenaServiceの初期化。.

        Args:
            athena_client: boto3 Athenaクライアント。指定されない場合は新規に作成
            sts_client: boto3 STSクライアント。指定されない場合は新規に作成
            region_name: AWSリージョン名
            output_location: Athenaクエリ結果の出力先S3バケット
        """
        self.region_name = region_name or "us-west-2"
        self.athena_client = athena_client or boto3.client("athena", region_name=self.region_name)
        sts = sts_client or boto3.client("sts")

        # Athenaクエリ結果の出力先S3バケット
        if output_location:
            self.output_location = f"s3://{output_location}/"
        else:
            self.output_location = "s3://aws-athena-query-results-{}-{}/".format(
                self.athena_client.meta.config.region_name,
                sts.get_caller_identity().get("Account"),
            )

    def execute_query(self, database: str, query: str, max_results: int = 1000) -> dict[str, Any]:
        """Athenaでクエリを実行し、結果を取得。.

        Args:
            database: クエリを実行するデータベース名
            query: 実行するSQLクエリ
            max_results: 取得する最大結果数

        Returns:
            クエリ結果
        """
        logger.info(f"Executing query on database: {sanitize_log_message(database)}")
        logger.debug(f"Query: {sanitize_log_message(query)}")

        try:
            # クエリ実行
            start_query_response = self.athena_client.start_query_execution(
                QueryString=query,
                QueryExecutionContext={"Database": database},
                ResultConfiguration={"OutputLocation": self.output_location},
            )

            query_execution_id = start_query_response["QueryExecutionId"]
            logger.info(f"Query execution ID: {sanitize_log_message(query_execution_id)}")

            # クエリ完了を待機
            query_status = self._wait_for_query_completion(query_execution_id)

            if query_status == "FAILED":
                query_execution = self.athena_client.get_query_execution(QueryExecutionId=query_execution_id)
                error_message = query_execution["QueryExecution"]["Status"]["StateChangeReason"]
                logger.error(f"Query failed: {sanitize_log_message(error_message)}")
                error_msg = f"Athena query failed: {error_message}"
                raise Exception(error_msg)

            if query_status == "CANCELLED":
                logger.warning("Query was cancelled")
                error_msg = "Athena query was cancelled"
                raise Exception(error_msg)

            # 結果を取得
            result = self._get_query_results(query_execution_id, max_results)

            # 実行統計情報を取得
            query_execution = self.athena_client.get_query_execution(QueryExecutionId=query_execution_id)
            statistics = query_execution["QueryExecution"]["Statistics"]

            return {
                "columns": result["columns"],
                "rows": result["rows"],
                "row_count": len(result["rows"]),
                "execution_time_ms": statistics.get("TotalExecutionTimeInMillis", 0),
                "data_scanned_bytes": statistics.get("DataScannedInBytes", 0),
                "query_execution_id": query_execution_id,
            }

        except Exception:
            logger.exception("Error executing Athena query")
            raise

    def _wait_for_query_completion(self, query_execution_id: str, max_wait_time: int = 30) -> str:
        """クエリの完了を待機。.

        Args:
            query_execution_id: クエリ実行ID
            max_wait_time: 最大待機時間(秒)

        Returns:
            クエリステータス(SUCCEEDED, FAILED, CANCELLED)
        """
        wait_time = 0
        sleep_time = 1  # 初期待機時間(秒)

        while wait_time < max_wait_time:
            query_status = self.athena_client.get_query_execution(QueryExecutionId=query_execution_id)[
                "QueryExecution"
            ]["Status"]["State"]

            if query_status in ["SUCCEEDED", "FAILED", "CANCELLED"]:
                logger.info(
                    f"Query {sanitize_log_message(query_execution_id)} finished with status: {sanitize_log_message(query_status)}",
                )
                return query_status

            logger.debug(f"Query still running. Waiting {sanitize_log_message(str(sleep_time))}s...")
            time.sleep(sleep_time)
            wait_time += sleep_time

            # 指数バックオフ処理
            sleep_time = min(sleep_time * 2, 5)

        # タイムアウト
        logger.warning(f"Query execution timed out after {sanitize_log_message(str(max_wait_time))}s")
        return self.athena_client.get_query_execution(QueryExecutionId=query_execution_id)["QueryExecution"]["Status"][
            "State"
        ]

    def _get_query_results(self, query_execution_id: str, max_results: int) -> dict[str, Any]:
        """クエリ結果を取得。.

        Args:
            query_execution_id: クエリ実行ID
            max_results: 取得する最大結果数

        Returns:
            整形されたクエリ結果
        """
        response = self.athena_client.get_query_results(QueryExecutionId=query_execution_id, MaxResults=max_results)

        # カラム情報を抽出
        columns = [
            {"name": column["Name"], "type": column["Type"]}
            for column in response["ResultSet"]["ResultSetMetadata"]["ColumnInfo"]
        ]

        # 行データを抽出
        rows = []
        for row in response["ResultSet"]["Rows"][1:]:  # 最初の行はヘッダーなのでスキップ
            data = {}
            for i, value in enumerate(row["Data"]):
                # Athenaの結果はNULLの場合、キーが存在しない
                column_name = columns[i]["name"]
                data[column_name] = next(iter(value.values())) if value else None
            rows.append(data)

        return {"columns": columns, "rows": rows}
