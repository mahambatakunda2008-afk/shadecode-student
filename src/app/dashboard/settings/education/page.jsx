import EducationProfileForm from '@/components/profile/EducationProfileForm';

export const metadata = {
  title: 'Education Settings',
  description: 'Manage your tertiary education profile, including institutions, courses, and grades.',
};

export default function EducationSettingsPage() {
  return (
    <div className="container mx-auto p-4">
      <EducationProfileForm />
    </div>
  );
}
