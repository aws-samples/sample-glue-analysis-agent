"""定数定義モジュール."""

import os

# AppSync Events関連
APPSYNC_EVENTS_HTTP_DNS = os.environ.get("APPSYNC_EVENTS_HTTP_DNS")
APPSYNC_EVENTS_REALTIME_DNS = os.environ.get("APPSYNC_EVENTS_REALTIME_DNS")

# AppSync WebSocket関連
APPSYNC_EVENTS_HTTP_ENDPOINT = f"https://{APPSYNC_EVENTS_HTTP_DNS}/event" if APPSYNC_EVENTS_HTTP_DNS else None
APPSYNC_EVENTS_WS_ENDPOINT = f"wss://{APPSYNC_EVENTS_REALTIME_DNS}/event/realtime" if APPSYNC_EVENTS_REALTIME_DNS else None

# チャネル名は正規表現 /^\/?[A-Za-z0-9](?:[A-Za-z0-9-]{0,48}[A-Za-z0-9])?(?:\/[A-Za-z0-9](?:[A-Za-z0-9-]{0,48}[A-Za-z0-9])?){0,4}\/?$/ に準拠する必要がある
# 例: "namespace", "namespace/segment", "/namespace/segment" など
APPSYNC_EVENTS_CHANNEL_NAMESPACE = os.environ.get("APPSYNC_EVENTS_CHANNEL_NAMESPACE", "chat")
AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")  # AWS リージョン

# WebSocket設定
WS_CONNECTION_TIMEOUT = 10  # WebSocket接続タイムアウト（秒）
WS_MAX_WORKERS = 5  # WebSocketスレッドプールの最大ワーカー数
WS_SEND_TIMEOUT = 30  # WebSocketメッセージ送信完了待機タイムアウト（秒）

# Bedrock関連
AGENT_ID = os.environ.get("SALES_ANALYSIS_AGENT_ID")
AGENT_ALIAS_ID = os.environ.get("SALES_ANALYSIS_AGENT_ALIAS_ID")
