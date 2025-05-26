import { useEffect, useRef, useState } from "react";
import { AuthButton } from "./components/AuthButton";
import { AuthGuard } from "./components/AuthGuard";
import { ChatHeader } from "./components/ChatHeader";
import { ChatInput } from "./components/ChatInput";
import { ChatMessage } from "./components/ChatMessage";
import { useAuth } from "./contexts/AuthContext";
import { useChat } from "./hooks/useChat";

function App() {
  const { messages, isLoading, error, sendMessage, clearChat } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user, signOut } = useAuth();
  const [autoScroll, setAutoScroll] = useState(true);

  // 新しいメッセージが追加されたら条件付きで自動スクロール
  useEffect(() => {
    if (autoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, autoScroll]);

  // 自動スクロールの切り替え
  const toggleAutoScroll = () => {
    setAutoScroll((prev) => !prev);
  };

  // ログアウト時にチャットをクリアする
  const handleClearChat = () => {
    clearChat();
  };

  // ログアウト処理
  const handleSignOut = async () => {
    clearChat(); // セッションIDを破棄
    await signOut(); // ログアウト
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <ChatHeader
        onClearChat={handleClearChat}
        autoScroll={autoScroll}
        onToggleAutoScroll={toggleAutoScroll}
      >
        <AuthButton />
      </ChatHeader>

      <AuthGuard>
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full">
                <div className="flex justify-center mb-6">
                  <div className="bg-blue-600 p-4 rounded-full">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-12 w-12 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  </div>
                </div>
                <h2 className="text-xl font-bold text-center text-gray-800 mb-2">
                  売上データ分析チャット
                </h2>
                <p className="text-center text-gray-600 mb-6">
                  自然言語で売上データについて質問できます
                </p>

                <div className="space-y-4">
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                    <h3 className="font-medium text-blue-800 mb-2">質問例:</h3>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-start">
                        <span className="text-blue-500 mr-2">•</span>
                        <span>2021年の四半期ごとの売上を製品別に分析して</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-500 mr-2">•</span>
                        <span>2018年の売上トップ10の顧客は？</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-500 mr-2">•</span>
                        <span>
                          地域別の売上成長率を2018年と2020年で比較して
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2 max-w-4xl mx-auto">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}

              {/* ローディング中のアニメーション */}
              {isLoading && (
                <div className="flex w-full my-4 justify-start">
                  <div className="flex flex-row">
                    <div className="flex items-center justify-center h-10 w-10 rounded-full shadow-sm bg-gray-700 mr-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <div className="relative p-4 rounded-lg shadow-sm bg-white border border-gray-200 text-gray-800">
                      <div className="flex items-center justify-center h-8 w-8">
                        <svg
                          className="w-6 h-6 animate-spin"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                      </div>
                      <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 rounded-t-lg"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-md my-4 max-w-4xl mx-auto">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-500"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">エラーが発生しました</p>
                  <p className="text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <ChatInput onSendMessage={sendMessage} isLoading={isLoading} />
      </AuthGuard>
    </div>
  );
}

export default App;
