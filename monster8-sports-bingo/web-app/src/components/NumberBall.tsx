interface NumberBallProps {
  number: number;
  isSuper?: boolean;
  size?: "sm" | "md";
  isAnimated?: boolean;
  delay?: number;
}

export default function NumberBall({
  number,
  isSuper = false,
  size = "md",
  isAnimated = false,
  delay = 0,
}: NumberBallProps) {
  const sizeClass = size === "sm" ? "w-7 h-7 text-xs" : "w-10 h-10 text-sm";
  const baseClass = `${sizeClass} rounded-full flex items-center justify-center font-bold`;
  const colorClass = isSuper
    ? "bg-gradient-to-br from-amber-400 to-yellow-300 text-black ring-2 ring-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.5)]"
    : "bg-amber-600 text-[#faf5f0]";
  const animClass = isAnimated ? "animate-[scale-in_0.3s_ease-out_both]" : "";

  return (
    <span
      className={`${baseClass} ${colorClass} ${animClass}`}
      style={isAnimated ? { animationDelay: `${delay}ms` } : undefined}
    >
      {number}
    </span>
  );
}
