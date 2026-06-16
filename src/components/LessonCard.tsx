// src/components/LessonCard.tsx
import React from 'react';
import { Card, CardActionArea, CardContent, Typography, Box } from '@mui/material';

interface LessonCardProps {
  lesson: {
    id: string;
    title: string;
    type: string;
    xp: number;
    subject: string;
    createdAt: string;
  };
  onClick: () => void;
}

export default function LessonCard({ lesson, onClick }: LessonCardProps) {
  return (
    <Card sx={{ backgroundColor: 'background.paper', borderRadius: 2, '&:hover': { transform: 'scale(1.02)' }, transition: 'transform 0.2s' }}>
      <CardActionArea onClick={onClick}>
        <CardContent>
          <Typography variant="h6" component="div">
            {lesson.title}
          </Typography>
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {lesson.subject} • {lesson.type}
            </Typography>
          </Box>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" color="primary">
              +{lesson.xp} XP
            </Typography>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

  lesson: {
    id: string;
    title: string;
    type: string;
    xp: number;
    subject: string;
    createdAt: string;
  };
  onClick: () => void;
}

export default function LessonCard({ lesson, onClick }: LessonCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-gray-800 p-4 rounded-lg hover:scale-105 transform transition cursor-pointer"
    >
      <div className="font-semibold text-lg">{lesson.title}</div>
      <div className="text-sm text-gray-400">{lesson.subject} • {lesson.type}</div>
      <div className="mt-2 text-green-400">+{lesson.xp} XP</div>
    </div>
  );
}
