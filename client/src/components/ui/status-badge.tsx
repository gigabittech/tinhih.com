import * as React from "react";
import {
  CheckCircle2,
  Clock,
  CircleDot,
  XCircle,
  AlertTriangle,
  FileText,
  Circle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Neutral, monochrome status badge. State is conveyed by icon + weight + a
 * greyscale tier — never hue. Replaces the ~10 duplicated `getStatusColor`
 * maps scattered across appointments, billing, orders, donations, bookings,
 * activity and telehealth screens.
 *
 *   <StatusBadge status="completed" />
 *   <StatusBadge status="no_show" label="No show" showIcon={false} />
 */
type Tier = "solid" | "strong" | "muted" | "subtle";

const tierClasses: Record<Tier, string> = {
  // complete / positive — filled dark
  solid: "bg-foreground text-background border-transparent",
  // current / in-progress — dark outline
  strong: "bg-transparent text-foreground border-foreground",
  // waiting / pending — muted fill
  muted: "bg-muted text-muted-foreground border-border",
  // terminal / negative — light outline
  subtle: "bg-transparent text-muted-foreground border-border",
};

type StatusDef = { tier: Tier; icon: LucideIcon };

const STATUS_MAP: Record<string, StatusDef> = {
  completed: { tier: "solid", icon: CheckCircle2 },
  complete: { tier: "solid", icon: CheckCircle2 },
  paid: { tier: "solid", icon: CheckCircle2 },
  approved: { tier: "solid", icon: CheckCircle2 },
  active: { tier: "solid", icon: CheckCircle2 },
  delivered: { tier: "solid", icon: CheckCircle2 },
  success: { tier: "solid", icon: CheckCircle2 },
  confirmed: { tier: "solid", icon: CheckCircle2 },

  in_progress: { tier: "strong", icon: CircleDot },
  in_session: { tier: "strong", icon: CircleDot },
  processing: { tier: "strong", icon: CircleDot },
  open: { tier: "strong", icon: CircleDot },
  sent: { tier: "strong", icon: CircleDot },
  shipped: { tier: "strong", icon: CircleDot },

  scheduled: { tier: "muted", icon: Clock },
  pending: { tier: "muted", icon: Clock },
  waiting_room: { tier: "muted", icon: Clock },
  unpaid: { tier: "muted", icon: Clock },
  draft: { tier: "muted", icon: FileText },
  consent_required: { tier: "muted", icon: AlertTriangle },

  cancelled: { tier: "subtle", icon: XCircle },
  canceled: { tier: "subtle", icon: XCircle },
  rejected: { tier: "subtle", icon: XCircle },
  no_show: { tier: "subtle", icon: XCircle },
  closed: { tier: "subtle", icon: XCircle },
  refunded: { tier: "subtle", icon: XCircle },
  inactive: { tier: "subtle", icon: XCircle },
  failed: { tier: "subtle", icon: XCircle },
  overdue: { tier: "subtle", icon: AlertTriangle },
  error: { tier: "subtle", icon: AlertTriangle },
  technical_issues: { tier: "subtle", icon: AlertTriangle },
};

const normalize = (s: string) => s.toLowerCase().trim().replace(/[\s-]+/g, "_");
const toLabel = (s: string) =>
  s.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: string;
  /** Override the displayed text (defaults to a humanised `status`). */
  label?: string;
  showIcon?: boolean;
}

export function StatusBadge({
  status,
  label,
  showIcon = true,
  className,
  ...props
}: StatusBadgeProps) {
  const def = STATUS_MAP[normalize(status || "")] ?? {
    tier: "muted" as Tier,
    icon: Circle,
  };
  const Icon = def.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium",
        tierClasses[def.tier],
        className
      )}
      {...props}
    >
      {showIcon && <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
      {label ?? toLabel(status)}
    </span>
  );
}
