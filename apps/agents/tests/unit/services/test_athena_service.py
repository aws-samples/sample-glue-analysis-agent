"""
athena_service.pyのテスト

AthenaServiceクラスのテストクラス。
boto3クライアントは全てmockして、AWS実リソースに接続しないようにする。
"""

from typing import Generator
from unittest.mock import MagicMock, patch

import pytest

from src.services.athena_service import AthenaService


@pytest.fixture
def mock_athena_client() -> Generator[MagicMock, None, None]:
    """Athenaクライアントのモック"""
    with patch("boto3.client") as mock_client_factory:
        mock_client = MagicMock()
        mock_client_factory.return_value = mock_client
        yield mock_client


@pytest.fixture
def mock_sts_client() -> Generator[MagicMock, None, None]:
    """STSクライアントのモック"""
    with patch("boto3.client") as mock:
        mock_client = MagicMock()
        mock_client.get_caller_identity.return_value = {"Account": "123456789012"}
        mock.return_value = mock_client
        yield mock_client


@pytest.fixture
def athena_service() -> Generator[tuple[AthenaService, MagicMock, MagicMock], None, None]:
    """テスト用AthenaServiceクラス（完全にモック化したもの）"""
    # boto3のクライアント生成部分をパッチ
    with patch("boto3.client") as mock_boto3_client:
        # Athenaクライアントモック
        mock_athena = MagicMock()
        # STSクライアントモック
        mock_sts = MagicMock()
        mock_sts.get_caller_identity.return_value = {"Account": "123456789012"}

        # client呼び出しに応じて異なるモックを返す
        def side_effect(service_name: str, **_: dict) -> MagicMock:
            if service_name == "athena":
                return mock_athena
            if service_name == "sts":
                return mock_sts
            return MagicMock()

        mock_boto3_client.side_effect = side_effect

        # サービスの初期化と設定
        service = AthenaService(region_name="us-west-2")
        service.output_location = "s3://test-bucket/results/"

        # 作成したサービスとモッククライアントを返す
        yield service, mock_athena, mock_sts


@patch("time.sleep", return_value=None)  # sleepをモック化して待機時間をスキップ
def test_execute_query_success(
    mock_sleep: MagicMock,
    athena_service: tuple[AthenaService, MagicMock, MagicMock],
) -> None:
    """execute_query関数の成功ケースのテスト"""
    service, mock_athena, _ = athena_service

    # モックの設定
    mock_athena.start_query_execution.return_value = {"QueryExecutionId": "query-123"}

    # get_query_executionの最初の呼び出しでは実行中、2回目で成功を返す
    mock_athena.get_query_execution.side_effect = [
        {"QueryExecution": {"Status": {"State": "RUNNING"}}},
        {"QueryExecution": {"Status": {"State": "SUCCEEDED"}}},
        {
            "QueryExecution": {
                "Status": {"State": "SUCCEEDED"},
                "Statistics": {"TotalExecutionTimeInMillis": 1000, "DataScannedInBytes": 1024},
            },
        },
    ]

    # get_query_resultsの戻り値を設定
    mock_athena.get_query_results.return_value = {
        "ResultSet": {
            "ResultSetMetadata": {
                "ColumnInfo": [{"Name": "order_id", "Type": "varchar"}, {"Name": "revenue", "Type": "double"}],
            },
            "Rows": [
                {"Data": [{"VarCharValue": "order_id"}, {"VarCharValue": "revenue"}]},  # ヘッダー行
                {"Data": [{"VarCharValue": "123"}, {"VarCharValue": "100.5"}]},
                {"Data": [{"VarCharValue": "456"}, {"VarCharValue": "200.75"}]},
            ],
        },
    }

    # メソッド実行
    result = service.execute_query("test_db", "SELECT * FROM order")

    # アサーション
    assert result["row_count"] == 2
    assert len(result["columns"]) == 2
    assert result["columns"][0]["name"] == "order_id"
    assert result["columns"][0]["type"] == "varchar"
    assert len(result["rows"]) == 2
    assert result["rows"][0]["order_id"] == "123"
    assert result["rows"][0]["revenue"] == "100.5"
    assert result["execution_time_ms"] == 1000
    assert result["data_scanned_bytes"] == 1024
    assert result["query_execution_id"] == "query-123"

    # モックの呼び出し確認
    mock_athena.start_query_execution.assert_called_once_with(
        QueryString="SELECT * FROM order",
        QueryExecutionContext={"Database": "test_db"},
        ResultConfiguration={"OutputLocation": "s3://test-bucket/results/"},
    )
    # 呼び出し回数を確認
    assert mock_athena.get_query_execution.call_count == 3
    assert mock_athena.get_query_results.call_count == 1
    assert mock_sleep.call_count >= 1  # 少なくとも1回はsleepが呼ばれているはず


@patch("time.sleep", return_value=None)  # sleepをモック化
def test_execute_query_failed(
    mock_sleep: MagicMock,
    athena_service: tuple[AthenaService, MagicMock, MagicMock],
) -> None:
    """execute_query関数の失敗ケースのテスト"""
    service, mock_athena, _ = athena_service

    # モックの設定
    mock_athena.start_query_execution.return_value = {"QueryExecutionId": "query-123"}

    # クエリ失敗を模擬
    mock_athena.get_query_execution.return_value = {
        "QueryExecution": {"Status": {"State": "FAILED", "StateChangeReason": "Syntax error"}},
    }

    # 例外が発生することを確認
    with pytest.raises(Exception, match="Athena query failed: Syntax error") as excinfo:
        service.execute_query("test_db", "SELECT * FROM invalid_table")

    assert "Athena query failed: Syntax error" in str(excinfo.value)

    # モックの呼び出し確認
    mock_athena.start_query_execution.assert_called_once()
    mock_athena.get_query_execution.assert_called()


@patch("time.sleep", return_value=None)  # sleepをモック化
def test_execute_query_cancelled(
    mock_sleep: MagicMock,
    athena_service: tuple[AthenaService, MagicMock, MagicMock],
) -> None:
    """execute_query関数のキャンセルケースのテスト"""
    service, mock_athena, _ = athena_service

    # モックの設定
    mock_athena.start_query_execution.return_value = {"QueryExecutionId": "query-123"}

    # クエリキャンセルを模擬
    mock_athena.get_query_execution.return_value = {"QueryExecution": {"Status": {"State": "CANCELLED"}}}

    # 例外が発生することを確認
    with pytest.raises(Exception, match="Athena query was cancelled") as excinfo:
        service.execute_query("test_db", "SELECT * FROM table")

    assert "Athena query was cancelled" in str(excinfo.value)


@patch("time.sleep", return_value=None)  # sleepをモック化
def test_wait_for_query_completion_timeout(
    mock_sleep: MagicMock,
    athena_service: tuple[AthenaService, MagicMock, MagicMock],
) -> None:
    """_wait_for_query_completionのタイムアウトテスト"""
    service, mock_athena, _ = athena_service

    # 常に実行中を返すモック
    mock_athena.get_query_execution.return_value = {"QueryExecution": {"Status": {"State": "RUNNING"}}}

    # 短いタイムアウトで実行
    result = service._wait_for_query_completion("query-123", max_wait_time=2)

    # 実行中のまま終了することを確認
    assert result == "RUNNING"
    assert mock_sleep.call_count > 0  # sleepが呼ばれていることを確認
    assert mock_athena.get_query_execution.call_count > 1  # 複数回問い合わせていることを確認
