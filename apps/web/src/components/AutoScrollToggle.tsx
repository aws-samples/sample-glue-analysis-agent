interface AutoScrollToggleProps {
  autoScroll: boolean;
  onToggle: () => void;
}

export const AutoScrollToggle = ({
  autoScroll,
  onToggle,
}: AutoScrollToggleProps) => {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
        autoScroll
          ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      }`}
      title={
        autoScroll ? "自動スクロールを無効にする" : "自動スクロールを有効にする"
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
  );
};
