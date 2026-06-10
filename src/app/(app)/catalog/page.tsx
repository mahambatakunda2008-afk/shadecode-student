import CourseCatalog from '@/components/CourseCatalog';

export default function CatalogPage() {
  return (
    <div style={{ minHeight: '100vh', padding: 24 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <h1 style={{ marginBottom: 12 }}>Course Catalog</h1>
        <p style={{ marginBottom: 20, color: 'var(--muted-foreground)' }}>Browse courses across categories. Search, filter, preview and enroll.</p>
        <CourseCatalog />
      </div>
    </div>
  );
}
