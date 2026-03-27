export const STATUS_CONFIG = {
  Paid: {
    color:  "text-emerald-700 dark:text-emerald-400",
    bg:     "bg-emerald-50 dark:bg-emerald-500/10",
    border: "border-emerald-200 dark:border-emerald-500/20",
  },
  Unpaid: {
    color:  "text-amber-700 dark:text-amber-400",
    bg:     "bg-amber-50 dark:bg-amber-500/10",
    border: "border-amber-200 dark:border-amber-500/20",
  },
  Overdue: {
    color:  "text-red-700 dark:text-red-400",
    bg:     "bg-red-50 dark:bg-red-500/10",
    border: "border-red-200 dark:border-red-500/20",
  },
};

export function getStatusConfig(status) {
  return STATUS_CONFIG[status] ?? STATUS_CONFIG.Unpaid;
}
