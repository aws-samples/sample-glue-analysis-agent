import { events, type EventsChannel } from "aws-amplify/data";
import { useCallback, useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useAuth } from "../contexts/AuthContext";
import type {
  ChatMessage,
  Image,
  MessageChunk,
  TextMessageChunk,
  ImageMessageChunk,
  WebSocketDataMessage,
} from "../types";
import { sanitizeLogMessage } from "../utils/log_utils";

export const useChat = () => {
  const queryChannelRef = useRef<EventsChannel | null>(null);
  const [streamId, setStreamId] = useState<string | null>(null);
  const streamChannelRef = useRef<EventsChannel | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isChannelReady, setIsChannelReady] = useState(false);
  const isConnectingRef = useRef(false);
  const { isAuthenticated, refreshSession, user } = useAuth();

  // AppSync Eventsに接続する
  const connectToChannels = useCallback(async () => {
    // 既に接続中の場合は処理をスキップ
    if (isConnectingRef.current || !isAuthenticated || !user) {
      return;
    }

    try {
      isConnectingRef.current = true;

      // 既存の接続を閉じる
      if (queryChannelRef.current || streamChannelRef) {
        closeChannels();
      }

      // 認証情報を更新
      await refreshSession();

      // userIdをストリームIDとして使用
      setStreamId(user.userId);
      queryChannelRef.current = await events.connect("/control/query");
      streamChannelRef.current = await events.connect(`/stream/${user.userId}`);
      console.log("Connected to AppSync Events");
      setIsChannelReady(true);
    } catch (err) {
      console.error("Error connecting to AppSync Events:", err);
      setError("AppSync Eventsへの接続に失敗しました");
      setIsChannelReady(false);
    } finally {
      isConnectingRef.current = false;
    }
  }, [isAuthenticated, refreshSession, user]);

  // AppSync Events接続を閉じる
  const closeChannels = useCallback(() => {
    if (queryChannelRef.current) {
      console.log("Closing query channel");
      queryChannelRef.current.close();
      queryChannelRef.current = null;
    }
    if (streamChannelRef.current) {
      console.log("Closing stream channel");
      streamChannelRef.current.close();
      streamChannelRef.current = null;
    }
    setIsChannelReady(false);
  }, []);

  // コンポーネントのマウント時にチャンネルに接続し、アンマウント時に接続を閉じる
  useEffect(() => {
    // コンポーネントマウント時に一度だけ実行
    if (isAuthenticated) {
      connectToChannels();
    }

    // クリーンアップ関数
    return () => {
      closeChannels();
    };
  }, [isAuthenticated]);

  // streamChannelRefをsubscribeして、メッセージを受信したらmessagesに追加または更新する
  useEffect(() => {
    if (!streamChannelRef.current || !streamId) {
      return;
    }
    const subscription = streamChannelRef.current.subscribe({
      next: (data: WebSocketDataMessage) => {
        // eventがオブジェクトの場合の処理
        if (typeof data.event === "object" && data.event !== null) {
          const messageChunk = data.event as MessageChunk;
          const messageId = messageChunk.messageId;
          let content = "";
          let image: Image | undefined = undefined;

          // メッセージタイプに応じて処理
          if (messageChunk.type === "text") {
            content = messageChunk.content.text;
          } else if (messageChunk.type === "image") {
            // 画像の場合はimageを設定
            image = {
              base64: messageChunk.content.base64,
              mimeType: messageChunk.content.mimeType,
              fileName: messageChunk.content.fileName,
            };
          }

          setMessages((prev) => {
            // messageIdが存在し、同じmessageIdを持つメッセージが既に存在する場合は更新
            if (messageId && prev.some((msg) => msg.messageId === messageId)) {
              // loading状態を解除（メッセージの更新中）
              setIsLoading(false);

              return prev.map((msg) => {
                if (msg.messageId === messageId) {
                  // このメッセージに関連する既存のチャンクを取得
                  const existingChunks = msg.chunks || [];

                  // 新しいチャンクを追加（または既存のチャンクを更新）
                  let updatedChunks = [...existingChunks];
                  const chunkIndex = updatedChunks.findIndex(
                    (chunk) => chunk.chunkNumber === messageChunk.chunkNumber
                  );

                  if (chunkIndex >= 0) {
                    // 既存のチャンクを更新
                    updatedChunks[chunkIndex] = messageChunk;
                  } else {
                    // 新しいチャンクを追加
                    updatedChunks.push(messageChunk);
                  }

                  // チャンク番号でソート
                  updatedChunks.sort((a, b) => a.chunkNumber - b.chunkNumber);

                  if (messageChunk.type === "text") {
                    // テキストチャンクを番号順に結合
                    const sortedContent = updatedChunks
                      .filter((chunk) => chunk.type === "text")
                      .map((chunk) => (chunk as TextMessageChunk).content.text)
                      .join("");

                    return {
                      ...msg,
                      content: sortedContent,
                      chunks: updatedChunks,
                      timestamp: new Date(), // タイムスタンプを更新
                    };
                  } else if (messageChunk.type === "image" && image) {
                    // 画像チャンクから画像配列を作成
                    const images = updatedChunks
                      .filter((chunk) => chunk.type === "image")
                      .map((chunk) => ({
                        base64: (chunk as ImageMessageChunk).content.base64,
                        mimeType: (chunk as ImageMessageChunk).content.mimeType,
                        fileName: (chunk as ImageMessageChunk).content.fileName,
                      }));

                    // テキストチャンクを番号順に結合
                    const textChunks = updatedChunks
                      .filter((chunk) => chunk.type === "text")
                      .map((chunk) => (chunk as TextMessageChunk).content.text);

                    return {
                      ...msg,
                      content: textChunks.join(""),
                      chunks: updatedChunks,
                      timestamp: new Date(), // タイムスタンプを更新
                      images: images,
                    };
                  }
                }
                return msg;
              });
            } else {
              // 新しいメッセージを追加
              const chunks = [messageChunk];
              const newMessage: ChatMessage = {
                id: uuidv4(),
                role: "assistant",
                content: content,
                timestamp: new Date(),
                images: image ? [image] : undefined,
                messageId: messageId, // messageIdがあれば設定
                chunks: chunks, // チャンク配列を追加
              };

              // 新しいメッセージが追加されたらloading状態を解除
              setIsLoading(false);

              return [...prev, newMessage];
            }
          });
        }
        // eventが文字列の場合の処理（必要に応じて）
        else if (typeof data.event === "string") {
          try {
            // 文字列がJSONの場合はパースを試みる
            const parsedEvent = JSON.parse(data.event);
            const messageId = parsedEvent.messageId;
            const content = parsedEvent.content || data.event;

            // visualDataからimagesへの変換
            let images: Image[] | undefined = undefined;
            if (
              parsedEvent.visualData &&
              parsedEvent.visualData.type === "image" &&
              parsedEvent.visualData.data
            ) {
              const imageData = parsedEvent.visualData.data;
              images = [
                {
                  base64: imageData.base64,
                  mimeType: imageData.mimeType || "image/png",
                  fileName: imageData.fileName || "image",
                },
              ];
            }

            setMessages((prev) => {
              // messageIdが存在し、同じmessageIdを持つメッセージが既に存在する場合は更新
              if (
                messageId &&
                prev.some((msg) => msg.messageId === messageId)
              ) {
                // loading状態を解除（メッセージの更新中）
                setIsLoading(false);

                return prev.map((msg) => {
                  if (msg.messageId === messageId) {
                    // 既存のメッセージのcontentに新しいcontentを追加
                    const updatedImages =
                      images && images.length > 0
                        ? msg.images
                          ? [...msg.images, ...images]
                          : images
                        : msg.images;

                    return {
                      ...msg,
                      content: msg.content + content,
                      timestamp: new Date(), // タイムスタンプを更新
                      images: updatedImages,
                    };
                  }
                  return msg;
                });
              } else {
                // 新しいメッセージを追加
                const newMessage: ChatMessage = {
                  id: uuidv4(),
                  role: "assistant",
                  content: content,
                  timestamp: new Date(),
                  images: images,
                  messageId: messageId, // messageIdがあれば設定
                };

                // 新しいメッセージが追加されたらloading状態を解除
                setIsLoading(false);

                return [...prev, newMessage];
              }
            });
          } catch (e) {
            // パースに失敗した場合は文字列をそのまま使用
            const newMessage: ChatMessage = {
              id: uuidv4(),
              role: "assistant",
              content: data.event,
              timestamp: new Date(),
            };

            // エラー時もloading状態を解除
            setIsLoading(false);

            setMessages((prev) => [...prev, newMessage]);
          }
        }
      },
      error: (err) => {
        console.error("Error in stream subscription:", sanitizeLogMessage(err));
        setError("ストリームからのメッセージ受信中にエラーが発生しました");
        setIsLoading(false);
      },
    });

    // クリーンアップ関数
    return () => {
      subscription.unsubscribe();
    };
  }, [streamId]);

  // チャット履歴をクリア
  const clearChat = useCallback(() => {
    setMessages([]);
  }, []);

  // メッセージを送信
  const sendMessage = useCallback(
    async (content: string) => {
      try {
        // 認証されていない場合は処理を中止
        if (!isAuthenticated || !user) {
          setError("認証が必要です。ログインしてください。");
          return;
        }

        // チャンネルが準備できていない場合は再接続を試みる
        if (!isChannelReady || !queryChannelRef.current) {
          setError("チャンネルに接続中です。しばらくお待ちください。");
          if (!isConnectingRef.current) {
            connectToChannels();
          }
          return;
        }

        setIsLoading(true);
        setError(null);

        // ユーザーメッセージをチャット履歴に追加
        const userMessage: ChatMessage = {
          id: uuidv4(),
          role: "user",
          content,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMessage]);

        // チャンネルにメッセージを送信
        console.log("Publishing message to query channel");
        try {
          await queryChannelRef.current.publish({
            event: {
              content: content,
              messageId: userMessage.id,
              streamId: streamId,
              timestamp: userMessage.timestamp.toISOString(),
            },
          });
          console.log("Message published successfully");
        } catch (publishErr) {
          console.error("Error publishing message:", publishErr);
          setError("メッセージの送信に失敗しました");
          setIsLoading(false);

          // 送信エラーの場合、チャンネルを再接続
          if (!isConnectingRef.current) {
            connectToChannels();
          }
        }

        // 注: サーバーからの応答はsubscribeで受け取るため、
        // ここではisLoadingをfalseに設定しない
      } catch (err) {
        console.error("Error sending message:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
        setIsLoading(false);
      }
    },
    [connectToChannels, isAuthenticated, isChannelReady, user]
  );

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearChat,
    isAuthenticated,
    isChannelReady,
  };
};
