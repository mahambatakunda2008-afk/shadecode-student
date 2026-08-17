// src/components/ExamShareCard.tsx
'use client'

import { useState } from 'react'
import { Check, Copy, Share2, Swords, Loader2, Download } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { downloadExport } from '@/lib/exports'
import { trackEvent } from '@/lib/traction/client'
import { BrandMark } from '@/components/brand/BrandMark'

export type ExamResult = {
  id: string
  user_name: string | null
  subject: string
  topic: string | null
  difficulty: string
  score: number
  total: number
  question_count: number
  time_taken: number
  xp_earned: number
  grade: string
  created_at: string
}

const GRADE_COLORS: Record<string, string> = {
  'A*': 'text-emerald-400', 'A': 'text-emerald-400', 'B': 'text-blue-400', 'C': 'text-yellow-400', 'D': 'text-orange-400', 'E': 'text-orange-500', 'U': 'text-red-400',
}
const DIFFICULTY_BADGE: Record<string, string> = {
  'O-Level': 'bg-cyan-500/10 text-cyan-300 border-cyan-500/25', 'Ordinary': 'bg-cyan-500/10 text-cyan-300 border-cyan-500/25', 'A-Level': 'bg-cyan-500/10 text-cyan-300 border-cyan-500/25', 'Advanced': 'bg-cyan-500/10 text-cyan-300 border-cyan-500/25', 'University': 'bg-cyan-500/10 text-cyan-300 border-cyan-500/25', 'Challenge': 'bg-cyan-500/10 text-cyan-300 border-cyan-500/25',
}
function formatTime(seconds: number): string { const m = Math.floor(seconds / 60); const s = seconds % 60; return `${m}:${String(s).padStart(2, '0')}` }
function getPercentage(score: number, total: number): number { return total > 0 ? Math.round((score / total) * 100) : 0 }

interface ExamShareCardProps { result: ExamResult; shareUrl: string; showSignupCta?: boolean }

export default function ExamShareCard({ result, shareUrl, showSignupCta = false }: ExamShareCardProps) {
  const [copiedResult, setCopiedResult] = useState(false)
  const [copiedChallenge, setCopiedChallenge] = useState(false)
  const [challengeUrl, setChallengeUrl] = useState<string | null>(null)
  const [creatingChallenge, setCreatingChallenge] = useState(false)
  const router = useRouter()
  const percentage = getPercentage(result.score, result.total)
  const gradeColor = GRADE_COLORS[result.grade] ?? 'text-slate-300'
  const diffBadge = DIFFICULTY_BADGE[result.difficulty] ?? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/25'
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://shadecodestudent.vercel.app'
  const fullResultUrl = `${origin}${shareUrl}`
  const fullChallengeUrl = challengeUrl ? `${origin}${challengeUrl}` : null
  const resultShareText = `I scored ${result.score}/${result.total} (${percentage}%) on ${result.subject} ${result.difficulty} on Shadecode Student 🔥\n\nCan you beat me? ${fullResultUrl}`
  const challengeShareText = fullChallengeUrl ? `I scored ${percentage}% (Grade ${result.grade}) on ${result.subject} ${result.difficulty} — challenge me and see if you can beat it! 🔥\n\n${fullChallengeUrl}` : ''
  const exportPayload = { resultId: result.id, student: result.user_name, subject: result.subject, topic: result.topic, difficulty: result.difficulty, score: result.score, total: result.total, percentage, grade: result.grade, questions: result.question_count, timeSeconds: result.time_taken, xpEarned: result.xp_earned, completedAt: result.created_at }

  const handleExport = () => {
    downloadExport(`shadecode-${result.subject.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-result`, exportPayload, 'json', { exportType: 'exam_result', sourceType: 'exam_result', sourceId: result.id })
    void trackEvent('output_exported', { output: 'exam_result', format: 'json', resultId: result.id })
  }
  const handleCopyResult = async () => {
    try { await navigator.clipboard.writeText(fullResultUrl); setCopiedResult(true); void trackEvent('result_shared', { channel: 'copy', resultId: result.id }); setTimeout(() => setCopiedResult(false), 2000) } catch { setCopiedResult(false) }
  }
  const handleWhatsAppResult = () => { void trackEvent('result_shared', { channel: 'whatsapp', resultId: result.id }); window.open(`https://wa.me/?text=${encodeURIComponent(resultShareText)}`, '_blank', 'noopener,noreferrer') }
  const handleCreateChallenge = async () => {
    if (challengeUrl) return
    setCreatingChallenge(true)
    try {
      const res = await fetch('/api/challenge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ result_id: result.id, subject: result.subject, topic: result.topic, difficulty: result.difficulty, question_count: result.question_count, percentage, total_score: result.score, max_score: result.total, time_taken: result.time_taken, grade: result.grade }) })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      if (typeof data?.challengeUrl !== 'string') throw new Error('Invalid challenge response')
      setChallengeUrl(data.challengeUrl)
      void trackEvent('challenge_created', { resultId: result.id })
    } catch { /* sharing is optional */ } finally { setCreatingChallenge(false) }
  }
  const handleCopyChallenge = async () => {
    if (!fullChallengeUrl) return
    try { await navigator.clipboard.writeText(fullChallengeUrl); setCopiedChallenge(true); void trackEvent('challenge_shared', { channel: 'copy', resultId: result.id }); setTimeout(() => setCopiedChallenge(false), 2000) } catch { setCopiedChallenge(false) }
  }
  const handleWhatsAppChallenge = () => { if (!challengeShareText) return; void trackEvent('challenge_shared', { channel: 'whatsapp', resultId: result.id }); window.open(`https://wa.me/?text=${encodeURIComponent(challengeShareText)}`, '_blank', 'noopener,noreferrer') }
  const handleChallenge = () => router.push('/auth/signup')

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="relative rounded-2xl border border-[var(--card-border)] bg-[var(--card)] overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-[var(--primary-glow)] opacity-30 pointer-events-none" />
        <div className="relative px-6 pt-6 pb-4 border-b border-[var(--card-border)]">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 ssc-nav-label text-xs text-[var(--primary)] uppercase">
              <BrandMark width={20} height={20} aria-hidden="true" /> Shadecode Student
            </span>
            <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full border', diffBadge)}>{result.difficulty}</span>
          </div>
        </div>
        <div className="relative px-6 py-6 space-y-6">
          <div><p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-1">Subject</p><p className="text-xl font-bold text-[var(--foreground)]">{result.subject}{result.topic && <span className="text-[var(--muted-foreground)] font-normal text-base ml-2">· {result.topic}</span>}</p></div>
          <div className="flex items-end gap-6"><div><p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-1">Score</p><p className="text-5xl font-black text-[var(--foreground)]">{result.score}<span className="text-2xl text-[var(--muted-foreground)] font-semibold">/{result.total}</span></p><p className="text-sm text-[var(--muted-foreground)] mt-1">{percentage}%</p></div><div className="ml-auto text-right"><p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-1">Grade</p><p className={cn('text-6xl font-black', gradeColor)}>{result.grade}</p></div></div>
          <div className="grid grid-cols-3 gap-3">{[{ label: 'Time', value: formatTime(result.time_taken) }, { label: 'XP Earned', value: `+${result.xp_earned}` }, { label: 'Questions', value: `${result.question_count}Q` }].map(({ label, value }) => <div key={label} className="rounded-xl bg-[var(--surface-2)] border border-[var(--card-border)] px-3 py-3 text-center"><p className="text-xs text-[var(--muted-foreground)] mb-1">{label}</p><p className="text-sm font-semibold text-[var(--foreground)]">{value}</p></div>)}</div>
          {result.user_name && <p className="text-xs text-[var(--muted-foreground)] text-center">by <span className="text-[var(--muted-foreground)]">{result.user_name}</span></p>}
        </div>
        <div className="relative px-6 pb-6 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <button onClick={handleCopyResult} className={cn('flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium border', copiedResult ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-[var(--surface-2)] border-[var(--card-border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]')}>{copiedResult ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}{copiedResult ? 'Copied!' : 'Copy Link'}</button>
            <button onClick={handleWhatsAppResult} className="flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium bg-[#25D366]/15 border border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/25"><Share2 className="w-4 h-4" />WhatsApp</button>
            <button onClick={handleExport} className="flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium bg-[var(--surface-2)] border border-[var(--card-border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"><Download className="w-4 h-4" />Export</button>
          </div>
          <div className="flex items-center gap-3"><div className="flex-1 h-px bg-[var(--card-border)]" /><span className="text-xs text-[var(--muted-foreground)] font-medium">or</span><div className="flex-1 h-px bg-[var(--card-border)]" /></div>
          {!challengeUrl ? <button onClick={handleCreateChallenge} disabled={creatingChallenge} className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--primary-glow)] border border-[var(--primary)]/25 text-[var(--primary)] hover:bg-[var(--accent-soft)] font-semibold py-3 px-4 text-sm disabled:opacity-50">{creatingChallenge ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating challenge…</> : <><Swords className="w-4 h-4" /> Challenge a Friend 🔥</>}</button> : <div className="rounded-xl bg-[var(--primary-glow)] border border-[var(--primary)]/20 p-4 space-y-3"><div className="flex items-center gap-2 mb-1"><Swords className="w-3.5 h-3.5 text-[var(--primary)]" /><p className="ssc-nav-label text-xs font-bold text-[var(--primary)] uppercase tracking-wider">Challenge Link Ready</p></div><p className="text-xs text-[var(--muted-foreground)] truncate font-mono bg-[var(--surface-2)] rounded-lg px-3 py-2">{fullChallengeUrl}</p><div className="flex gap-2"><button onClick={handleCopyChallenge} className={cn('flex-1 flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium border', copiedChallenge ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-[var(--surface-2)] border-[var(--card-border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]')}>{copiedChallenge ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}{copiedChallenge ? 'Copied!' : 'Copy'}</button><button onClick={handleWhatsAppChallenge} className="flex-1 flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium bg-[#25D366]/15 border border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/25"><Share2 className="w-3.5 h-3.5" />WhatsApp</button></div></div>}
          {showSignupCta && <button onClick={handleChallenge} className="w-full rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--primary-foreground)] font-semibold py-3 px-4 text-sm ssc-button">Try Shadecode Student Free →</button>}
        </div>
      </div>
    </div>
  )
}
