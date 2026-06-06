// src/app/results/[id]/page.tsx
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import ExamShareCard, { ExamResult } from '@/components/ExamShareCard'
import Link from 'next/link'

interface Props {
  params: Promise<{ id: string }>
}

async function getResult(id: string): Promise<ExamResult | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('exam_results')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return null
  return data as ExamResult
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const result = await getResult(id)

  if (!result) {
    return { title: 'Result not found — Shadecode Student' }
  }

  const pct = Math.round((result.score / result.total) * 100)
  const name = result.user_name ? `${result.user_name} scored` : 'Someone scored'

  return {
    title: `${name} ${pct}% on ${result.subject} ${result.difficulty} — Shadecode Student`,
    description: `${result.score}/${result.total} · Grade ${result.grade} · ${result.difficulty} · Can you beat this?`,
    openGraph: {
      title: `${pct}% on ${result.subject} ${result.difficulty} 🔥`,
      description: `Grade ${result.grade} · ${result.score}/${result.total} questions correct. Challenge them on Shadecode Student.`,
      url: `https://shadecodestudent.vercel.app/results/${id}`,
      siteName: 'Shadecode Student',
      images: [
        {
          url: `https://shadecodestudent.vercel.app/results/${id}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: `${result.subject} exam result`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${pct}% on ${result.subject} ${result.difficulty}`,
      description: `Grade ${result.grade} on Shadecode Student. Can you beat it?`,
    },
  }
}

export default async function ResultPage({ params }: Props) {
  const { id } = await params
  const result = await getResult(id)

  if (!result) notFound()

  return (
    <main className="min-h-screen bg-[#08080c] flex flex-col items-center justify-center px-4 py-12">
      {/* Brand header */}
      <Link
        href="/"
        className="flex items-center gap-2 mb-10 text-indigo-400 hover:text-indigo-300 transition-colors"
      >
        <span className="text-xl font-bold tracking-tight">◈ Shadecode Student</span>
      </Link>

      {/* Eyebrow */}
      <p className="text-sm text-slate-500 mb-6 text-center">
        {result.user_name
          ? <><span className="text-slate-300 font-medium">{result.user_name}</span> just completed an exam</>
          : 'Exam result'}
      </p>

      {/* The card */}
      <ExamShareCard
        result={result}
        shareUrl={`/results/${id}`}
        showSignupCta
      />

      {/* Footer nudge */}
      <p className="mt-8 text-xs text-slate-600 text-center max-w-xs">
        Free AI-powered exam practice across 14 subjects.{' '}
        <Link href="/auth/signup" className="text-indigo-400 hover:text-indigo-300">
          Start studying →
        </Link>
      </p>
    </main>
  )
}
