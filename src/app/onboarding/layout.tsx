import type { ReactNode } from 'react';

export const metadata = { title: 'Set up your account — Shadecode Student' };

/**
 * Isolated layout for /onboarding.
 * No sidebar, no dashboard shell — clean canvas.
 */
export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: 'rgb(8,8,12)' }}>
        <div
          style={{
            minHeight:  '100vh',
            width:      '100%',
            display:    'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding:    '48px 16px',
            background: [
              'radial-gradient(ellipse at 15% 15%, rgba(124,58,237,0.09) 0%, transparent 55%)',
              'radial-gradient(ellipse at 85% 85%, rgba(59,130,246,0.05) 0%, transparent 55%)',
              'rgb(8,8,12)',
            ].join(', '),
          }}
        >
          {children}
        </div>
      </body>
    </html>
  );
}
