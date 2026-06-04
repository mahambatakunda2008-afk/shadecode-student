'use client'

import { useRef, useState } from 'react'
import { createChallenge } from '@/lib/challenge'
import { getWhatsAppShareUrl, getCopyUrl } from '@/lib/challenge'
import type { ChallengeQuestion } from '@/lib/challenge'

interface ScoreCardProps {
  subject: string
  difficulty: string
  score: number
  total: number
  questions: ChallengeQuestion[]
  timeUsed?: number // seconds
  userName: string
  userId: string
  onPlayAgain: () => void
  onReviewAnswers: () => void
}

export function ScoreCard({
  subject,
  difficulty,
  score,
  total,
  questions,
  timeUsed,
  userName,
  userId,
  onPlayAgain,
  onReviewAnswers,
}: ScoreCardProps) {
  const [shareSlug, setShareSlug] = useState<string | null>(null)
  const [isCreatingChallenge, setIsCreatingChallenge] = useState(false)
  const [copied, setCopied] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)

  const percentage = Math.round((score / total) * 100)
  const grade = getGrade(percentage)
  const minutes = timeUsed ? Math.floor(timeUsed / 60) : null
  const seconds = timeUsed ? timeUsed % 60 : null

  async function handleShare() {
    setIsCreatingChallenge(true)
    try {
      const slug = await createChallenge(
        questions,
        subject,
        difficulty,
        score,
        userName,
        userId
      )
      setShareSlug(slug)
      setShareOpen(true)
    } catch (err) {
      console.error('Failed to create challenge:', err)
    } finally {
      setIsCreatingChallenge(false)
    }
  }

  async function handleCopy() {
    if (!shareSlug) return
    await navigator.clipboard.writeText(getCopyUrl(shareSlug))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const scoreColor =
    percentage >= 80 ? 'text-green-400' :
    percentage >= 60 ? 'text-yellow-400' :
    'text-red-400'

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Score card — the shareable artifact */}
        <div
          id="score-card-render"
          className="rounded-2xl border border-white/10 bg-[#111118] p-6 mb-4 relative overflow-hidden"
        >
          {/* Background glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div
              className={`absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl opacity-20 ${
                percentage >= 80 ? 'bg-green-500' :
                percentage >= 60 ? 'bg-yellow-500' :
                'bg-red-500'
              }`}
            />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between mb-6 relative">
            <div className="flex items-center gap-2">
              <span className="text-indigo-400 font-mono text-xs">◈</span>
              <span className="text-white/60 text-xs font-medium tracking-wide">SHADECODE STUDENT</span>
            </div>
            <div className="text-white/40 text-xs font-mono">{new Date().toLocaleDateString()}</div>
          </div>

          {/* Score */}
          <div className="text-center mb-6 relative">
            <div className={`text-6xl font-bold ${scoreColor} mb-1 tabular-nums`}>
              {score}/{total}
            </div>
            <div className="text-white/40 text-sm">{percentage}% · {grade}</div>
            {minutes !== null && (
              <div className="text-white/30 text-xs mt-1">
                Completed in {minutes}m {seconds}s
              </div>
            )}
          </div>

          {/* Subject + difficulty */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <span className="bg-indigo-500/20 text-indigo-300 text-xs px-3 py-1 rounded-full border border-indigo-500/30">
              {subject}
            </span>
            <span className="bg-white/5 text-white/50 text-xs px-3 py-1 rounded-full border border-white/10">
              {difficulty}
            </span>
          </div>

          {/* Performance bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-white/40 mb-1.5">
              <span>Performance</span>
              <span>{percentage}%</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  percentage >= 80 ? 'bg-green-500' :
                  percentage >= 60 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          {/* Challenge prompt */}
          <div className="text-center text-white/30 text-xs mt-4">
            Can you beat {userName}&apos;s score?
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          {!shareOpen ? (
            <button
              onClick={handleShare}
              disabled={isCreatingChallenge}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl py-3 px-4 text-sm font-medium transition-all flex items-center justify-center gap-2"
            >
              {isCreatingChallenge ? (
                <>
                  <div className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin" />
                  Creating challenge...
                </>
              ) : (
                <>
                  🔗 Challenge a friend
                </>
              )}
            </button>
          ) : (
            <div className="rounded-xl border border-white/10 bg-[#111118] p-4 space-y-3">
              <div className="text-white/60 text-xs font-medium mb-2">Share your challenge</div>

              {/* Copy link */}
              <div className="flex items-center gap-2 bg-white/5 rounded-lg p-2.5">
                <span className="text-white/40 text-xs font-mono flex-1 truncate">
                  shadecode.app/challenge/{shareSlug}
                </span>
                <button
                  onClick={handleCopy}
                  className="text-xs text-indigo-400 hover:text-indigo-300 shrink-0 font-medium"
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>

              {/* WhatsApp */}
              
                href={getWhatsAppShareUrl(shareSlug!, subject, score, total)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/30 rounded-xl py-2.5 text-sm font-medium transition-all"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Share on WhatsApp
              </a>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onReviewAnswers}
              className="bg-white/5 hover:bg-white/10 text-white/70 rounded-xl py-2.5 text-sm font-medium transition-all border border-white/10"
            >
              Review answers
            </button>
            <button
              onClick={onPlayAgain}
              className="bg-white/5 hover:bg-white/10 text-white/70 rounded-xl py-2.5 text-sm font-medium transition-all border border-white/10"
            >
              Play again
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function getGrade(percentage: number): string {
  if (percentage >= 90) return 'A*'
  if (percentage >= 80) return 'A'
  if (percentage >= 70) return 'B'
  if (percentage >= 60) return 'C'
  if (percentage >= 50) return 'D'
  return 'U'
}
