"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Share2, MessageCircle } from "lucide-react";
import { trackEvent } from "@/lib/traction/client";

interface ShareCardProps { title: string; text: string; shareType: string; className?: string; }

function getReferralCode() {
  const key = "shadecode_share_ref"; const existing = window.localStorage.getItem(key); if (existing) return existing;
  const bytes = new Uint8Array(6); crypto.getRandomValues(bytes); const code = `sc-${Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("")}`; window.localStorage.setItem(key, code); return code;
}

export default function ShareCard({ title, text, shareType, className = "" }: ShareCardProps) {
  const [copied, setCopied] = useState(false); const [shareUrl, setShareUrl] = useState("https://shadecodestudent.vercel.app/share");
  useEffect(() => { try { setShareUrl(`${window.location.origin}/share?ref=${encodeURIComponent(getReferralCode())}`); } catch { setShareUrl(`${window.location.origin}/share`); } }, []);
  const shareText = `${text}\n\nStudy with Shadecode Student.`;
  const copy = async () => { try { const value = `${shareText}\n${shareUrl}`; if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value); else { const area = document.createElement("textarea"); area.value = value; area.style.position = "fixed"; area.style.opacity = "0"; document.body.appendChild(area); area.select(); document.execCommand("copy"); area.remove(); } setCopied(true); void trackEvent("share_completed", { shareType, method: "copy" }); window.setTimeout(() => setCopied(false), 1800); } catch { setCopied(false); } };
  const nativeShare = async () => { if (!navigator.share) return copy(); try { await navigator.share({ title, text: shareText, url: shareUrl }); void trackEvent("share_completed", { shareType, method: "native" }); } catch (error) { if (error instanceof DOMException && error.name === "AbortError") return; } };
  const whatsapp = () => { window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`, "_blank", "noopener,noreferrer"); void trackEvent("share_started", { shareType, method: "whatsapp" }); };
  return <div className={`rounded-2xl border border-[var(--card-border)] bg-[var(--surface-2)] p-4 ${className}`}><div className="mb-3 flex items-center gap-2"><Share2 size={17} className="text-[var(--primary)]" /><strong>Share your progress</strong></div><p className="mb-4 text-sm leading-6 text-[var(--muted-foreground)]">{text}</p><div className="flex flex-wrap gap-2"><button type="button" onClick={nativeShare} className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-3 py-2 text-sm font-semibold text-white"><Share2 size={15} /> Share</button><button type="button" onClick={whatsapp} className="inline-flex items-center gap-2 rounded-xl border border-[var(--card-border)] px-3 py-2 text-sm font-semibold"><MessageCircle size={15} /> WhatsApp</button><button type="button" onClick={copy} className="inline-flex items-center gap-2 rounded-xl border border-[var(--card-border)] px-3 py-2 text-sm font-semibold">{copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "Copied" : "Copy"}</button></div></div>;
}
