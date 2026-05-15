interface SubjectDropdownProps {
  subjects: string[];
  selected: string;
  onSelect: (subject: string) => void;
}

export default function SubjectDropdown({ subjects, selected, onSelect }: SubjectDropdownProps) {
  return (
    <select
      className="bg-gray-700 p-2 rounded w-full"
      value={selected}
      onChange={(e) => onSelect(e.target.value)}
    >
      {subjects.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  );
}
