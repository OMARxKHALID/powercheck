"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Zap, TrendingUp, TrendingDown, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getMeters } from "@/lib/storage";
import { DISCOS } from "@/lib/disco";
import StatusBadge from "@/components/StatusBadge";

export default function HistoryPage() {
  const [meters, setMeters] = useState([]);
  useEffect(() => { setMeters(getMeters()); }, []);

  const metersWithBills = meters.filter((m) => m.billHistory.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Bill History</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          All fetched bills across your meters (up to 12 per meter)
        </p>
      </div>

      {metersWithBills.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Zap className="h-7 w-7 text-primary" />
            </div>
            <p className="mb-2 font-semibold">No bill history yet</p>
            <p className="mb-6 text-sm text-muted-foreground">
              Fetch bills from your meters to see them here.
            </p>
            <Button asChild size="sm" variant="outline">
              <Link href="/">Go to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {metersWithBills.map((meter) => {
            const disco = DISCOS[meter.disco] ?? { name: meter.disco };
            return (
              <Card key={meter.id}>
                <CardHeader className="px-5 pb-3 pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-sm">{meter.label}</CardTitle>
                      <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                        {disco.name} · {meter.reference}
                      </p>
                    </div>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                      {meter.billHistory.length} bill{meter.billHistory.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="px-5 pb-4 pt-0">
                  <div className="overflow-x-auto rounded-md border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                          <th className="px-3 py-2.5 text-left font-medium">Month</th>
                          <th className="hidden px-3 py-2.5 text-right font-medium sm:table-cell">Units</th>
                          <th className="hidden px-3 py-2.5 text-right font-medium md:table-cell">After Due</th>
                          <th className="px-3 py-2.5 text-right font-medium">Amount</th>
                          <th className="px-3 py-2.5 text-right font-medium">Status</th>
                          <th className="hidden px-3 py-2.5 sm:table-cell" />
                        </tr>
                      </thead>
                      <tbody>
                        {meter.billHistory.map((bill, i) => {
                          const diff = bill.consumption?.diffPercent ?? 0;
                          return (
                            <tr key={i} className="border-b border-border transition-colors last:border-0 hover:bg-muted/30">
                              <td className="px-3 py-3">
                                <p className="font-medium">{bill.billing.month}</p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  Due:{" "}
                                  {bill.billing.dueDate
                                    ? new Date(bill.billing.dueDate).toLocaleDateString("en-PK", {
                                        day: "numeric", month: "short", year: "numeric",
                                      })
                                    : "N/A"}
                                </p>
                              </td>

                              <td className="hidden px-3 py-3 text-right sm:table-cell">
                                <span className="tabular-nums">{bill.consumption.currentUnits.toLocaleString()}</span>
                                {diff !== 0 && (
                                  <span className={`ml-1 inline-flex items-center ${diff > 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>
                                    {diff > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                  </span>
                                )}
                              </td>

                              <td className="hidden px-3 py-3 text-right tabular-nums text-muted-foreground md:table-cell">
                                Rs {bill.billing.payableAfterDue.toLocaleString()}
                              </td>

                              <td className="px-3 py-3 text-right font-semibold tabular-nums">
                                Rs {bill.billing.currentAmount.toLocaleString()}
                              </td>

                              <td className="px-3 py-3 text-right">
                                <StatusBadge status={bill.billing.status} />
                              </td>

                              <td className="hidden px-3 py-3 sm:table-cell">
                                {bill.pdfUrl && (
                                  <a
                                    href={bill.pdfUrl} target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    PDF
                                  </a>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
