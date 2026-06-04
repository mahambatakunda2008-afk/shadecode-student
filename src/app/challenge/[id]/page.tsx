import { getChallengeBySlug } from '@/lib/challenge'
import { ChallengePlayer } from '@/components/ChallengePlayer'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

interface Props {
  params: { id: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const challenge = await getChallengeBySlug(params.id)
  if (!challenge) return { title: 'Challenge not found' }

  return {
    title: `${challenge.creator_name} challenged you — ${challenge.subject} · Shadecode`,
    description: `${challenge.creator_name} scored ${challenge.creator_score}/${challenge.questions.length} on this ${challenge.subject} ${challenge.difficulty} exam. Can you beat them?`,
    openGraph: {
      title: `Beat ${challenge.creator_name}'s ${challenge.subject} score`,
      description: `They scored ${challenge.creator_score}/${challenge.questions.length}. Try to beat it on Shadecode Student.`,
      images: [`/api/og/challenge?slug=${params.id}`],
    },
  }
}

export default async function ChallengePage({ params }: Props) {
  const challenge = await getChallengeBySlug(params.id)
  if (!challenge) notFound()

  return <ChallengePlayer challenge={challenge} />
}
