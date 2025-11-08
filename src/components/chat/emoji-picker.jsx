"use client";

const COMMON_EMOJIS = [
  "👍", "❤️", "😂", "😮", "😢", "🎉", "🚀", "👏",
  "🔥", "💯", "✅", "⭐", "💡", "🤔", "👀", "💪",
  "🙌", "🎯", "✨", "💼", "📈", "🏆", "👌", "🙏",
];

export default function EmojiPicker({ onSelect, onClose }) {
  return (
    <div className="relative">
      {/* Overlay */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      
      {/* Picker */}
      <div className="relative z-50 bg-neutral-900 border border-neutral-800 rounded-lg p-3 shadow-xl w-64">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold">Pick a reaction</span>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-8 gap-1">
          {COMMON_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => onSelect(emoji)}
              className="p-2 hover:bg-neutral-800 rounded text-xl"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
