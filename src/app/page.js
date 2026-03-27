"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Zap, DollarSign, Gauge, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import MeterCard from "@/components/MeterCard";
import AddMeterModal from "@/components/AddMeterModal";
import { getMeters, removeMeter, updateMeterBill } from "@/lib/storage";
import { DISCOS } from "@/lib/disco";
import { scrapeBill } from "@/app/actions/scrape";

export default function DashboardPage() {
  const [meters,        setMeters]        = useState([]);
  const [loadingMap,    setLoadingMap]    = useState({});
  const [errorMap,      setErrorMap]      = useState({});
  const [officialUrlMap,setOfficialUrlMap]= useState({});
  const [modalOpen,     setModalOpen]     = useState(false);

  const load = useCallback(() => setMeters(getMeters()), []);
  useEffect(() => { load(); }, [load]);

  const refresh = useCallback(async (id) => {
    const meter = meters.find((m) => m.id === id);
    if (!meter) return;

    setLoadingMap((p) => ({ ...p, [id]: true }));
    setErrorMap((p)   => ({ ...p, [id]: "" }));
    setOfficialUrlMap((p) => ({ ...p, [id]: "" }));

    try {
      const bill = await scrapeBill(meter.reference, meter.disco);
      setMeters(updateMeterBill(id, bill));
    } catch (err) {
      setErrorMap((p) => ({ ...p, [id]: err.message ?? "Failed to fetch bill." }));
      const fallbackUrl = err.officialUrl ?? DISCOS[meter.disco]?.officialUrl ?? "";
      setOfficialUrlMap((p) => ({ ...p, [id]: fallbackUrl }));
    } finally {
      setLoadingMap((p) => ({ ...p, [id]: false }));
    }
  }, [meters]);

  const remove = useCallback((id) => setMeters(removeMeter(id)), []);

  const totalUnpaid = meters.reduce((sum, m) => {
    const b = m.billHistory[0];
    if (b?.billing?.status === "Unpaid" || b?.billing?.status === "Overdue") {
      return sum + (b.billing.currentAmount ?? 0);
    }
    return sum;
  }, 0);

  const overdueCount = meters.filter((m) => m.billHistory[0]?.billing?.status === "Overdue").length;

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Fetch and monitor electricity bills from any Pakistani DISCO
          </p>
        </div>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add Meter
        </Button>
      </div>

      {/* Overdue alert */}
      {overdueCount > 0 && (
        <div className="flex items-center gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            <strong>{overdueCount}</strong> meter{overdueCount !== 1 ? "s have" : " has"} overdue bills.
          </span>
        </div>
      )}

      {/* Stat cards */}
      {meters.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard label="Total Meters"  value={meters.length}                        icon={<Gauge       className="h-4 w-4" />} />
          <StatCard label="Unpaid Amount" value={`Rs ${totalUnpaid.toLocaleString()}`} icon={<DollarSign  className="h-4 w-4" />} variant="destructive" />
          <StatCard label="Overdue"       value={overdueCount}                          icon={<AlertCircle className="h-4 w-4" />} variant={overdueCount > 0 ? "destructive" : "default"} />
        </div>
      )}

      {/* Meters grid / empty state */}
      {meters.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Zap className="h-7 w-7 text-primary" />
            </div>
            <h2 className="mb-2 font-semibold">No meters added yet</h2>
            <p className="mb-6 max-w-xs text-sm text-muted-foreground">
              Add your electricity reference number to fetch the latest bill from any Pakistani DISCO.
            </p>
            <Button size="sm" onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add Your First Meter
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {meters.map((meter) => (
            <MeterCard
              key={meter.id}
              meter={meter}
              onDelete={remove}
              onRefresh={() => refresh(meter.id)}
              isLoading={loadingMap[meter.id] ?? false}
              error={errorMap[meter.id] ?? ""}
              officialUrl={officialUrlMap[meter.id] ?? ""}
            />
          ))}
        </div>
      )}

      <AddMeterModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSuccess={load} />
    </div>
  );
}

function StatCard({ label, value, icon, variant = "default" }) {
  const styles = {
    default:     { icon: "bg-primary/10 text-primary",          value: "" },
    destructive: { icon: "bg-destructive/10 text-destructive",  value: "text-destructive" },
  };
  const s = styles[variant] ?? styles.default;

  return (
    <Card>
      <CardContent className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${s.icon}`}>
            {icon}
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className={`text-base font-bold tabular-nums leading-tight ${s.value}`}>{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
