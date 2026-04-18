"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface TimetableSlot {
  id?: string;
  subject: string;
  start_time: string;
  end_time: string;
  is_break: boolean;
}

export default function Timetable() {
  const [subjects, setSubjects] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [duration, setDuration] = useState("60");
  const [breakDuration, setBreakDuration] = useState("10");
  const [schedule, setSchedule] = useState<TimetableSlot[]>([]);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      setUserId(user.id);

      const { data } = await supabase
        .from("timetable")
        .select("*")
        .eq("user_id", user.id)
        .order("start_time");
      if (data && data.length > 0) setSchedule(data);
    };
    init();
  }, []);

  const generateSchedule = () => {
    const subjectList = subjects.split(",").map(s => s.trim()).filter(Boolean);
    if (subjectList.length === 0) return;

    const slots: TimetableSlot[] = [];
    let [hours, minutes] = startTime.split(":").map(Number);

    const addMinutes = (h: number, m: number, mins: number) => {
      const total = h * 60 + m + mins;
      return { h: Math.floor(total / 60) % 24, m: total % 60 };
    };

    const formatTime = (h: number, m: number) =>
      `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

    subjectList.forEach((subject, index) => {
      const start = formatTime(hours, minutes);
      const end_time = addMinutes(hours, minutes, parseInt(duration));
      const end = formatTime(end_time.h, end_time.m);

      slots.push({ subject, start_time: start, end_time: end, is_break: false });

      if (index < subjectList.length - 1) {
        const breakStart = end;
        const breakEnd_time = addMinutes(end_time.h, end_time.m, parseInt(breakDuration));
        const breakEnd = formatTime(breakEnd_time.h, breakEnd_time.m);
        slots.push({ subject: "Break", start_time: breakStart, end_time: breakEnd, is_break: true });
        hours = breakEnd_time.h;
        minutes = breakEnd_time.m;
      } else {
        hours = end_time.h;
        minutes = end_time.m;
      }
    });

    setSchedule(slots);
    setSaved(false);
  };

  const saveSchedule = async () => {
    if (!userId || schedule.length === 0) return;
    setLoading(true);

    await supabase.from("timetable").delete().eq("user_id", userId);
    await supabase.from("timetable").insert(
      schedule.map(slot => ({ ...slot, user_id: userId }))
    );

    setSaved(true);
    setLoading(false);
  };

  return (
    <div className="container">
      {/* Header */}
      <div className="header">
        <h1 className="title">Timetable</h1>
        <p className="subtitle">
          Generate your smart study schedule
        </p>
      </div>

      {/* Generator */}
      <div className="card">
        <p className="card-title">Generate Schedule</p>
        <div className="form">
          <div>
            <label htmlFor="subjects" className="label">Subjects (comma separated)</label>
            <input
              id="subjects"
              type="text"
              placeholder="e.g. Math, Physics, English"
              title="Subjects"
              value={subjects}
              onChange={(e) => setSubjects(e.target.value)}
              className="input"
            />
          </div>

          <div className="grid">
            <div>
              <label htmlFor="startTime" className="label">Start Time</label>
              <input
                id="startTime"
                type="time"
                placeholder="08:00"
                title="Start Time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label htmlFor="duration" className="label">Study (mins)</label>
              <input
                id="duration"
                type="number"
                placeholder="60"
                title="Study Duration in minutes"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label htmlFor="breakDuration" className="label">Break (mins)</label>
              <input
                id="breakDuration"
                type="number"
                placeholder="10"
                title="Break Duration in minutes"
                value={breakDuration}
                onChange={(e) => setBreakDuration(e.target.value)}
                className="input"
              />
            </div>
          </div>

          <button
            onClick={generateSchedule}
            className="generate-button"
          >
            Generate Schedule
          </button>
        </div>
      </div>

      {/* Schedule */}
      {schedule.length > 0 && (
        <div className="card">
          <div className="schedule-header">
            <p className="schedule-title">Your Plan</p>
            <button
              onClick={saveSchedule}
              disabled={loading || saved}
              className={`save-button ${saved ? 'saved' : ''} ${loading ? 'loading' : ''}`}
            >
              {saved ? "✓ Saved" : loading ? "Saving..." : "Save"}
            </button>
          </div>

          <div className="slots">
            {schedule.map((slot, index) => (
              <div key={index} className={`slot ${slot.is_break ? 'break' : 'study'}`}>
                <p className="slot-subject">
                  {slot.is_break ? "☕ Break" : slot.subject}
                </p>
                <p className="slot-time">
                  {slot.start_time} - {slot.end_time}
                </p>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="summary">
            <p className="summary-item">
              📚 {schedule.filter(s => !s.is_break).length} subjects
            </p>
            <p className="summary-item">
              ☕ {schedule.filter(s => s.is_break).length} breaks
            </p>
            <p className="summary-item">
              ⏱ {schedule.filter(s => !s.is_break).length * parseInt(duration)} mins
            </p>
          </div>
        </div>
      )}
    </div>
  );
}