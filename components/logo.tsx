type LogoProps = {
  className?: string;
};

export function Logo({ className }: LogoProps) {
  return (
    <span className={`font-bold tracking-tight ${className ?? ""}`}>
      <span className="text-white">radio</span>
      <span className="text-brand">On</span>
    </span>
  );
}
