"use client";

// src/components/CourseCatalog.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { CATALOG, type Course, type CourseCategory } from '@/lib/catalog';
import ProgressBar from '@/components/ProgressBar';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { Box, Grid, TextField, FormControl, InputLabel, Select, MenuItem, Typography, IconButton, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

export default function CourseCatalog() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'all' | CourseCategory>('all');
  const [enrolled, setEnrolled] = useState<Record<string, boolean>>({});
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [previewCourse, setPreviewCourse] = useState<Course | null>(null);

  // Load enrolled from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('catalog.enrolled');
      if (raw) setEnrolled(JSON.parse(raw));
    } catch {}
  }, []);

  // Sync enrolled to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('catalog.enrolled', JSON.stringify(enrolled));
    } catch {}
  }, [enrolled]);

  // Load server enrollments and progress
  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoadingProgress(true);
      try {
        const sb = createClient();
        const { data: { session } } = await sb.auth.getSession();
        if (!session) {
          setProgressMap({});
          setLoadingProgress(false);
          return;
        }
        const token = session.access_token;
        // Enrollments
        try {
          const er = await fetch('/api/catalog/enroll');
          if (er.ok) {
            const ed = await er.json();
            if (mounted && ed?.enrolled) {
              setEnrolled(prev => ({ ...prev, ...Object.fromEntries(ed.enrolled.map((id: string) => [id, true])) }));
            }
          }
        } catch {}
        // Progress
        const r = await fetch('/api/learn', { headers: { Authorization: `Bearer ${token}` } });
        if (!r.ok) {
          setProgressMap({});
          setLoadingProgress(false);
          return;
        }
        const d = await r.json();
        const lessons = d.lessons ?? [];
        const bySubject: Record<string, { sum: number; count: number }> = {};
        for (const l of lessons) {
          const subj = l.subject ?? l.subjectId ?? 'Unknown';
          bySubject[subj] = bySubject[subj] ?? { sum: 0, count: 0 };
          bySubject[subj].sum += l.progress ?? 0;
          bySubject[subj].count += 1;
        }
        const map: Record<string, number> = {};
        for (const c of CATALOG) {
          const match = Object.keys(bySubject).find(k => k.toLowerCase() === c.title.toLowerCase());
          if (match) {
            map[c.id] = Math.round(bySubject[match].sum / Math.max(1, bySubject[match].count));
          }
        }
        if (mounted) setProgressMap(map);
      } catch (e) {
        console.error('Failed to load progress:', e);
      } finally {
        if (mounted) setLoadingProgress(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const categories = useMemo(() => {
    const set = new Set<CourseCategory>(CATALOG.map(c => c.category));
    return ['all', ...Array.from(set)] as ('all' | CourseCategory)[];
  }, []);

  const filtered = useMemo(() => {
    return CATALOG.filter(c => {
      if (category !== 'all' && c.category !== category) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return c.title.toLowerCase().includes(q) || c.shortDescription.toLowerCase().includes(q);
    });
  }, [query, category]);

  async function toggleEnroll(id: string) {
    setEnrolled(prev => ({ ...prev, [id]: !prev[id] }));
    try {
      const sb = createClient();
      const { data: { session } } = await sb.auth.getSession();
      if (!session) return;
      const token = session.access_token;
      const res = await fetch('/api/catalog/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ courseId: id }),
      });
      if (res.ok) {
        const j = await res.json();
        const setObj = Object.fromEntries((j.enrolled ?? []).map((c: string) => [c, true]));
        setEnrolled(prev => ({ ...prev, ...setObj }));
      }
    } catch {}
  }

  return (
    <Box sx={{ p: 2, maxWidth: 'lg', mx: 'auto' }}>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField label="Search courses" value={query} onChange={e => setQuery(e.target.value)} size="small" fullWidth />
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel id="category-label">Category</InputLabel>
          <Select labelId="category-label" value={category} label="Category" onChange={e => setCategory(e.target.value as any)}>
            {categories.map(cat => (
              <MenuItem key={String(cat)} value={String(cat)}>{String(cat)}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      <Grid container spacing={2}>
        {filtered.map(course => (
          <Grid item xs={12} sm={6} key={course.id}>
            <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 2, border: 1, borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1" fontWeight="medium">{course.title}</Typography>
                <Typography variant="caption" color="text.secondary">{course.category}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{course.shortDescription}</Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary">Progress</Typography>
                <ProgressBar value={progressMap[course.id] ?? 0} max={100} />
                <Typography variant="caption" sx={{ mt: 0.5, display: 'block' }}>
                  {loadingProgress ? 'Loading...' : `${progressMap[course.id] ?? 0}%`}
                </Typography>
              </Box>
              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button size="sm" variant={enrolled[course.id] ? 'outline' : 'default'} onClick={() => toggleEnroll(course.id)}>
                  {enrolled[course.id] ? 'Enrolled' : 'Enroll'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setPreviewCourse(course)}>
                  Preview
                </Button>
              </Box>
            </Box>
          </Grid>
        ))}
      </Grid>
      {/* Preview Dialog */}
      <Dialog open={!!previewCourse} onClose={() => setPreviewCourse(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {previewCourse?.title}
          <IconButton edge="end" onClick={() => setPreviewCourse(null)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" gutterBottom>{previewCourse?.shortDescription}</Typography>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Typography variant="caption">Lessons: {previewCourse?.lessons}</Typography>
            <Typography variant="caption">XP est: {previewCourse?.xpEstimate ?? 0}</Typography>
            <Typography variant="caption">Category: {previewCourse?.category}</Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button size="sm" variant={previewCourse && enrolled[previewCourse.id] ? 'outline' : 'default'} onClick={() => previewCourse && toggleEnroll(previewCourse.id)}>
            {previewCourse && enrolled[previewCourse.id] ? 'Enrolled' : 'Enroll'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
