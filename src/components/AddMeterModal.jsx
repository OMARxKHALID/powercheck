"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DISCOS, detectDisco } from "@/lib/disco";
import { addMeter, generateId } from "@/lib/storage";

export default function AddMeterModal({ isOpen, onClose, onSuccess }) {
  const [reference,   setReference]   = useState("");
  const [label,       setLabel]       = useState("");
  const [manualDisco, setManualDisco] = useState("");
  const [error,       setError]       = useState("");
  const [done,        setDone]        = useState(false);

  const detected   = reference.length >= 2 ? detectDisco(reference) : null;
  const finalDisco = detected ?? manualDisco;

  function handleOpenChange(open) {
    if (!open) {
      setReference(""); setLabel(""); setManualDisco(""); setError(""); setDone(false);
      onClose();
    }
  }

  function handleReferenceChange(e) {
    setError("");
    setReference(e.target.value.replace(/[^0-9A-Za-z]/g, "").toUpperCase());
  }

  function handleSubmit(e) {
    e.preventDefault();
    const ref = reference.trim();

    if (ref.length < 10) {
      setError("Reference number must be at least 10 characters.");
      return;
    }
    if (!finalDisco) {
      setError("DISCO could not be detected. Please select it manually.");
      return;
    }

    addMeter({
      id:          generateId(),
      reference:   ref,
      disco:       finalDisco,
      label:       label.trim() || "Home",
      createdAt:   new Date().toISOString(),
      billHistory: [],
      lastChecked: null,
    });

    setDone(true);
    setTimeout(() => {
      onSuccess();
      handleOpenChange(false);
    }, 900);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Electricity Meter</DialogTitle>
          <DialogDescription>
            Enter the reference number from your electricity bill.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center py-8 gap-3">
            <CheckCircle2 className="h-10 w-10 text-primary" />
            <p className="text-sm font-medium">Meter added successfully!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="space-y-2">
              <Label htmlFor="reference">Reference Number</Label>
              <Input
                id="reference"
                value={reference}
                onChange={handleReferenceChange}
                placeholder="e.g. 21012345678901"
                autoFocus
                className={error ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {reference.length >= 2 && (
                <p className={`text-xs ${detected ? "text-primary" : "text-muted-foreground"}`}>
                  {detected
                    ? `✓ Detected: ${DISCOS[detected]?.name ?? detected}`
                    : "Not detected yet — type more digits or select below"}
                </p>
              )}
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="label">
                Label <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Home, Office, Shop…"
              />
            </div>

            {!detected && (
              <div className="space-y-2">
                <Label>Electric Company (DISCO)</Label>
                <Select value={manualDisco} onValueChange={setManualDisco}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your company" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(DISCOS).map((d) => (
                      <SelectItem key={d.code} value={d.code}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button type="submit" className="w-full">Add Meter</Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
