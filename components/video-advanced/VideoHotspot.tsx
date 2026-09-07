export function VideoHotspot({
  x,
  y,
  label,
  link,
  onClick,
}: {
  x: number;
  y: number;
  label: string;
  link: string;
  onClick?: () => void;
}) {
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      role="button"
      style={{ left: `${x}%`, top: `${y}%` }}
      className="absolute z-10 -translate-x-1/2 -translate-y-1/2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
    >
      <span className="relative flex h-6 w-6 items-center justify-center">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/50" />
        <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-white shadow-[0_0_0_3px_rgba(108,71,255,0.6)]" />
      </span>
      <span className="absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/80 px-2.5 py-1 text-[11px] font-medium text-white">
        {label}
      </span>
    </a>
  );
}
