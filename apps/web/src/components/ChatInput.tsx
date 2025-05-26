import { type FormEvent, useEffect, useRef, useState } from "react";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

export const ChatInput = ({ onSendMessage, isLoading }: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // テキストエリアの高さを自動調整
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [message]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message);
      setMessage("");
      // 送信後にテキストエリアの高さをリセット
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  // Enterキーで送信（Shift+Enterで改行）
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as FormEvent);
    }
  };

  // サンプルクエリ
  const sampleQueries = [
    "2021年の四半期ごとの売上を製品別に分析して",
    "2018年の売上トップ10の顧客は？",
    "地域別の売上成長率を2018年と2020年で比較して",
  ];

  const handleSampleQuery = (query: string) => {
    setMessage(query);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white">
      {/* サンプルクエリ表示エリア */}
      {message.length === 0 && !isLoading && (
        <div className="px-4 py-2 flex flex-wrap gap-2">
          {sampleQueries.map((query, index) => (
            <button
              key={index}
              onClick={() => handleSampleQuery(query)}
              className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full hover:bg-blue-100 transition-colors"
            >
              {query}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end p-4">
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="メッセージを入力..."
            disabled={isLoading}
            rows={1}
            className="w-full p-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
          <div className="absolute right-3 bottom-3 text-xs text-gray-400">
            {isLoading ? "" : "Shift+Enter で改行"}
          </div>
        </div>
        <button
          type="submit"
          disabled={!message.trim() || isLoading}
          className={`ml-2 p-3 rounded-lg flex items-center justify-center min-w-[48px] transition-all ${
            !message.trim() || isLoading
              ? "bg-gray-300 text-gray-500"
              : "bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg"
          }`}
        >
          {isLoading ? (
            <div
              className="h-5 w-5 border-2 border-t-transparent border-white rounded-full"
              style={{ animation: "spin 1s linear infinite" }}
            ></div>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          )}
        </button>
      </form>
    </div>
  );
};
