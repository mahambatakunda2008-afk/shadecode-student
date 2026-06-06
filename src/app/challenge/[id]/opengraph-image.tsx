// src/app/challenge/[id]/opengraph-image.tsx
import { ImageResponse } from 'next/og'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime     = 'edge'
export const alt         = 'Shadecode Student Challenge'
export const size        = { width: 1200, height: 630 }
export const contentType = 'image/png'

const GRADE_COLORS: Record<string, string> = {
  'A*': '#34d399', 'A': '#34d399', 'B': '#60a5fa',
  'C': '#facc15',  'D': '#fb923c', 'E': '#f97316', 'U': '#f87171',
}

export default async function OGImage({ params }: { params: { id: string } }) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: c } = await supabase
      .from('challenges')
      .select('*')
      .eq('id', params.id)
      .single()

    if (!c) throw new Error('not found')

    const gc   = GRADE_COLORS[c.grade] ?? '#94a3b8'
    const name = c.challenger_name ?? 'A student'

    return new ImageResponse(
      <div style={{ background: '#08080c', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '60px 80px', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 25% 0%, rgba(249,115,22,0.14) 0%, transparent 50%), radial-gradient(ellipse at 85% 100%, rgba(99,102,241,0.1) 0%, transparent 55%)' }} />

        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 50 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: '#6366f1', fontSize: 22, fontWeight: 800 }}>◈</span>
            <span style={{ color: '#64748b', fontSize: 18, fontWeight: 600 }}>Shadecode Student</span>
          </div>
          <div style={{ background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 999, padding: '8px 22px', color: '#fb923c', fontSize: 15, fontWeight: 700 }}>
            🔥 CHALLENGE
          </div>
        </div>

        {/* Main content */}
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 560 }}>
            <span style={{ color: '#64748b', fontSize: 20 }}>{name} scored</span>
            <span style={{ color: '#f8fafc', fontSize: 58, fontWeight: 900, lineHeight: 1 }}>{c.subject}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 4 }}>
              <span style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 999, padding: '6px 18px', color: '#a78bfa', fontSize: 15, fontWeight: 600 }}>
                {c.difficulty}
              </span>
              <span style={{ color: '#334155', fontSize: 18 }}>·</span>
              <span style={{ color: '#475569', fontSize: 18 }}>{c.question_count} questions</span>
            </div>
            <span style={{ color: '#f97316', fontSize: 24, fontWeight: 700, marginTop: 8 }}>
              Can you beat it? →
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ color: gc, fontSize: 130, fontWeight: 900, lineHeight: 1 }}>{c.percentage}%</span>
            <span style={{ color: '#94a3b8', fontSize: 38, fontWeight: 700, marginTop: -8 }}>
              Grade {c.grade}
            </span>
          </div>
        </div>

        {/* CTA strip */}
        <div style={{ marginTop: 44, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 12, padding: '16px 26px', color: '#a5b4fc', fontSize: 17, fontWeight: 600 }}>
          Accept at shadecodestudent.vercel.app/challenge/{params.id} →
        </div>
      </div>,
      { ...size }
    )
  } catch {
    return new ImageResponse(
      <div style={{ background: '#08080c', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1', fontSize: 32, fontWeight: 700 }}>
        ◈ Shadecode Student · Challenge
      </div>,
      { ...size }
    )
  }
}
