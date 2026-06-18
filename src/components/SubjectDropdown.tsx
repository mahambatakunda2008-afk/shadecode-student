import React from 'react';
import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';

interface SubjectDropdownProps {
  subjects: string[];
  selected: string;
  onSelect: (subject: string) => void;
}

export default function SubjectDropdown({ subjects, selected, onSelect }: SubjectDropdownProps) {
  return (
    <FormControl fullWidth variant="outlined" sx={{ mt: 1 }}>
      <InputLabel id="subject-select-label">Subject</InputLabel>
      <Select
        labelId="subject-select-label"
        value={selected}
        label="Subject"
        onChange={(e) => onSelect(e.target.value as string)}
        sx={{ backgroundColor: 'background.paper' }}
      >
        {subjects.map((s) => (
          <MenuItem key={s} value={s}>
            {s}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
