// src/components/ExamShareCard.tsx
'use client'

import { useState } from 'react'
import { Check, Copy, Share2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ExamResult = {
  id: string
  user_name: string | null
  subject: string
  topic: string | null
  difficulty: string
  score: number
  total: number
  time_taken: number
  xp_earned: number
  grade: string
  created_at: string
}

const GRADE_COLORS: Record<string, string> = {
  'A+': 'text-emerald-400',
  'A':  'text-emerald-400',
  'B':  'text-blue-400',
  'C':  'text-yellow-400',
  'D':  'text-orange-400',
  'F':  'text-red-400',
}

const DIFFICULTY_BADGE: Record<string, string> = {
  'O-Level':    'bg-blue-500/15 text-blue-300 border-blue-500/30',
  'A-Level':    'bg-purple-500/15 text-purple-300 border-purple-500/30',
  'University': 'bg-rose-500/15 text-rose-300 border-rose-500/30',
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function getPercentage(score: number, total: number): number {
  return Math.round((score / total) * 100)
}

interface ExamShareCardProps {
  result: ExamResult
  shareUrl: string
  /** When true, shows full share controls (used on /results/[id] page) */
  showSignupCta?: boolean
}

export default function ExamShareCard({
  result,
  shareUrl,
  showSignupCta = false,
}: ExamShareCardProps) {
  const [copied, setCopied] = useState(false)

  const percentage = getPercentage(result.score, result.total)
  const gradeColor = GRADE_COLORS[result.grade] ?? 'text-slate-300'
  const diffBadge = DIFFICULTY_BADGE[result.difficulty] ?? 'bg-slate-500/15 text-slate-300 border-slate-500/30'

  const fullShareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${shareUrl}`
    : `https://shadecodestudent.vercel.app${shareUrl}`

  const shareText = `I scored ${result.score}/${result.total} (${percentage}%) on ${result.subject} ${result.difficulty} on Shadecode Student 🔥\n\nCan you beat me? ${fullShareUrl}`

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullShareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank')
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Result Card */}
      <div className="relative rounded-2xl border border-white/10 bg-[#0f0f14] overflow-hidden shadow-2xl">
        {/* Ambient glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/8 via-transparent to-purple-600/8 pointer-events-none" />

        {/* Header strip */}
        <div className="px-6 pt-6 pb-4 border-b border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-widest text-indigo-400 uppercase">
              ◈ Shadecode Student
            </span>
            <span
              className={cn(
                'text-xs font-medium px-2.5 py-1 rounded-full border',
                diffBadge
              )}
            >
              {result.difficulty}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-6">
          {/* Subject */}
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Subject</p>
            <p className="text-xl font-bold text-white">
              {result.subject}
              {result.topic && (
                <span className="text-slate-400 font-normal text-base ml-2">
                  · {result.topic}
                </span>
              )}
            </p>
          </div>

          {/* Score + Grade */}
          <div className="flex items-end gap-6">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Score</p>
              <p className="text-5xl font-black text-white">
                {result.score}
                <span className="text-2xl text-slate-500 font-semibold">/{result.total}</span>
              </p>
              <p className="text-sm text-slate-400 mt-1">{percentage}%</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Grade</p>
              <p className={cn('text-6xl font-black', gradeColor)}>
                {result.grade}
              </p>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Time', value: formatTime(result.time_taken) },
              { label: 'XP Earned', value: `+${result.xp_earned}` },
              { label: 'Questions', value: `${result.total}Q` },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-xl bg-white/4 border border-white/6 px-3 py-3 text-center"
              >
                <p className="text-xs text-slate-500 mb-1">{label}</p>
                <p className="text-sm font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>

          {/* User name if available */}
          {result.user_name && (
            <p className="text-xs text-slate-500 text-center">
              by <span className="text-slate-300">{result.user_name}</span>
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 space-y-3">
          {/* Share buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 border',
                copied
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
              )}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </button>

            <button
              onClick={handleWhatsApp}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium bg-[#25D366]/15 border border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/25 transition-all duration-200"
            >
              <Share2 className="w-4 h-4" />
              WhatsApp
            </button>
          </div>

          {/* Signup CTA — shown on public /results page only */}
          {showSignupCta && (
            
              href="/auth/signup"
              className="block w-full text-center rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-4 text-sm transition-colors duration-200 mt-1"
            >
              Challenge them on Shadecode →
        </a>
          )}
        </div>
      </div>
    </div>
  )}
