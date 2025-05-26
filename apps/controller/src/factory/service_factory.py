"""ServiceFactory - アプリケーションのサービスインスタンスを生成する."""

from typing import Any, Callable, Dict, Optional
from urllib.parse import urlparse

from aws_lambda_powertools import Logger

from src.appsync_events_client import PublishRequest
from src.stream import InvokeAgentStreamHandler


class AppSyncEventsHTTPClient:
    """AppSync EventsのHTTP APIクライアント.

    packages/appsync-events-request-pyのPublishRequestクラスを使用してデータをpublishする。
    """

    def __init__(self, http_endpoint: str, channel: str) -> None:
        """初期化.

        Args:
            http_endpoint: AppSync Events HTTP API エンドポイント
            channel: 使用するチャネル
        """
        self.http_endpoint = http_endpoint
        self.channel = channel

        # エンドポイントのURLからリージョンを抽出
        parsed_url = urlparse(http_endpoint)
        hostname = parsed_url.netloc
        hostname_parts = hostname.split(".")

        self.region = None
        # appsync-apiまたは同様の文字列を含む部分を検索
        for i, part in enumerate(hostname_parts):
            if "appsync-api" in part and i + 1 < len(hostname_parts):
                self.region = hostname_parts[i + 1]
                break

        # リージョンが見つからない場合はデフォルト値を設定
        if not self.region:
            self.region = "us-east-1"

    def publish(self, message: Dict[str, Any]) -> None:
        """メッセージをAppSync EventsのHTTP APIを使用して送信する.

        Args:
            message: 送信するメッセージ
        """
        # PublishRequestを作成
        request_config = {
            "url": self.http_endpoint,
            "region": self.region,
        }

        # 非同期関数は同期的に呼び出す
        request = PublishRequest.signed.__func__(
            appsync_events.PublishRequest,
            request_config,
            self.channel,
            message,
        )

        # リクエスト送信
        response = request.send()

        # エラーチェック
        response.raise_for_status()


class ServiceFactory:
    """アプリケーションのサービスオブジェクトを生成するファクトリークラス.

    依存性注入パターンを実装し、テスト容易性を向上させるために使用します。
    """

    @classmethod
    def create_appsync_events_client(
        cls,
        http_endpoint: str,
        channel: str,
    ) -> AppSyncEventsHTTPClient:
        """AppSync Events HTTPクライアントを作成する.

        Args:
            http_endpoint: AppSync Events HTTP APIエンドポイント
            channel: 使用するチャネル

        Returns:
            AppSync Events HTTPクライアントインスタンス
        """
        return AppSyncEventsHTTPClient(
            http_endpoint=http_endpoint,
            channel=channel,
        )

    @classmethod
    def create_stream_handler(
        cls,
        agent_id: str = None,
        agent_alias_id: str = None,
        session_id: str = None,
        channel: str = None,
        on_stream: Optional[Callable[[Dict[str, Any]], None]] = None,
        logger: Optional[Logger] = None,
        bedrock_client: Any = None,
    ) -> InvokeAgentStreamHandler:
        """ストリームハンドラーを作成する.

        Args:
            agent_id: Bedrock Agent ID
            agent_alias_id: Bedrock Agent Alias ID
            session_id: セッションID
            channel: WebSocketチャネル名
            on_stream: ストリームコールバック関数
            logger: ロガー（設定する場合）
            bedrock_client: Bedrockクライアント（テスト時に注入）

        Returns:
            ストリームハンドラーインスタンス
        """
        handler = InvokeAgentStreamHandler(
            agent_id=agent_id,
            agent_alias_id=agent_alias_id,
            session_id=session_id,
            channel=channel,
            on_stream=on_stream,
            bedrock_client=bedrock_client,
        )

        # カスタムロガーが指定されていれば設定
        if logger:
            handler.logger = logger

        return handler
