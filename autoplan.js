// Simple, useful planner: turns tasks + timetable into today's plan

/**
 * Task:
 * { id, title, durationMin, dueDate (ISO), priority (1-5), subject }
 *
 * TimetableSlot:
 * { start: "HH:MM", end: "HH:MM" }  // available study window
 */

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function fromMinutes(min) {
  const h = Math.floor(min / 60).toString().padStart(2, "0");
  const m = (min % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function urgencyScore(task) {
  const now = Date.now();
  const due = new Date(task.dueDate).getTime();
  const daysLeft = Math.max(0.1, (due - now) / (1000 * 60 * 60 * 24));
  // higher score = more urgent
  return (task.priority || 3) * (1 / daysLeft);
}

function sortTasks(tasks) {
  return [...tasks].sort((a, b) => urgencyScore(b) - urgencyScore(a));
}

function chunkTask(task, maxBlock = 45) {
  const chunks = [];
  let remaining = task.durationMin;
  while (remaining > 0) {
    const block = Math.min(maxBlock, remaining);
    chunks.push({ ...task, blockMin: block });
    remaining -= block;
  }
  return chunks;
}

function buildPlan(tasks, timetable) {
  const ordered = sortTasks(tasks)
    .flatMap(t => chunkTask(t)); // break into focus blocks

  const plan = [];
  let i = 0;

  for (const slot of timetable) {
    let t = toMinutes(slot.start);
    const end = toMinutes(slot.end);

    while (i < ordered.length && t < end) {
      const block = ordered[i].blockMin;
      const finish = Math.min(end, t + block);

      plan.push({
        taskId: ordered[i].id,
        title: ordered[i].title,
        subject: ordered[i].subject,
        start: fromMinutes(t),
        end: fromMinutes(finish),
        minutes: finish - t
      });

      t = finish;
      if (finish - (t - block) >= block) i++; // move to next chunk when full block placed

      // small break between blocks
      if (t + 5 < end) {
        plan.push({ type: "break", start: fromMinutes(t), end: fromMinutes(t + 5), minutes: 5 });
        t += 5;
      }
    }
  }

  return plan;
}

// Demo runner
if (require.main === module) {
  const tasks = [
    { id: "t1", title: "Biology revision", durationMin: 90, dueDate: "2026-04-25", priority: 5, subject: "Bio" },
    { id: "t2", title: "Math homework", durationMin: 60, dueDate: "2026-04-23", priority: 4, subject: "Math" },
    { id: "t3", title: "History notes", durationMin: 45, dueDate: "2026-04-27", priority: 3, subject: "Hist" }
  ];

  const timetable = [
    { start: "16:00", end: "18:00" },
    { start: "19:00", end: "20:30" }
  ];

  const plan = buildPlan(tasks, timetable);
  console.log("\n📅 TODAY PLAN");
  for (const p of plan) {
    if (p.type === "break") {
      console.log(`🧊 Break  ${p.start}–${p.end} (${p.minutes}m)`);
    } else {
      console.log(`📘 ${p.title}  ${p.start}–${p.end} (${p.minutes}m)`);
    }
  }
}

module.exports = { buildPlan };