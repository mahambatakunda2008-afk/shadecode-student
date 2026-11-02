// src/app/results/[id]/opengraph-image.tsx
import { ImageResponse } from 'next/og'
import { getPublicResult } from '@/lib/share/getPublicResult'
import { GRADE_HEX } from '@/lib/share/publicResult'
import { OgBrandMark } from '@/lib/og/OgBrandMark'

// Node.js runtime (Edge runtime is deprecated in Next.js 16)
export const runtime = 'nodejs'
export const alt = 'Shadecode Student Exam Result'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OGImage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  try {
    const { id } = await params
    const result = await getPublicResult(id)

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
          Shadecode Student
        </div>,
        { ...size }
      )
    }

    const pct = result.percentage
    const gradeColor = GRADE_HEX[result.grade] ?? '#94a3b8'

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
          <OgBrandMark size={30} />
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
          </div>

          {/* Right — grade + score */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginLeft: 'auto' }}>
            <span style={{ color: gradeColor, fontSize: 140, fontWeight: 900, lineHeight: 1 }}>
              {result.grade}
            </span>
            <span style={{ color: '#f8fafc', fontSize: 40, fontWeight: 700, marginTop: -8 }}>
              {result.correct}/{result.total}
            </span>
            <span style={{ color: '#64748b', fontSize: 24, marginTop: 8 }}>
              {pct}% correct
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
        Shadecode Student
      </div>,
      { ...size }
    )
  }
}
