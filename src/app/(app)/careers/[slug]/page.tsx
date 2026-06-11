import { getCareerBySlug } from '@/lib/careers';
import Link from 'next/link';
import FollowCareerButton from '@/components/FollowCareerButton';

export default async function CareerDetailPage({ params }: any) {
  const slug = params.slug;
  const res = await getCareerBySlug(slug);
  if (!res) return <div style={{ padding: 20 }}>Career not found.</div>;
  const { career, skills, recommendedCourses, subjects } = res;

  return (
    <div style={{ padding: 20 }}>
      <h1>{career.title} <span style={{ fontSize: 14, fontWeight: 400 }}><FollowCareerButton slug={slug} /></span></h1>
      <p style={{ maxWidth: 800 }}>{career.description}</p>

      <h3>Required Skills</h3>
      <ul>
        {skills.map((s: any) => (
          <li key={s.skill_id}><strong>{s.skills?.name}</strong> — {s.skills?.description ?? ''} (importance: {s.importance})</li>
        ))}
      </ul>

      <h3>Recommended Courses</h3>
      <ul>
        {recommendedCourses.map((r: any) => {
          const sub = subjects.find((x: any) => x.id === r.subject_id);
          return <li key={r.subject_id}>{sub?.name ? <Link href={`/learn?subjectId=${sub.id}`}>{sub.name}</Link> : r.subject_id} {r.note ? `— ${r.note}` : null}</li>;
        })}
      </ul>

      <h3>Learning Roadmap</h3>
      <p>Suggested path: learn core skills → enroll recommended courses → complete projects and assessments. Use the "Start Course" button on a course page to enroll and track progress.</p>

      <h3>Related Careers</h3>
      <div>{(career.related ?? []).map((rc: any, i: number) => <span key={i} style={{ marginRight: 8 }}>{rc}</span>)}</div>
    </div>
  );
}
