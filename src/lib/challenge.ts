import { createClient } from '@/lib/supabase/client'

export interface ChallengeQuestion {
  id: string
  question: string
  options: string[]
  correctIndex: number
  explanation?: string
}

export interface Challenge {
  id: string
  slug: string
  subject: string
  difficulty: string
  questions: ChallengeQuestion[]
  creator_score: number
  creator_name: string
  creator_id: string
  created_at: string
  attempt_count: number
}

export interface ChallengeAttempt {
  challenge_id: string
  user_id?: string
  guest_name?: string
  score: number
  answers: number[]
  completed_at: string
}

/** Generates a short slug like "phys-a2-k7m9" */
export function generateSlug(subject: string): string {
  const prefix = subject.slice(0, 4).toLowerCase().replace(/\s/g, '')
  const rand = Math.random().toString(36).slice(2, 6)
  return `${prefix}-${rand}`
}

/** Creates a challenge in Supabase and returns the slug */
export async function createChallenge(
  questions: ChallengeQuestion[],
  subject: string,
  difficulty: string,
  creatorScore: number,
  creatorName: string,
  creatorId: string
): Promise<string> {
  const supabase = createClient()
  const slug = generateSlug(subject)

  const { error } = await supabase.from('challenges').insert({
    slug,
    subject,
    difficulty,
    questions,
    creator_score: creatorScore,
    creator_name: creatorName,
    creator_id: creatorId,
    attempt_count: 0,
  })

  if (error) throw error
  return slug
}

/** Loads a challenge by slug — no auth required */
export async function getChallengeBySlug(slug: string): Promise<Challenge | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('challenges')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error || !data) return null
  return data as Challenge
}

/** Records an attempt — works for guests (no user_id) */
export async function recordAttempt(attempt: ChallengeAttempt): Promise<void> {
  const supabase = createClient()
  await supabase.from('challenge_attempts').insert(attempt)
  // Increment attempt count
  await supabase.rpc('increment_challenge_attempts', { slug_param: attempt.challenge_id })
}

/** Gets the WhatsApp share URL for a challenge */
export function getWhatsAppShareUrl(slug: string, subject: string, score: number, total: number): string {
  const challengeUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/challenge/${slug}`
  const text = encodeURIComponent(
    `I scored ${score}/${total} on this ${subject} exam on Shadecode Student 📚🔥\n\nCan you beat me? Try it here:\n${challengeUrl}\n\n#ShadecodStudent #${subject.replace(/\s/g, '')}`
  )
  return `https://wa.me/?text=${text}`
}

export function getCopyUrl(slug: string): string {
  return `${process.env.NEXT_PUBLIC_SITE_URL}/challenge/${slug}`
}
