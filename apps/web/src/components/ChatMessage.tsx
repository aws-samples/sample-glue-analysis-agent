import { useState } from "react";
import Markdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";
import type { ChatMessage as ChatMessageType } from "../types";

interface ChatMessageProps {
  message: ChatMessageType;
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  // 画像データを表示する関数
  const renderImages = (images: any[]) => {
    if (!images || images.length === 0) return null;

    return (
      <div className="my-3">
        {images.map((image, index) => {
          const { base64, mimeType = "image/png", fileName = "image" } = image;
          if (base64) {
            return (
              <div key={index} className="mb-3">
                <div className="text-xs text-gray-500 mb-1">{fileName}</div>
                <img
                  src={`data:${mimeType};base64,${base64}`}
                  alt={fileName || "Agent generated image"}
                  className="max-w-full rounded-lg shadow-md"
                  style={{ maxHeight: "400px" }}
                />
              </div>
            );
          }
          return null;
        })}
      </div>
    );
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`flex w-full my-4 ${isUser ? "justify-end" : "justify-start"}`}
      style={{ animation: "fadeIn 0.3s ease-in-out" }}
    >
      <div
        className={`flex max-w-[85%] ${isUser ? "flex-row-reverse" : "flex-row"}`}
      >
        <div
          className={`flex items-center justify-center h-10 w-10 rounded-full shadow-sm ${isUser ? "bg-blue-600 ml-2" : "bg-gray-700 mr-2"}`}
        >
          {isUser ? (
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
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          ) : (
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
          )}
        </div>
        <div
          className={`relative p-4 rounded-lg shadow-sm ${
            isUser
              ? "bg-blue-600 text-blue-50"
              : "bg-white border border-gray-200 text-gray-800"
          }`}
        >
          <div className="relative">
            {/* レンダリングされたマークダウン */}
            <div
              className={`prose prose-sm ${isUser ? "prose-invert brightness-110" : ""}`}
            >
              <Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown>
            </div>

            {/* 画像データがある場合は表示 */}
            {message.images &&
              message.images.length > 0 &&
              renderImages(message.images)}

            <div className="flex justify-between items-center mt-2">
              <p className="text-xs opacity-70">
                {message.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              <button
                onClick={copyToClipboard}
                className={`ml-2 p-1 rounded-full ${
                  isUser
                    ? "hover:bg-blue-700 text-blue-100"
                    : "hover:bg-gray-200 text-gray-500"
                }`}
                title="メッセージをコピー"
              >
                {copied ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>
          {!isUser && (
            <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 rounded-t-lg"></div>
          )}
        </div>
      </div>
    </div>
  );
};
