// src/components/ExamShareCard.tsx
'use client'

import { useState } from 'react'
import { Check, Copy, Share2, Swords, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

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
  'A*': 'text-emerald-400', 'A': 'text-emerald-400', 'B': 'text-blue-400',
  'C':  'text-yellow-400',  'D': 'text-orange-400',  'E': 'text-orange-500',
  'U':  'text-red-400',
}

const DIFFICULTY_BADGE: Record<string, string> = {
  'O-Level':    'bg-blue-500/15 text-blue-300 border-blue-500/30',
  'Ordinary':   'bg-blue-500/15 text-blue-300 border-blue-500/30',
  'A-Level':    'bg-purple-500/15 text-purple-300 border-purple-500/30',
  'Advanced':   'bg-purple-500/15 text-purple-300 border-purple-500/30',
  'University': 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  'Challenge':  'bg-rose-500/15 text-rose-300 border-rose-500/30',
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function getPercentage(score: number, total: number): number {
  return total > 0 ? Math.round((score / total) * 100) : 0
}

interface ExamShareCardProps {
  result: ExamResult
  shareUrl: string
  showSignupCta?: boolean
}

export default function ExamShareCard({
  result,
  shareUrl,
  showSignupCta = false,
}: ExamShareCardProps) {
  const [copiedResult,    setCopiedResult]    = useState(false)
  const [copiedChallenge, setCopiedChallenge] = useState(false)
  const [challengeUrl,    setChallengeUrl]    = useState<string | null>(null)
  const [creatingChallenge, setCreatingChallenge] = useState(false)
  const router = useRouter()

  const percentage = getPercentage(result.score, result.total)
  const gradeColor = GRADE_COLORS[result.grade] ?? 'text-slate-300'
  const diffBadge  = DIFFICULTY_BADGE[result.difficulty] ?? 'bg-slate-500/15 text-slate-300 border-slate-500/30'

  const origin = typeof window !== 'undefined'
    ? window.location.origin
    : 'https://shadecodestudent.vercel.app'

  const fullResultUrl    = `${origin}${shareUrl}`
  const fullChallengeUrl = challengeUrl ? `${origin}${challengeUrl}` : null

  const resultShareText    = `I scored ${result.score}/${result.total} (${percentage}%) on ${result.subject} ${result.difficulty} on Shadecode Student 🔥\n\nCan you beat me? ${fullResultUrl}`
  const challengeShareText = fullChallengeUrl
    ? `I scored ${percentage}% (Grade ${result.grade}) on ${result.subject} ${result.difficulty} — challenge me and see if you can beat it! 🔥\n\n${fullChallengeUrl}`
    : ''

  const handleCopyResult = async () => {
    await navigator.clipboard.writeText(fullResultUrl)
    setCopiedResult(true)
    setTimeout(() => setCopiedResult(false), 2000)
  }

  const handleWhatsAppResult = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(resultShareText)}`, '_blank')
  }

  const handleCreateChallenge = async () => {
    if (challengeUrl) return // already created
    setCreatingChallenge(true)
    try {
      const res = await fetch('/api/challenge', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          result_id:      result.id,
          subject:        result.subject,
          topic:          result.topic,
          difficulty:     result.difficulty,
          question_count: result.question_count,
          percentage,
          total_score:    result.score,
          max_score:      result.total,
          time_taken:     result.time_taken,
          grade:          result.grade,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setChallengeUrl(data.challengeUrl)
    } catch {
      // fail silently
    } finally {
      setCreatingChallenge(false)
    }
  }

  const handleCopyChallenge = async () => {
    if (!fullChallengeUrl) return
    await navigator.clipboard.writeText(fullChallengeUrl)
    setCopiedChallenge(true)
    setTimeout(() => setCopiedChallenge(false), 2000)
  }

  const handleWhatsAppChallenge = () => {
    if (!challengeShareText) return
    window.open(`https://wa.me/?text=${encodeURIComponent(challengeShareText)}`, '_blank')
  }

  const handleChallenge = () => router.push('/auth/signup')

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="relative rounded-2xl border border-[var(--card-border)] bg-[var(--card)] overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/8 via-transparent to-purple-600/8 pointer-events-none" />

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-[var(--card-border)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-widest text-indigo-400 uppercase">
              ◈ Shadecode Student
            </span>
            <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full border', diffBadge)}>
              {result.difficulty}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-6">
          <div>
            <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-1">Subject</p>
            <p className="text-xl font-bold text-[var(--foreground)]">
              {result.subject}
              {result.topic && (
                <span className="text-[var(--muted-foreground)] font-normal text-base ml-2">· {result.topic}</span>
              )}
            </p>
          </div>

          <div className="flex items-end gap-6">
            <div>
              <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-1">Score</p>
              <p className="text-5xl font-black text-[var(--foreground)]">
                {result.score}
                <span className="text-2xl text-[var(--muted-foreground)] font-semibold">/{result.total}</span>
              </p>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">{percentage}%</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-1">Grade</p>
              <p className={cn('text-6xl font-black', gradeColor)}>{result.grade}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Time',      value: formatTime(result.time_taken) },
              { label: 'XP Earned', value: `+${result.xp_earned}`       },
              { label: 'Questions', value: `${result.question_count}Q`   },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl bg-[var(--surface-2)] border border-[var(--card-border)] px-3 py-3 text-center">
                <p className="text-xs text-[var(--muted-foreground)] mb-1">{label}</p>
                <p className="text-sm font-semibold text-[var(--foreground)]">{value}</p>
              </div>
            ))}
          </div>

          {result.user_name && (
            <p className="text-xs text-[var(--muted-foreground)] text-center">
              by <span className="text-[var(--muted-foreground)]">{result.user_name}</span>
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 space-y-3">

          {/* ── Result share ── */}
          <div className="flex gap-2">
            <button
              onClick={handleCopyResult}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 border',
                copiedResult
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : 'bg-[var(--surface-2)] border-[var(--card-border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]'
              )}
            >
              {copiedResult ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedResult ? 'Copied!' : 'Copy Link'}
            </button>

            <button
              onClick={handleWhatsAppResult}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium bg-[#25D366]/15 border border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/25 transition-all duration-200"
            >
              <Share2 className="w-4 h-4" />
              WhatsApp
            </button>
          </div>

          {/* ── Challenge divider ── */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[var(--card-border)]" />
            <span className="text-xs text-[var(--muted-foreground)] font-medium">or</span>
            <div className="flex-1 h-px bg-[var(--card-border)]" />
          </div>

          {/* ── Challenge section ── */}
          {!challengeUrl ? (
            <button
              onClick={handleCreateChallenge}
              disabled={creatingChallenge}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-orange-500/10 border border-orange-500/25 text-orange-400 hover:bg-orange-500/18 font-semibold py-3 px-4 text-sm transition-all duration-200 disabled:opacity-50"
            >
              {creatingChallenge
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating challenge…</>
                : <><Swords className="w-4 h-4" /> Challenge a Friend 🔥</>
              }
            </button>
          ) : (
            <div className="rounded-xl bg-orange-500/8 border border-orange-500/20 p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Swords className="w-3.5 h-3.5 text-orange-400" />
                <p className="text-xs font-bold text-orange-400 uppercase tracking-wider">Challenge Link Ready</p>
              </div>
              <p className="text-xs text-[var(--muted-foreground)] truncate font-mono bg-[var(--surface-2)] rounded-lg px-3 py-2">
                {fullChallengeUrl}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleCopyChallenge}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium transition-all duration-200 border',
                    copiedChallenge
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                      : 'bg-[var(--surface-2)] border-[var(--card-border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]'
                  )}
                >
                  {copiedChallenge ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedChallenge ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={handleWhatsAppChallenge}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium bg-[#25D366]/15 border border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/25 transition-all duration-200"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  WhatsApp
                </button>
              </div>
            </div>
          )}

          {/* Signup CTA — public results page only */}
          {showSignupCta && (
            <button
              onClick={handleChallenge}
              className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-4 text-sm transition-colors duration-200"
            >
              Try Shadecode Student Free →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
