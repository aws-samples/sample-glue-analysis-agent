"""WebSocketクライアントモジュール.

AppSync Events WebSocketクライアントを提供します。
"""

import asyncio
import base64
import json
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlparse

import boto3
import websocket
from aws_lambda_powertools import Logger
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest

from src.constants import (
    APPSYNC_EVENTS_HTTP_ENDPOINT,
    APPSYNC_EVENTS_WS_ENDPOINT,
    AWS_REGION,
    WS_CONNECTION_TIMEOUT,
    WS_MAX_WORKERS,
)
from src.utils.log_utils import sanitize_log_message

# Loggerの初期化
logger = Logger(service="websocket_client")


class AppSyncWebSocketClient:
    """AppSync Events WebSocketクライアント."""

    def __init__(self):
        """WebSocketクライアントを初期化します."""
        self.ws_app = None
        self.executor = ThreadPoolExecutor(max_workers=WS_MAX_WORKERS)
        self.connection_established = threading.Event()
        self.ws_thread = None
        self.session = boto3.Session()
        self.credentials = self.session.get_credentials()

        # メッセージ送信の追跡
        self.pending_messages = {}  # リクエストIDをキーとするメッセージ追跡辞書
        self.pending_messages_lock = threading.Lock()  # スレッドセーフな操作のためのロック
        self.all_messages_sent = threading.Event()  # すべてのメッセージが送信されたことを示すイベント
        self.all_messages_sent.set()  # 初期状態ではメッセージがないので、セット状態

    def start(self):
        """WebSocket接続を開始します."""
        if self.ws_thread and self.ws_thread.is_alive():
            logger.info("WebSocket connection is already running")
            return

        if not APPSYNC_EVENTS_WS_ENDPOINT:
            logger.error("APPSYNC_EVENTS_WS_ENDPOINT is not set")
            raise ValueError("APPSYNC_EVENTS_WS_ENDPOINT is not configured")

        logger.info(f"Starting WebSocket connection to {sanitize_log_message(APPSYNC_EVENTS_WS_ENDPOINT)}")

        # WebSocketを別スレッドで開始
        try:
            self.ws_thread = threading.Thread(target=self._start_websocket_thread)
            self.ws_thread.daemon = True
            self.ws_thread.start()
        except Exception as e:
            logger.error(f"Error starting WebSocket thread: {sanitize_log_message(str(e))}")
            raise

        # WebSocket接続が確立されるまで少し待機
        logger.info("Waiting for WebSocket connection to initialize...")
        time.sleep(1)  # 接続確立のために少し待機

    def _start_websocket_thread(self):
        """WebSocketの接続を別スレッドで開始する関数."""
        logger.info(f"AppSync WebSocket endpoint: {sanitize_log_message(APPSYNC_EVENTS_WS_ENDPOINT)}")
        logger.info(f"Region: {sanitize_log_message(AWS_REGION)}")

        # WebSocketサブプロトコルを準備
        subprotocols = ["aws-appsync-event-ws", self._get_auth_subprotocol()]

        # WebSocket接続を作成
        if APPSYNC_EVENTS_WS_ENDPOINT:
            self.ws_app = websocket.WebSocketApp(
                APPSYNC_EVENTS_WS_ENDPOINT,
                on_open=self._on_open,
                on_message=self._on_message,
                on_error=self._on_error,
                on_close=self._on_close,
                subprotocols=subprotocols,
            )
        else:
            logger.error("Cannot create WebSocket: APPSYNC_EVENTS_WS_ENDPOINT is None")
            return

        # WebSocket接続を開始（ブロッキング）
        try:
            self.ws_app.run_forever()
        except Exception as e:
            logger.error(f"WebSocket connection failed: {str(e)}")

    def _get_iam_headers(self, body="{}"):
        """IAM認証用のヘッダーを生成します.

        Args:
            body: リクエストボディ

        Returns:
            dict: 署名付きヘッダー
        """
        if not APPSYNC_EVENTS_HTTP_ENDPOINT:
            logger.error("APPSYNC_EVENTS_HTTP_DNS is not set")
            return {}

        # URLをパース
        url = urlparse(APPSYNC_EVENTS_HTTP_ENDPOINT)

        # ヘッダーを準備
        headers = {
            "accept": "application/json, text/javascript",
            "content-encoding": "amz-1.0",
            "content-type": "application/json; charset=UTF-8",
            "host": url.netloc,
        }

        # リクエストオブジェクトを作成
        request = AWSRequest(
            method="POST",
            url=APPSYNC_EVENTS_HTTP_ENDPOINT,
            data=body,
            headers=headers,
        )

        # SigV4署名を作成
        auth = SigV4Auth(self.credentials, "appsync", AWS_REGION)
        auth.add_auth(request)

        # 署名付きヘッダーを返す
        return dict(request.headers)

    def _base64url_encode(self, data):
        """Base64URL形式にエンコードします.

        Args:
            data: エンコードするデータ

        Returns:
            str: エンコードされた文字列
        """
        return (
            base64.b64encode(data.encode("utf-8")).decode("utf-8").replace("+", "-").replace("/", "_").replace("=", "")
        )

    def _get_auth_subprotocol(self):
        """WebSocket接続ハンドシェイク用のサブプロトコルを生成します.

        Returns:
            str: 認証サブプロトコル
        """
        # 接続ハンドシェイク用の空のリクエストボディ
        empty_body = "{}"

        # IAM認証ヘッダーを取得
        headers = self._get_iam_headers(empty_body)

        # デバッグ出力
        logger.debug(f"Connection headers: {sanitize_log_message(headers)}")

        # ヘッダーをJSON形式に変換してBase64URLエンコード
        auth_header = json.dumps(headers)
        encoded_header = self._base64url_encode(auth_header)

        return f"header-{encoded_header}"

    def _on_open(self, ws):
        """WebSocket接続が開かれたときのハンドラ.

        Args:
            ws: WebSocketオブジェクト
        """
        logger.info("WebSocket connection opened")
        # 接続初期化メッセージを送信
        ws.send(json.dumps({"type": "connection_init"}))

    def _on_message(self, ws, message):
        """WebSocketからメッセージを受信したときのハンドラ.

        Args:
            ws: WebSocketオブジェクト
            message: 受信したメッセージ
        """
        logger.debug(f"Received message: {sanitize_log_message(message)}")
        msg = json.loads(message)

        # connection_ackを受信したら接続確立フラグをセット
        if msg.get("type") == "connection_ack":
            logger.info("Connection established!")
            self.connection_established.set()

    def _on_error(self, ws, error):
        """WebSocketでエラーが発生したときのハンドラ.

        Args:
            ws: WebSocketオブジェクト
            error: エラー
        """
        logger.error(f"WebSocket error occurred: {sanitize_log_message(str(error))}")

    def _on_close(self, ws, close_status_code, close_msg):
        """WebSocket接続が閉じられたときのハンドラ.

        Args:
            ws: WebSocketオブジェクト
            close_status_code: クローズステータスコード
            close_msg: クローズメッセージ
        """
        logger.info(
            f"WebSocket connection closed: {sanitize_log_message(close_status_code)} - {sanitize_log_message(close_msg)}",
        )
        self.connection_established.clear()

        # 再接続を試みる
        logger.info("Attempting to reconnect in 5 seconds...")
        time.sleep(5)
        self.start()

    async def send_message(self, channel, data_dict):
        """非同期でメッセージをWebSocketで送信します.

        Args:
            channel: 送信先チャネル
            data_dict: 送信するデータ

        Returns:
            str: リクエストID、エラーの場合はNone
        """
        # WebSocketが初期化されているか確認
        if self.ws_app is None:
            logger.error("Error: WebSocket connection not initialized")
            return None

        # WebSocket接続が確立されるまで待機（タイムアウト付き）
        if not self.connection_established.is_set():
            logger.info("Waiting for WebSocket connection to be established...")
            try:
                # タイムアウトで接続確立を待機
                await asyncio.get_event_loop().run_in_executor(
                    self.executor,
                    lambda: self.connection_established.wait(WS_CONNECTION_TIMEOUT),
                )
            except asyncio.TimeoutError:
                logger.error("Error: WebSocket connection timeout")
                return None

        # データをJSON文字列に変換
        event_json = json.dumps(data_dict)

        # イベント配列を作成
        events = [event_json]

        # WebSocketメッセージ用のリクエストボディを作成
        request_body = {
            "channel": channel,
            "events": events,
        }

        # 署名計算用の文字列化されたペイロード
        stringified_payload = json.dumps(request_body, separators=(",", ":"))

        # デバッグ出力
        logger.debug(f"Request body for WebSocket: {sanitize_log_message(stringified_payload)}")
        logger.debug(f"Request body for signature: {sanitize_log_message(stringified_payload)}")

        # IAM認証ヘッダーを作成
        auth_headers = await asyncio.get_event_loop().run_in_executor(
            self.executor,
            self._get_iam_headers,
            stringified_payload,
        )

        # ユニークなリクエストIDを生成
        request_id = str(uuid.uuid4())

        # メッセージ送信を追跡
        with self.pending_messages_lock:
            # 送信中のメッセージがなかった場合、all_messages_sentをクリア
            if not self.pending_messages:
                self.all_messages_sent.clear()
            # 送信中のメッセージとして追加
            self.pending_messages[request_id] = {
                "channel": channel,
                "data": data_dict,
                "timestamp": time.time(),
            }

        # WebSocketで送信するパブリッシュメッセージを作成
        publish_msg = {
            "type": "publish",
            "id": request_id,
            "channel": channel,
            "events": events,
            "authorization": auth_headers,
        }

        # メッセージを送信
        ws_message = json.dumps(publish_msg)

        # WebSocketを通じて非同期に送信
        try:
            await asyncio.get_event_loop().run_in_executor(
                self.executor,
                lambda: self.ws_app.send(ws_message)
                if self.ws_app is not None
                else logger.error("Error: WebSocket is None"),
            )

            # 送信完了をマーク
            with self.pending_messages_lock:
                if request_id in self.pending_messages:
                    del self.pending_messages[request_id]
                    # すべてのメッセージが送信完了した場合、イベントをセット
                    if not self.pending_messages:
                        self.all_messages_sent.set()
                        logger.debug("All messages have been sent")

        except Exception as e:
            logger.error(f"Error sending message: {sanitize_log_message(str(e))}")
            # エラー時にもメッセージ追跡から削除
            with self.pending_messages_lock:
                if request_id in self.pending_messages:
                    del self.pending_messages[request_id]
                    # すべてのメッセージが送信完了した場合、イベントをセット
                    if not self.pending_messages:
                        self.all_messages_sent.set()
            return None

        logger.debug(f"Request ID: {sanitize_log_message(request_id)}")
        logger.debug(f"Event published: {sanitize_log_message(json.dumps(publish_msg))}")

        return request_id

    async def wait_for_all_messages_sent(self, timeout=None):
        """すべてのメッセージが送信されるのを待機します.

        Args:
            timeout: タイムアウト（秒）。Noneの場合は無限に待機

        Returns:
            bool: すべてのメッセージが送信された場合はTrue、タイムアウトした場合はFalse
        """
        logger.info("Waiting for all WebSocket messages to be sent...")

        try:
            # all_messages_sentイベントが設定されるのを待機
            result = await asyncio.get_event_loop().run_in_executor(
                self.executor,
                lambda: self.all_messages_sent.wait(timeout),
            )

            if result:
                logger.info("All WebSocket messages have been sent successfully")
            else:
                # タイムアウトした場合、残っているメッセージをログに出力
                with self.pending_messages_lock:
                    pending_count = len(self.pending_messages)
                    logger.warning(f"Timeout waiting for {pending_count} WebSocket messages to be sent")

                    # 残っているメッセージの詳細をログに出力
                    for req_id, msg_info in self.pending_messages.items():
                        channel = msg_info.get("channel", "unknown")
                        timestamp = msg_info.get("timestamp", 0)
                        elapsed = time.time() - timestamp
                        logger.warning(
                            f"Pending message: ID={sanitize_log_message(req_id)}, Channel={sanitize_log_message(channel)}, Elapsed={elapsed:.2f}s",
                        )

            return result
        except Exception as e:
            logger.error(f"Error waiting for WebSocket messages: {sanitize_log_message(str(e))}")
            return False


# シングルトンインスタンス
ws_client = AppSyncWebSocketClient()
