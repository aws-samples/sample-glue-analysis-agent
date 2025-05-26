import asyncio
import json
import os
import uuid
from typing import Any, Set

import boto3
from aws_lambda_powertools import Logger
from aws_lambda_powertools.event_handler import AppSyncEventsResolver
from aws_lambda_powertools.utilities.typing import LambdaContext

from src.bedrock import get_bedrock_agent_runtime_client, invoke_agent_streaming
from src.constants import WS_SEND_TIMEOUT
from src.models import ImageMessageChunk, TextMessageChunk
from src.utils.log_utils import sanitize_log_message
from src.websocket_client import ws_client

# Loggerの初期化
logger = Logger(service="controller")

app = AppSyncEventsResolver()

# Lambda起動時にWebSocket接続を初期化
ws_client.start()


# 画像データを処理して送信する関数
async def process_and_send_image(
    base64_data: str,
    mime_type: str,
    file_name: str,
    message_id: str,
    stream_id: str,
    sent_images: Set[str],
    chunk_number: int,
) -> bool:
    """画像データを処理して送信する関数

    Args:
        base64_data: Base64エンコードされた画像データ
        mime_type: 画像のMIMEタイプ
        file_name: ファイル名
        message_id: メッセージID
        stream_id: ストリームID
        sent_images: 送信済み画像を追跡するセット
        chunk_number: チャンク番号

    Returns:
        bool: 画像が送信された場合はTrue、重複で送信されなかった場合はFalse
    """
    # 画像の一意のキーを作成（base64の先頭部分を使用）
    image_key = base64_data[:100] if base64_data else None

    # 既に送信済みの画像はスキップ
    if image_key and image_key in sent_images:
        logger.debug(f"Skipping duplicate image: {sanitize_log_message(file_name)}")
        return False

    # 画像を送信済みとしてマーク
    if image_key:
        sent_images.add(image_key)

    # 画像メッセージを作成
    image_message: ImageMessageChunk = {
        "messageId": message_id,
        "type": "image",
        "content": {
            "base64": base64_data,
            "mimeType": mime_type,
            "fileName": file_name,
        },
        "chunkNumber": chunk_number,
    }

    # WebSocketを通じて画像データを送信
    # amazonq-ignore-next-line
    channel = f"/stream/{stream_id}"
    try:
        request_id = await ws_client.send_message(channel, image_message)
        if request_id:
            logger.info(
                f"Image data sent: {sanitize_log_message(file_name)}, request_id: {sanitize_log_message(request_id)}",
            )
            return True
        else:
            logger.error(f"Failed to send image data: {sanitize_log_message(file_name)}")
            return False
    except Exception as e:
        logger.error(
            f"Error sending image data: {sanitize_log_message(file_name)}, error: {sanitize_log_message(str(e))}",
        )
        return False


@app.on_subscribe("/stream/*")
def handle_stream_subscription():
    lambda_event = app.current_event
    user_id = lambda_event["identity"]["claims"]["sub"]

    return user_id == lambda_event["info"]["channel"]["segments"][-1]


@app.on_publish("/control/query")
def handle_control_publish(payload: dict[str, Any]):
    # boto3セッションを作成
    session = boto3.Session()
    credentials = session.get_credentials()

    logger.info(f"Received payload: {sanitize_log_message(json.dumps(payload))}")
    logger.info(f"Stream ID: {sanitize_log_message(payload['event']['streamId'])}")

    # 環境変数からBedrockのエージェントIDとエイリアスIDを取得
    agent_id = os.environ.get("SALES_ANALYSIS_AGENT_ID")
    agent_alias_id = os.environ.get("SALES_ANALYSIS_AGENT_ALIAS_ID")

    if not agent_id or not agent_alias_id:
        logger.error("SALES_ANALYSIS_AGENT_ID or SALES_ANALYSIS_AGENT_ALIAS_ID not set")
        return {
            "processed": False,
            "error": "Agent ID or Alias ID not configured",
        }

    # ユーザーからのクエリを取得
    user_query = payload["event"]["content"]
    stream_id = payload["event"]["streamId"]
    session_id = str(uuid.uuid4())  # セッションIDを生成

    # Bedrock Agent Runtimeクライアントを取得
    bedrock_client = get_bedrock_agent_runtime_client()

    # 送信済み画像を追跡するセット
    sent_images = set()

    try:
        # 一回の回答に対して同じmessageIdを使用
        response_message_id = str(uuid.uuid4())
        logger.info(f"Generated message ID for response: {sanitize_log_message(response_message_id)}")

        # チャンク番号のカウンター
        chunk_counter = 0

        # invoke_agent_streamingを呼び出し、ストリーミングレスポンスを取得
        for chunk in invoke_agent_streaming(
            client=bedrock_client,
            agent_id=agent_id,
            agent_alias_id=agent_alias_id,
            session_id=session_id,
            input_text=user_query,
            enable_trace=False,
        ):
            # チャンクの内容をデバッグ出力
            logger.debug(f"Received chunk: {sanitize_log_message(str(chunk))}")

            # チャンクからテキスト内容を取得
            # Bedrock Agent Runtimeのレスポンス形式に合わせて調整
            chunk_text = None

            # ファイルデータの処理
            if isinstance(chunk, dict) and "files" in chunk:
                logger.debug("Processing files data")
                files_data = chunk["files"]

                # filesキーの中にfilesキーがある場合
                if isinstance(files_data, dict) and "files" in files_data:
                    file_list = files_data["files"]

                    for file_item in file_list:
                        if "bytes" in file_item and "type" in file_item and "name" in file_item:
                            # バイトデータをBase64エンコード
                            import base64

                            file_bytes = file_item["bytes"]
                            if isinstance(file_bytes, bytes):
                                base64_data = base64.b64encode(file_bytes).decode("utf-8")
                            else:
                                # すでにBase64エンコードされている場合
                                base64_data = file_bytes

                            # MIMEタイプと名前を取得
                            mime_type = file_item["type"]
                            file_name = file_item["name"]

                            # チャンク番号をインクリメント
                            chunk_counter += 1

                            # 共通関数を使用して画像を処理・送信
                            asyncio.run(
                                process_and_send_image(
                                    base64_data=base64_data,
                                    mime_type=mime_type,
                                    file_name=file_name,
                                    message_id=response_message_id,
                                    stream_id=stream_id,
                                    sent_images=sent_images,
                                    chunk_number=chunk_counter,
                                ),
                            )

                # 画像データを処理したので、このチャンクはスキップ
                continue

            # テキストデータの処理
            elif isinstance(chunk, dict) and "bytes" in chunk:
                # バイト形式をデコード
                try:
                    chunk_text = chunk["bytes"].decode("utf-8")
                except (UnicodeDecodeError, AttributeError) as e:
                    logger.error(f"Failed to decode bytes content: {sanitize_log_message(str(e))}")
                    # デコードに失敗した場合は、バイト列を文字列として表示
                    try:
                        chunk_text = str(chunk["bytes"])
                        logger.debug(f"Using string representation: {sanitize_log_message(chunk_text)}")
                    except Exception as str_err:
                        logger.error(f"Failed to convert bytes to string: {sanitize_log_message(str(str_err))}")

            # チャンクのテキストを処理
            if chunk_text:
                # JSONオブジェクトかどうかを確認
                try:
                    # JSONオブジェクトの場合は解析
                    json_data = json.loads(chunk_text)
                    if isinstance(json_data, dict) and json_data.get("type") == "image":
                        # チャンク番号をインクリメント
                        chunk_counter += 1

                        # 画像データの場合、共通関数を使用して処理・送信
                        asyncio.run(
                            process_and_send_image(
                                base64_data=json_data["data"].get("base64", ""),
                                mime_type=json_data["data"].get("mimeType", "image/png"),
                                file_name=json_data["data"].get("fileName", "image"),
                                message_id=response_message_id,
                                stream_id=stream_id,
                                sent_images=sent_images,
                                chunk_number=chunk_counter,
                            ),
                        )
                        # 画像を処理したので、このチャンクはスキップ
                        continue
                    else:
                        # チャンク番号をインクリメント
                        chunk_counter += 1

                        # 通常のJSONデータの場合
                        text_message: TextMessageChunk = {
                            "messageId": response_message_id,
                            "type": "text",
                            "content": {
                                "text": chunk_text,
                            },
                            "chunkNumber": chunk_counter,
                        }
                except (json.JSONDecodeError, ValueError):
                    # チャンク番号をインクリメント
                    chunk_counter += 1

                    # 通常のテキストの場合
                    text_message: TextMessageChunk = {
                        "messageId": response_message_id,
                        "type": "text",
                        "content": {
                            "text": chunk_text,
                        },
                        "chunkNumber": chunk_counter,
                    }

                # WebSocketを通じてテキストメッセージを送信
                try:
                    channel = f"/stream/{stream_id}"
                    asyncio.run(ws_client.send_message(channel, text_message))
                except Exception as e:
                    logger.error(f"Error sending chunk: {sanitize_log_message(str(e))}")
            else:
                logger.debug("Skipping null chunk")

        return {
            "processed": True,
            "original_payload": payload,
            "publish_status": "completed",
        }
    except Exception as e:
        logger.error(f"Error invoking Bedrock Agent: {sanitize_log_message(str(e))}")

        # エラーメッセージをクライアントに送信
        error_message_id = str(uuid.uuid4())

        # エラーメッセージを作成
        error_message: TextMessageChunk = {
            "messageId": error_message_id,
            "type": "text",
            "content": {
                "text": f"エラーが発生しました: {sanitize_log_message(str(e))}",
            },
            "chunkNumber": 1,  # エラーメッセージは常に1
        }

        try:
            # WebSocketを通じてエラーメッセージを送信
            channel = f"/stream/{stream_id}"
            asyncio.run(ws_client.send_message(channel, error_message))
        except Exception as send_error:
            logger.error(f"Error sending error message: {sanitize_log_message(str(send_error))}")

        return {
            "processed": False,
            "error": sanitize_log_message(str(e)),
        }


def lambda_handler(event: dict, context: LambdaContext):
    # AppSyncEventsResolverを使用してイベントを処理
    result = app.resolve(event, context)

    # すべてのWebSocketメッセージが送信されるのを待機
    logger.info("Waiting for all WebSocket messages to be sent before Lambda completion")
    asyncio.run(ws_client.wait_for_all_messages_sent(timeout=WS_SEND_TIMEOUT))

    return result
