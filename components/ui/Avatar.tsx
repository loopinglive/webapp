import { cn, initials } from "@/lib/utils";

// Six accent-family gradients, picked deterministically from the name so the
// same person always keeps the same colour across the session.
const TONES = [
  "from-[#6C47FF] to-[#4A2BE0]",
  "from-[#00D4FF] to-[#6C47FF]",
  "from-[#8B6DFF] to-[#00D4FF]",
  "from-[#FF3B3B] to-[#8B6DFF]",
  "from-[#00C851] to-[#00D4FF]",
  "from-[#6C47FF] to-[#FF3B3B]",
];

function toneFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return TONES[hash % TONES.length];
}

export function Avatar({
  name,
  avatarUrl,
  size = 32,
  className,
}: {
  name: string;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
}) {
  if (avatarUrl) {
    return (
      // Persona avatars come from Cloudinary at arbitrary paths, so a plain img
      // keeps this free of remote-pattern config.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        width={size}
        height={size}
        className={cn("shrink-0 rounded-full object-cover", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white",
        toneFor(name),
        className
      )}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(name)}
    </span>
  );
}
