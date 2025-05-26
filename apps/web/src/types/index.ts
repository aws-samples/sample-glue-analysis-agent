export interface Image {
  base64: string;
  mimeType: string;
  fileName: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  // 追加フィールド
  images?: Image[];
  messageId?: string; // 同じメッセージをグループ化するためのID
  chunks?: MessageChunk[]; // メッセージチャンクの配列
}

/**
 * AppSync Events WebSocketのイベントタイプ
 */
export enum EventType {
  // クライアントからの操作
  CONNECTION_INIT = "connection_init",
  SUBSCRIBE = "subscribe",
  UNSUBSCRIBE = "unsubscribe",
  PUBLISH = "publish",

  // サーバーからの応答
  CONNECTION_ACK = "connection_ack",
  KEEP_ALIVE = "ka",
  SUBSCRIBE_SUCCESS = "subscribe_success",
  SUBSCRIBE_ERROR = "subscribe_error",
  DATA = "data",
  UNSUBSCRIBE_SUCCESS = "unsubscribe_success",
  UNSUBSCRIBE_ERROR = "unsubscribe_error",
  PUBLISH_SUCCESS = "publish_success",
  PUBLISH_ERROR = "publish_error",
  BROADCAST_ERROR = "broadcast_error",
}

/**
 * AppSync Events WebSocketから受信するデータメッセージの型
 */
// サーバーから送られてくるメッセージの型定義
export interface TextContent {
  text: string;
}

export interface ImageContent {
  base64: string;
  mimeType: string;
  fileName: string;
}

export interface TextMessageChunk {
  messageId: string;
  type: "text";
  content: TextContent;
  chunkNumber: number;
}

export interface ImageMessageChunk {
  messageId: string;
  type: "image";
  content: ImageContent;
  chunkNumber: number;
}

export type MessageChunk = TextMessageChunk | ImageMessageChunk;

export interface WebSocketDataMessage {
  type: EventType.DATA;
  id: string;
  event: string | MessageChunk;
}
