import { NextRequest, NextResponse } from 'next/server';
import { markExamWithCortex } from '@/lib/cortex/marking';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const REQUEST_TIMEOUT_MS = 35_000;

type MarkExamPayload = Parameters<typeof markExamWithCortex>[0];

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      const timer = setTimeout(() => reject(new Error('MARKING_TIMEOUT')), ms);
      timer.unref?.();
    }),
  ]);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as MarkExamPayload;

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid marking request.' }, { status: 400 });
    }

    const result = await withTimeout(markExamWithCortex(body), REQUEST_TIMEOUT_MS);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown marking error';

    if (message === 'MARKING_TIMEOUT') {
      return NextResponse.json(
        {
          error: 'Marking took too long to complete.',
          code: 'MARKING_TIMEOUT',
          retryable: true,
        },
        { status: 504 },
      );
    }

    console.error('[cortex/mark-exam]', error);
    return NextResponse.json(
      {
        error: 'Unable to complete marking right now.',
        code: 'MARKING_FAILED',
        retryable: true,
      },
      { status: 502 },
    );
  }
}
