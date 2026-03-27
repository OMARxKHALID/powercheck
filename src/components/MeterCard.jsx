"use client";

import { RefreshCw, Trash2, TrendingUp, TrendingDown, Clock, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import StatusBadge from "@/components/StatusBadge";
import { DISCOS } from "@/lib/disco";

export default function MeterCard({ meter, onDelete, onRefresh, isLoading, error, officialUrl }) {
  const bill  = meter.billHistory[0] ?? null;
  const disco = DISCOS[meter.disco] ?? { name: meter.disco };
  const diff  = bill?.consumption?.diffPercent ?? 0;

  const lastChecked = meter.lastChecked
    ? new Date(meter.lastChecked).toLocaleString("en-PK", {
        day: "numeric", month: "short",
        hour: "2-digit", minute: "2-digit",
      })
    : null;

  return (
    <Card className="flex flex-col">
      {/* Header */}
      <CardHeader className="px-4 pb-3 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] font-semibold uppercase tracking-widest text-primary">
              {disco.name}
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold">{meter.label}</p>
            <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
              {meter.reference}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              variant="ghost" size="icon"
              onClick={onRefresh} disabled={isLoading}
              className="h-7 w-7" aria-label="Refresh bill"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
            <Button
              variant="ghost" size="icon"
              onClick={() => onDelete(meter.id)}
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              aria-label="Remove meter"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <Separator />

      {/* Body */}
      <CardContent className="flex flex-1 flex-col px-4 pb-4 pt-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-xs text-muted-foreground">Fetching bill…</p>
          </div>

        ) : error ? (
          <div className="flex flex-col gap-3 py-1">
            <p className="text-xs leading-relaxed text-destructive">{error}</p>
            {officialUrl && (
              <a
                href={officialUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                Visit official portal
              </a>
            )}
            <Button variant="outline" size="sm" onClick={onRefresh} className="mt-1">
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Try Again
            </Button>
          </div>

        ) : bill ? (
          <div className="space-y-3">
            {/* Amount + status */}
            <div className="flex items-end justify-between gap-2">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Amount Due</p>
                <p className="mt-0.5 text-2xl font-bold tabular-nums">
                  Rs {bill.billing.currentAmount.toLocaleString()}
                </p>
              </div>
              <StatusBadge status={bill.billing.status} />
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-border pt-3 text-xs">
              <div>
                <p className="text-muted-foreground">Units Used</p>
                <p className="mt-0.5 flex items-center gap-1 font-medium tabular-nums">
                  {bill.consumption.currentUnits.toLocaleString()} kWh
                  {diff !== 0 && (
                    <span className={diff > 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}>
                      {diff > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    </span>
                  )}
                </p>
              </div>

              <div>
                <p className="text-muted-foreground">Due Date</p>
                <p className="mt-0.5 font-medium">
                  {bill.billing.dueDate
                    ? new Date(bill.billing.dueDate).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })
                    : "N/A"}
                </p>
              </div>

              <div className="col-span-2">
                <p className="text-muted-foreground">Billing Month</p>
                <p className="mt-0.5 font-medium">{bill.billing.month}</p>
              </div>

              {bill.billing.payableAfterDue > bill.billing.currentAmount && (
                <div className="col-span-2">
                  <p className="text-muted-foreground">After Due Date</p>
                  <p className="mt-0.5 font-medium tabular-nums text-destructive">
                    Rs {bill.billing.payableAfterDue.toLocaleString()}
                  </p>
                </div>
              )}

              {bill.meta.consumerName && bill.meta.consumerName !== "N/A" && (
                <div className="col-span-2 border-t border-border pt-2">
                  <p className="text-muted-foreground">Consumer</p>
                  <p className="mt-0.5 truncate font-medium">{bill.meta.consumerName}</p>
                </div>
              )}
            </div>

            {/* Footer: last updated + PDF link */}
            {lastChecked && (
              <div className="flex items-center gap-1 border-t border-border pt-2 text-[10px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>Updated {lastChecked}</span>
                {bill.pdfUrl && (
                  <a
                    href={bill.pdfUrl} target="_blank" rel="noopener noreferrer"
                    className="ml-auto inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    PDF
                  </a>
                )}
              </div>
            )}
          </div>

        ) : (
          <div className="flex flex-col items-center justify-center gap-3 py-8">
            <p className="text-xs text-muted-foreground">No bill data yet</p>
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Fetch Bill
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
