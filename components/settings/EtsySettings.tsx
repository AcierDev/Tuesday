"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, ShoppingBag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ETSY_CONFIG } from "@/config/etsy";
import type { EtsyPublicStatus } from "@/lib/etsy/connection-server";

const STATUS_URL = "/api/etsy/connection";
const CONNECT_URL = "/api/etsy/oauth/start";
const SYNC_URL = "/api/etsy/sync";
const MS_PER_MINUTE = 60_000;

const formatTime = (ms: number | null | undefined) =>
  ms ? new Date(ms).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

async function readJson<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? `Request failed (${response.status})`);
  return body;
}

export function EtsySettings() {
  const [status, setStatus] = useState<EtsyPublicStatus | null>(null);
  const [keystring, setKeystring] = useState("");
  const [sharedSecret, setSharedSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setStatus(await readJson<EtsyPublicStatus>(await fetch(STATUS_URL, { cache: "no-store" })));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load Etsy status.");
    }
  }, []);

  // Connect finishes in another tab; pick up the result when this one regains focus.
  useEffect(() => {
    void refresh();
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  const run = async (action: () => Promise<string | null>) => {
    setBusy(true);
    setMessage(null);
    try {
      setMessage(await action());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const update = (body: Record<string, unknown>, method: "PUT" | "DELETE" = "PUT") =>
    run(async () => {
      setStatus(await readJson<EtsyPublicStatus>(await fetch(STATUS_URL, {
        method,
        headers: { "Content-Type": "application/json" },
        body: method === "PUT" ? JSON.stringify(body) : undefined,
      })));
      return null;
    });

  const saveKeys = () =>
    run(async () => {
      setStatus(await readJson<EtsyPublicStatus>(await fetch(STATUS_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keystring, sharedSecret }),
      })));
      setKeystring("");
      setSharedSecret("");
      return "Keys saved. Now press Connect.";
    });

  const importNow = () =>
    run(async () => {
      const summary = await readJson<{ imported: number; receiptsChecked: number; error: string | null }>(
        await fetch(SYNC_URL, { method: "POST" })
      );
      await refresh();
      return summary.error ?? `Checked ${summary.receiptsChecked} Etsy orders, added ${summary.imported}.`;
    });

  if (!status) {
    return <p className="text-sm text-slate-500">{message ?? "Loading…"}</p>;
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <Card className="dark:bg-gray-900">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base font-semibold flex items-center">
            <ShoppingBag className="mr-2 h-4 w-4" />
            Etsy
          </CardTitle>
          <CardDescription className="text-xs">
            {status.connected
              ? `Connected to ${status.shopName ?? "your shop"} since ${formatTime(status.connectedAt)}`
              : status.keysSource
                ? "Keys saved. Press Connect and approve access on Etsy."
                : "Not set up. Paste the keystring and shared secret from etsy.com/developers/your-apps."}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-4">
          {status.keysSource !== "env" && (
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <div className="space-y-1">
                <Label htmlFor="etsy-keystring" className="text-xs">
                  Keystring {status.keystringHint && <span className="text-slate-400">(saved {status.keystringHint})</span>}
                </Label>
                <Input id="etsy-keystring" autoComplete="off" value={keystring} onChange={(event) => setKeystring(event.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="etsy-secret" className="text-xs">Shared secret</Label>
                <Input id="etsy-secret" type="password" autoComplete="off" value={sharedSecret} onChange={(event) => setSharedSecret(event.target.value)} />
              </div>
              <Button disabled={busy || !keystring.trim() || !sharedSecret.trim()} onClick={() => void saveKeys()}>
                Save keys
              </Button>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="shrink-0">Callback URL:</span>
            <code className="truncate rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5">{status.redirectUri}</code>
            <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" title="Copy"
              onClick={() => void navigator.clipboard?.writeText(status.redirectUri)}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button disabled={busy || !status.keysSource} onClick={() => window.open(CONNECT_URL, "_blank", "noopener")}>
              {status.connected ? "Reconnect" : "Connect"}
            </Button>
            {status.connected && (
              <>
                <Button variant="outline" disabled={busy || !status.importEnabled} onClick={() => void importNow()}>
                  Import now
                </Button>
                <Button variant="ghost" disabled={busy} onClick={() => void update({}, "DELETE")}>
                  Disconnect
                </Button>
              </>
            )}
          </div>

          {status.connected && (
            <div className="space-y-3 border-t border-slate-200 dark:border-slate-800 pt-3">
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="etsy-tracking" className="text-sm">
                  Send tracking to Etsy after buying a FedEx label
                  <span className="block text-xs text-slate-400">Etsy marks the order shipped and emails the buyer.</span>
                </Label>
                <Switch id="etsy-tracking" checked={status.trackingPushEnabled} disabled={busy}
                  onCheckedChange={(checked) => void update({ trackingPushEnabled: checked })} />
              </div>
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="etsy-import" className="text-sm">
                  Import new Etsy orders every {ETSY_CONFIG.syncIntervalMs / MS_PER_MINUTE} minutes
                  <span className="block text-xs text-slate-400">
                    Only orders placed after connecting. Last check: {formatTime(status.lastSync?.at)}
                    {status.lastSync && !status.lastSync.error && ` · added ${status.lastSync.imported}`}
                  </span>
                </Label>
                <Switch id="etsy-import" checked={status.importEnabled} disabled={busy}
                  onCheckedChange={(checked) => void update({ importEnabled: checked })} />
              </div>
              {status.lastSync?.error && <p className="text-xs text-red-500">{status.lastSync.error}</p>}
            </div>
          )}

          {message && <p className="text-xs text-slate-500">{message}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
