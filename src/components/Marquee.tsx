interface MarqueeProps {
  text: string;
  className?: string;
  speed?: number;
  variant?: "accent" | "muted";
}

export function Marquee({
  text,
  className = "",
  speed = 25,
  variant = "accent",
}: MarqueeProps) {
  const variants = {
    accent: "bg-ember text-void border-y-2 border-ember",
    muted: "bg-void text-steel border-y border-iron",
  };

  return (
    <div
      className={`overflow-hidden py-4 ${variants[variant]} ${className}`}
    >
      <div
        className="marquee-track"
        style={{ ["--marquee-duration" as string]: `${speed}s` }}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <span
            key={i}
            className="font-display text-xl md:text-3xl tracking-wider whitespace-nowrap px-4"
          >
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}
