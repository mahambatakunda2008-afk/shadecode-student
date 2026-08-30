// src/app/challenge/[id]/page.tsx
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { BrandMark } from '@/components/brand/BrandMark'

interface Challenge {
  id: string
  challenger_name: string | null
  subject: string
  topic: string | null
  difficulty: string
  question_count: number
  percentage: number
  total_score: number
  max_score: number
  time_taken: number
  grade: string
  created_at: string
}

interface Props {
  params: Promise<{ id: string }>
}

async function getChallenge(id: string): Promise<Challenge | null> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', id)
    .single()
  if (error || !data) return null
  return data as Challenge
}

const GRADE_COLORS: Record<string, string> = {
  'A*': '#34d399', 'A': '#34d399', 'B': '#60a5fa',
  'C': '#facc15',  'D': '#fb923c', 'E': '#f97316', 'U': '#f87171',
}

const DIFF_BADGE: Record<string, string> = {
  'O-Level':    'bg-blue-500/15 text-blue-300 border-blue-500/30',
  'Ordinary':   'bg-blue-500/15 text-blue-300 border-blue-500/30',
  'A-Level':    'bg-purple-500/15 text-purple-300 border-purple-500/30',
  'Advanced':   'bg-purple-500/15 text-purple-300 border-purple-500/30',
  'University': 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  'Challenge':  'bg-rose-500/15 text-rose-300 border-rose-500/30',
}

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const c = await getChallenge(id)
  if (!c) return { title: 'Challenge not found — Shadecode Student' }
  const name = c.challenger_name ?? 'Someone'
  return {
    title: `${name} scored ${c.percentage}% on ${c.subject} — can you beat it? | Shadecode Student`,
    description: `Grade ${c.grade} · ${c.difficulty} · ${c.question_count} questions. Accept the challenge free on Shadecode Student.`,
    openGraph: {
      title:       `${name} scored ${c.percentage}% on ${c.subject}. Can you beat it?`,
      description: `Grade ${c.grade} · ${c.difficulty} · Accept the challenge free.`,
      url:         `https://shadecodestudent.vercel.app/challenge/${id}`,
      siteName:    'Shadecode Student',
      images: [{ url: `https://shadecodestudent.vercel.app/challenge/${id}/opengraph-image`, width: 1200, height: 630 }],
    },
    twitter: {
      card:        'summary_large_image',
      title:       `${name} challenged you on ${c.subject}!`,
      description: `They scored ${c.percentage}%. Can you beat it?`,
    },
  }
}

export default async function ChallengePage({ params }: Props) {
  const { id } = await params
  const c = await getChallenge(id)
  if (!c) notFound()

  const gc   = GRADE_COLORS[c.grade] ?? '#94a3b8'
  const diff = DIFF_BADGE[c.difficulty] ?? 'bg-slate-500/15 text-slate-300 border-slate-500/30'
  const name = c.challenger_name ?? 'A student'

  const acceptUrl = `/exam-sim?cid=${id}&sub=${encodeURIComponent(c.subject)}&dif=${encodeURIComponent(c.difficulty)}&cnt=${c.question_count}&cpct=${c.percentage}&cgrade=${c.grade}&cname=${encodeURIComponent(name)}`

  const whatsappText = encodeURIComponent(
    `${name} scored ${c.percentage}% (Grade ${c.grade}) on ${c.subject} ${c.difficulty} on Shadecode Student 🔥\n\nCan you beat it? ${`https://shadecodestudent.vercel.app/challenge/${id}`}`
  )

  return (
    <main className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center px-4 py-12">

      {/* Brand */}
      <Link href="/" className="flex items-center gap-2 mb-10 text-[#67E8F9] hover:text-[#22D3EE] transition-colors">
        <BrandMark className="h-6 w-6 text-[#22D3EE]" aria-hidden="true" />
        <span className="text-xl font-bold tracking-tight">Shadecode Student</span>
      </Link>

      <div className="w-full max-w-md space-y-6">

        {/* Eyebrow */}
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-widest mb-4">
            🔥 Challenge
          </span>
          <h1 className="text-2xl font-black text-white">
            {name} challenged you!
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Can you beat their {c.subject} score?
          </p>
        </div>

        {/* Score card */}
        <div className="relative rounded-2xl border border-white/10 bg-[var(--surface)] overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-[#22D3EE]/6 via-transparent to-[#7A3CFF]/6 pointer-events-none" />

          <div className="px-6 pt-5 pb-4 border-b border-white/5 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Subject</p>
              <p className="text-base font-bold text-white">{c.subject}</p>
              {c.topic && <p className="text-xs text-slate-500 mt-0.5">{c.topic}</p>}
            </div>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${diff}`}>
              {c.difficulty}
            </span>
          </div>

          <div className="px-6 py-6">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
              {name}&apos;s score to beat
            </p>
            <div className="flex items-end justify-between mb-5">
              <div>
                <p className="text-6xl font-black leading-none" style={{ color: gc }}>
                  {c.percentage}%
                </p>
                <p className="text-slate-500 text-sm mt-1.5">
                  {c.total_score}/{c.max_score} marks
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 mb-1">Grade</p>
                <p className="text-5xl font-black" style={{ color: gc }}>
                  {c.grade}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Time',      value: formatTime(c.time_taken) },
                { label: 'Questions', value: `${c.question_count}Q`   },
                { label: 'Topic',     value: c.topic ?? 'Mixed'       },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl bg-white/4 border border-white/6 px-2 py-2.5 text-center">
                  <p className="text-xs text-slate-500 mb-1">{label}</p>
                  <p className="text-xs font-semibold text-white truncate">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTAs */}
        <div className="space-y-3">
          <Link
            href={acceptUrl}
            className="block w-full text-center rounded-xl bg-[#22D3EE] hover:bg-[#67E8F9] text-[#06111C] font-bold py-4 px-4 text-base transition-colors duration-200 shadow-[0_0_24px_rgba(34,211,238,0.3)]"
          >
            Accept Challenge →
          </Link>
          
           <a href={`https://wa.me/?text=${whatsappText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full text-center rounded-xl bg-[#25D366]/10 border border-[#25D366]/25 text-[#25D366] font-medium py-3 px-4 text-sm transition-colors duration-200 hover:bg-[#25D366]/20"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Share Challenge on WhatsApp
          </a>
        </div>

        <p className="text-center text-xs text-slate-600">
          Free · No card required ·{' '}
          <Link href="/auth/signup" className="text-[#67E8F9] hover:text-[#22D3EE]">
            Create account to track your score
          </Link>
        </p>
      </div>
    </main>
  )
}
