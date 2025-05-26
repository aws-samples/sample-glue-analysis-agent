import type { ReactNode } from "react";

interface ChatHeaderProps {
  onClearChat: () => void;
  autoScroll?: boolean;
  onToggleAutoScroll?: () => void;
  children?: ReactNode;
}

export const ChatHeader = ({
  onClearChat,
  autoScroll,
  onToggleAutoScroll,
  children,
}: ChatHeaderProps) => {
  return (
    <header className="bg-white border-b border-gray-200 py-3 px-4 md:px-6 flex justify-between items-center">
      <div className="flex items-center">
        <h1 className="text-lg font-semibold text-gray-800">
          売上データ分析チャット
        </h1>
      </div>
      <div className="flex items-center space-x-2">
        {autoScroll !== undefined && onToggleAutoScroll && (
          <button
            onClick={onToggleAutoScroll}
            className={`flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              autoScroll
                ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            title={
              autoScroll
                ? "自動スクロールを無効にする"
                : "自動スクロールを有効にする"
            }
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {autoScroll ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              )}
            </svg>
            {autoScroll ? "自動スクロール: ON" : "自動スクロール: OFF"}
          </button>
        )}
        <button
          onClick={onClearChat}
          className="flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 mr-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          クリア
        </button>
        {children}
      </div>
    </header>
  );
};
