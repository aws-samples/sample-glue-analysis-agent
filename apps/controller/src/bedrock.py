"""Bedrock Agent クライアントとヘルパー関数."""

import logging
from typing import Any, Dict, Generator

import boto3  # type: ignore
from botocore.config import Config
from botocore.exceptions import ClientError  # type: ignore
from src.utils.log_utils import sanitize_log_message

logger = logging.getLogger(__name__)


class InvokeAgentException(Exception):
    """Bedrock Agent呼び出し例外."""

    pass


def get_bedrock_agent_runtime_client():
    """Bedrock Agent Runtimeクライアントを取得する.

    Returns:
        boto3.client: Bedrock Agent Runtimeクライアント
    """
    config = Config(read_timeout=1000)
    return boto3.client("bedrock-agent-runtime", config=config)


def invoke_agent_streaming(
    client,
    agent_id: str,
    agent_alias_id: str,
    session_id: str,
    input_text: str,
    enable_trace: bool = False,
) -> Generator[Dict[str, Any], None, None]:
    """Bedrock Agentをストリーミングモードで呼び出す.

    Args:
        client: Bedrock Agent Runtimeクライアント
        agent_id: エージェントID
        agent_alias_id: エージェントエイリアスID
        session_id: セッションID
        input_text: 入力テキスト
        enable_trace: トレース有効フラグ

    Yields:
        ストリーミングレスポンスのチャンク

    Raises:
        InvokeAgentException: Agentの呼び出しに失敗した場合
    """
    try:
        logger.info(f"Invoking agent {sanitize_log_message(agent_id)}/{sanitize_log_message(agent_alias_id)} with session {sanitize_log_message(session_id)}")

        # invoke_agent メソッドを使用
        response = client.invoke_agent(
            agentId=agent_id,
            agentAliasId=agent_alias_id,
            sessionId=session_id,
            inputText=input_text,
            enableTrace=enable_trace,
            streamingConfigurations={
                "applyGuardrailInterval": 100,  # チャンクごとにガードレールを適用
                "streamFinalResponse": True,  # 最終レスポンスもストリーミング
            },
        )

        # レスポンスからcompletionイベントストリームを取得
        completion_stream = response.get("completion")
        if not completion_stream:
            raise InvokeAgentException("completionデータがありません")

        # イベントストリームを処理
        for event in completion_stream:
            logger.debug(f"Received event: {sanitize_log_message(str(event))}")

            # files イベントの処理
            if "files" in event:
                print("Files data detected in response")
                yield {"files": event["files"]}
                
            # chunk イベントの処理
            elif "chunk" in event:
                chunk = event["chunk"]
                yield chunk

            # trace イベントの処理
            if "trace" in event:
                logger.debug(f"Trace info: {sanitize_log_message(str(event['trace']))}")

            # エラーの処理
            if any(
                error_key in event
                for error_key in [
                    "accessDeniedException",
                    "badGatewayException",
                    "conflictException",
                    "dependencyFailedException",
                    "internalServerException",
                    "modelNotReadyException",
                    "resourceNotFoundException",
                    "serviceQuotaExceededException",
                    "throttlingException",
                    "validationException",
                ]
            ):
                # エラー情報の抽出
                for error_key in event:
                    if error_key.endswith("Exception"):
                        raise InvokeAgentException(f"Bedrock Agent エラー: {error_key}")

    except ClientError as e:
        logger.error(f"Bedrock Agent呼び出しエラー: {sanitize_log_message(str(e))}")
        error_code = e.response.get("Error", {}).get("Code", "Unknown")
        error_msg = e.response.get("Error", {}).get("Message", str(e))
        raise InvokeAgentException(f"{error_code}: {error_msg}") from e
    except (ValueError, KeyError, AttributeError) as e:
        logger.error(f"予期せぬエラー: {sanitize_log_message(str(e))}")
        raise InvokeAgentException(f"予期せぬエラー: {str(e)}") from e


def get_agent_description(client, agent_id: str) -> str:
    """Agentの説明を取得する.

    Args:
        client: Bedrock Agentクライアント（非ランタイム）
        agent_id: エージェントID

    Returns:
        エージェントの説明
    """
    try:
        response = client.get_agent(agentId=agent_id)
        return response.get("agent", {}).get("description", "Bedrock Agent")
    except (ClientError, ValueError, KeyError, AttributeError) as e:
        logger.error(f"エージェント説明取得エラー: {sanitize_log_message(str(e))}")
        return "Bedrock Agent"
