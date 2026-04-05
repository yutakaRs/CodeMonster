interface BingoBoardProps {
  selectedNumbers: number[];
  onToggle: (num: number) => void;
  maxSelections?: number;
  disabled?: boolean;
}

export default function BingoBoard({
  selectedNumbers,
  onToggle,
  maxSelections,
  disabled = false,
}: BingoBoardProps) {
  const isFull = maxSelections !== undefined && selectedNumbers.length >= maxSelections;

  return (
    <div className="grid grid-cols-10 gap-1 max-w-md mx-auto">
      {Array.from({ length: 80 }, (_, i) => i + 1).map((num) => {
        const isSelected = selectedNumbers.includes(num);
        const isDisabled = disabled || (!isSelected && isFull);

        return (
          <button
            key={num}
            onClick={() => !isDisabled && onToggle(num)}
            disabled={isDisabled}
            className={`w-full aspect-square rounded text-xs font-bold transition-all ${
              isSelected
                ? "bg-amber-500 text-black scale-110 shadow-[0_0_8px_rgba(245,158,11,0.4)]"
                : isDisabled
                  ? "bg-[#2a2220] text-[#5a4f4b] cursor-not-allowed"
                  : "bg-[#3d3330] text-[#a89890] hover:bg-[#4a3f3b] hover:text-[#faf5f0] cursor-pointer"
            }`}
          >
            {num}
          </button>
        );
      })}
    </div>
  );
}
