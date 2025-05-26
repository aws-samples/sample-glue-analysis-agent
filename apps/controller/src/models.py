"""データモデルの定義モジュール."""

from typing import Literal, TypedDict, Union


class TextContent(TypedDict):
    """テキストメッセージのコンテンツ."""
    text: str


class ImageContent(TypedDict):
    """イメージメッセージのコンテンツ."""
    base64: str
    mimeType: str
    fileName: str


class TextMessageChunk(TypedDict):
    """テキストメッセージ."""
    messageId: str
    type: Literal["text"]
    content: TextContent
    chunkNumber: int


class ImageMessageChunk(TypedDict):
    """イメージメッセージ."""
    messageId: str
    type: Literal["image"]
    content: ImageContent
    chunkNumber: int


# MessageChunkはTextMessageまたはImageMessageのいずれか
MessageChunk = Union[TextMessageChunk, ImageMessageChunk]
