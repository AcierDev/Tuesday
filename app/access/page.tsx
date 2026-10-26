"use client";

import { FormEvent, useState } from "react";

const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_SERVICE_UNAVAILABLE = 503;

// Error pages from a proxy or a crashed route may be HTML, not JSON.
async function errorMessage(response: Response): Promise<string> {
  const result: unknown = await response.json().catch(() => null);
  const error = result && typeof result === "object" && "error" in result ? result.error : null;
  if (typeof error === "string" && error) return error;
  if (response.status === HTTP_TOO_MANY_REQUESTS) return "Too many incorrect attempts. Try again later.";
  if (response.status === HTTP_SERVICE_UNAVAILABLE) return "Site access is not configured.";
  return `Could not unlock the site (error ${response.status}). Try again.`;
}

export default function AccessPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    let response: Response;
    try {
      response = await fetch("/api/site-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
    } catch {
      setError("Could not connect. Try again.");
      setSubmitting(false);
      return;
    }
    if (!response.ok) {
      setError(await errorMessage(response));
      setSubmitting(false);
      return;
    }
    const next = new URLSearchParams(window.location.search).get("next") || "/orders";
    const destination = new URL(next, window.location.origin);
    window.location.assign(destination.origin === window.location.origin ? destination.href : "/orders");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4 text-gray-100">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-gray-700 bg-gray-900 p-8 shadow-xl">
        <h1 className="text-2xl font-semibold">Tuesday</h1>
        <p className="mt-2 text-sm text-gray-400">Enter the site password once on this browser.</p>
        <label htmlFor="site-password" className="mt-7 block text-sm font-medium">Password</label>
        <input id="site-password" type="password" autoComplete="current-password" autoFocus required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 outline-none focus:border-sky-400" />
        {error && <p role="alert" className="mt-3 text-sm text-red-400">{error}</p>}
        <button type="submit" disabled={submitting} className="mt-6 w-full rounded-lg bg-sky-500 px-4 py-2 font-medium text-gray-950 disabled:opacity-50">
          {submitting ? "Checking…" : "Continue"}
        </button>
      </form>
    </div>
  );
}
