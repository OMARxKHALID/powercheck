"use client";

import { useEffect, useState } from "react";
import { BarChart3, Info, ShieldAlert, Trash2, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { getMeters, saveMeters } from "@/lib/storage";
import { DISCOS } from "@/lib/disco";

export default function SettingsPage() {
  const [meters,      setMeters]      = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => { setMeters(getMeters()); }, []);

  const totalBills = meters.reduce((a, m) => a + m.billHistory.length, 0);

  function clearAll() {
    saveMeters([]);
    setMeters([]);
    setConfirmOpen(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Manage your data and view app information</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <BarChart3 className="h-4 w-4" /> Data Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[{ label: "Meters Tracked", value: meters.length }, { label: "Bills Saved", value: totalBills }].map(({ label, value }) => (
                <div key={label} className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-0.5 text-2xl font-bold tabular-nums">{value}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              All data is stored locally in your browser. Nothing leaves your device.
            </p>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Info className="h-4 w-4" /> About PowerCheck
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <p><span className="font-semibold">PowerCheck</span> <span className="text-muted-foreground">v1.0.0</span></p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Fetch and track electricity bills from all major Pakistani electric companies.
              Bills are fetched live from the official PITC portal and K-Electric.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Supported DISCOs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Supported Companies</CardTitle>
          <CardDescription>Bills are fetched live from official portals.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {Object.values(DISCOS).map((d) => (
              <div key={d.code} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <div>
                  <p className="text-xs font-semibold">{d.code}</p>
                  <p className="text-xs text-muted-foreground">{d.name}</p>
                </div>
                <a
                  href={d.officialUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center gap-1 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" /> Portal
                </a>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm text-destructive">
            <ShieldAlert className="h-4 w-4" /> Danger Zone
          </CardTitle>
          <CardDescription>Irreversible — cannot be undone.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Clear All Data</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Permanently deletes all meters and bill history from your browser.
              </p>
            </div>
            <Button variant="destructive" size="sm" disabled={meters.length === 0} onClick={() => setConfirmOpen(true)}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Clear All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirm dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive">Clear all data?</DialogTitle>
            <DialogDescription>
              This will permanently delete{" "}
              <strong>{meters.length} meter{meters.length !== 1 ? "s" : ""}</strong> and{" "}
              <strong>{totalBills} bill record{totalBills !== 1 ? "s" : ""}</strong>.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" className="flex-1" onClick={clearAll}>Yes, Clear Everything</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
