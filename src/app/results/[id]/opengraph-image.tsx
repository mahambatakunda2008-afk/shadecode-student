// src/app/results/[id]/opengraph-image.tsx
import { ImageResponse } from 'next/og'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// Node.js runtime (Edge runtime is deprecated in Next.js 16)
export const runtime = 'nodejs'
export const alt = 'Shadecode Student Exam Result'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const GRADE_COLORS: Record<string, string> = {
  'A+': '#34d399',
  'A':  '#34d399',
  'B':  '#60a5fa',
  'C':  '#facc15',
  'D':  '#fb923c',
  'F':  '#f87171',
}

export default async function OGImage({
  params,
}: {
  params: { id: string }
}) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: result } = await supabase
      .from('exam_results')
      .select('*')
      .eq('id', params.id)
      .single()

    if (!result) {
      return new ImageResponse(
        <div
          style={{
            background: '#08080c',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#6366f1',
            fontSize: 32,
            fontWeight: 700,
          }}
        >
          ◈ Shadecode Student
        </div>,
        { ...size }
      )
    }

    const pct = Math.round((result.score / result.total) * 100)
    const gradeColor = GRADE_COLORS[result.grade] ?? '#94a3b8'

    return new ImageResponse(
      <div
        style={{
          background: '#08080c',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '60px 80px',
          position: 'relative',
        }}
      >
        {/* Ambient gradient */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.12) 0%, transparent 60%)',
          }}
        />

        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 }}>
          <span style={{ color: '#6366f1', fontSize: 24, fontWeight: 800 }}>◈</span>
          <span style={{ color: '#94a3b8', fontSize: 20, fontWeight: 600 }}>Shadecode Student</span>
        </div>

        {/* Main content */}
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', gap: 80 }}>
          {/* Left — score block */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 16,
                padding: '12px 20px',
                display: 'inline-flex',
                color: '#a5b4fc',
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              {result.difficulty}
            </div>

            <span style={{ color: '#f8fafc', fontSize: 52, fontWeight: 900, lineHeight: 1 }}>
              {result.subject}
            </span>

            {result.topic && (
              <span style={{ color: '#64748b', fontSize: 24, fontWeight: 400 }}>
                {result.topic}
              </span>
            )}

            {result.user_name && (
              <span style={{ color: '#64748b', fontSize: 20 }}>
                by{' '}
                <span style={{ color: '#94a3b8', fontWeight: 600 }}>{result.user_name}</span>
              </span>
            )}
          </div>

          {/* Right — grade + score */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginLeft: 'auto' }}>
            <span style={{ color: gradeColor, fontSize: 140, fontWeight: 900, lineHeight: 1 }}>
              {result.grade}
            </span>
            <span style={{ color: '#f8fafc', fontSize: 40, fontWeight: 700, marginTop: -8 }}>
              {result.score}/{result.total}
            </span>
            <span style={{ color: '#64748b', fontSize: 24, marginTop: 8 }}>
              {pct}% · +{result.xp_earned} XP
            </span>
          </div>
        </div>

        {/* Bottom CTA */}
        <div
          style={{
            marginTop: 40,
            background: 'rgba(99,102,241,0.15)',
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: 12,
            padding: '16px 24px',
            color: '#a5b4fc',
            fontSize: 18,
            fontWeight: 600,
          }}
        >
          Challenge them at shadecodestudent.vercel.app →
        </div>
      </div>,
      { ...size }
    )
  } catch {
    return new ImageResponse(
      <div
        style={{
          background: '#08080c',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6366f1',
          fontSize: 32,
          fontWeight: 700,
        }}
      >
        ◈ Shadecode Student
      </div>,
      { ...size }
    )
  }
}
