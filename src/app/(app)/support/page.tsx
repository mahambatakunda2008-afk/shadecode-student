"use client";

import Link from "next/link";
import { ArrowLeft, Heart, ShieldCheck, Wallet } from "lucide-react";
import { useState } from "react";

const suggestedAmounts = [1, 3, 5, 10];

export default function SupportShadecodePage() {
  const [amount, setAmount] = useState("3");

  const parsedAmount = Number(amount);
  const amountIsValid = amount.trim() !== "" && Number.isFinite(parsedAmount) && parsedAmount > 0 && parsedAmount <= 10000;

  return (
    <main className="ssc-page mx-auto w-full max-w-3xl">
      <Link href="/settings" className="mb-5 inline-flex min-h-10 items-center gap-2 text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]">
        <ArrowLeft size={16} aria-hidden="true" />
        Back to settings
      </Link>

      <header className="mb-6">
        <p className="ssc-kicker">Keep learning accessible</p>
        <h1 className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary-glow)] text-[var(--primary)]">
            <Heart size={23} aria-hidden="true" />
          </span>
          Support Shadecode
        </h1>
        <p className="ssc-subtitle mt-2 max-w-2xl">
          Help us keep building useful learning tools for students. Contributions are completely voluntary. Shadecode’s learning features are not locked behind a donation.
        </p>
      </header>

      <section className="ssc-card p-5 sm:p-7">
        <p className="ssc-label">Choose your contribution (USD)</p>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {suggestedAmounts.map((suggested) => (
            <button
              key={suggested}
              type="button"
              aria-pressed={amount === String(suggested)}
              onClick={() => setAmount(String(suggested))}
              className="ssc-card-interactive min-h-12 rounded-xl px-3 py-3 text-center font-semibold"
              style={{ borderColor: amount === String(suggested) ? "var(--primary)" : "var(--card-border)", background: amount === String(suggested) ? "var(--primary-glow)" : "var(--surface-2)" }}
            >
              ${suggested}
            </button>
          ))}
        </div>

        <div className="mt-5">
          <label htmlFor="support-amount" className="ssc-label">Or enter another amount</label>
          <div className="mt-2 flex items-center gap-3 rounded-xl border border-[var(--card-border)] bg-[var(--surface-2)] px-4 focus-within:border-[var(--primary)]">
            <span className="text-lg font-semibold text-[var(--muted-foreground)]" aria-hidden="true">$</span>
            <input
              id="support-amount"
              inputMode="decimal"
              type="number"
              min="0.01"
              max="10000"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              aria-describedby="support-amount-help"
              className="min-h-12 w-full bg-transparent py-2 text-base font-semibold text-[var(--foreground)] outline-none"
              placeholder="Enter amount"
            />
          </div>
          <p id="support-amount-help" className="mt-2 text-xs text-[var(--muted-foreground)]">Enter a positive amount up to $10,000. The minimum, fees and available currencies will be shown before any payment is submitted.</p>
          {!amountIsValid && <p role="alert" className="mt-2 text-sm text-[var(--danger)]">Enter a valid amount greater than $0 and no more than $10,000.</p>}
        </div>

        <div className="mt-6 rounded-2xl border border-[var(--card-border)] bg-[var(--surface-2)] p-4">
          <div className="flex items-start gap-3">
            <Wallet size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--primary)]" />
            <div>
              <h2 className="font-semibold">Secure payments are being set up</h2>
              <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
                EcoCash and other supported payment options are not connected yet. No payment will be taken on this screen. We’ll enable checkout only after provider verification and server-side payment confirmation are ready.
              </p>
            </div>
          </div>
        </div>

        <button type="button" disabled className="ssc-button mt-5 w-full justify-center opacity-60" aria-disabled="true">
          Continue to secure payment · ${amountIsValid ? parsedAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"} USD
        </button>
        <p className="mt-3 text-center text-xs leading-5 text-[var(--muted-foreground)]">Checkout is not live yet. This page does not collect or store payment details.</p>
      </section>

      <section className="mt-4 flex items-start gap-3 rounded-2xl border border-[var(--card-border)] p-4">
        <ShieldCheck size={19} aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--primary)]" />
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          Safety promise: Shadecode will never ask for your EcoCash PIN or store card security details. Contributions will never buy XP, marks, rankings, or access to core learning features.
        </p>
      </section>
    </main>
  );
}
