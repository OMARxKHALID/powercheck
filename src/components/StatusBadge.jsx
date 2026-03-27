import { cn } from "@/lib/utils";
import { getStatusConfig } from "@/lib/constants";

export default function StatusBadge({ status, className }) {
  const cfg = getStatusConfig(status);
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium", cfg.bg, cfg.color, cfg.border, className)}>
      {status ?? "Unknown"}
    </span>
  );
}
