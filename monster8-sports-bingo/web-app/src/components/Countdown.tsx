import { useState, useEffect } from "react";

interface CountdownProps {
  secondsLeft: number;
  onExpired?: () => void;
}

export default function Countdown({ secondsLeft, onExpired }: CountdownProps) {
  const [remaining, setRemaining] = useState(secondsLeft);

  useEffect(() => { setRemaining(secondsLeft); }, [secondsLeft]);

  useEffect(() => {
    if (remaining <= 0) { onExpired?.(); return; }
    const timer = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) { onExpired?.(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [remaining, onExpired]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <span className={`text-5xl font-mono font-bold text-amber-400 ${remaining <= 10 ? "animate-[glow-pulse_1s_ease-in-out_infinite]" : ""}`}>
      {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
    </span>
  );
}
