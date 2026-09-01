import type { LocalRecord } from "./types";
import { localFirstStore } from "./store";
import type { MemoryEntry } from "@/lib/cortex/memory";

const MAX_PER_USER = 50;
const key = (userId: string, question: string) => `cortex-interaction:${userId}:${stableHash(question.trim().toLowerCase())}`;
function requireUser(userId: string) { if (!userId?.trim()) throw new Error("Cortex interaction memory requires an authenticated user"); }
function stableHash(value: string): string { let hash = 2166136261; for (let i = 0; i < value.length; i += 1) { hash ^= value.charCodeAt(i); hash = Math.imul(hash, 16777619); } return (hash >>> 0).toString(36); }
export async function saveLocalCortexInteraction(userId: string, entry: MemoryEntry): Promise<LocalRecord<MemoryEntry>> { requireUser(userId); const question = entry.question.trim(); const answer = entry.answer.trim(); if (!question || !answer || entry.userId !== userId) throw new Error("Invalid Cortex interaction"); return localFirstStore.upsert({ id: key(userId, question), entity: "insight", entityId: key(userId, question), userId, payload: { ...entry, userId, question, answer } }); }
export async function listLocalCortexInteractions(userId: string, limit = MAX_PER_USER): Promise<MemoryEntry[]> { requireUser(userId); const records = await localFirstStore.list<MemoryEntry>("insight", userId); return records.filter((record) => record.id.startsWith(`cortex-interaction:${userId}:`) && !record.deletedAt && record.payload?.userId === userId).sort((a, b) => new Date(a.payload.timestamp).getTime() - new Date(b.payload.timestamp).getTime()).slice(-Math.max(1, Math.min(limit, MAX_PER_USER))).reverse().map((record) => record.payload); }
export async function clearLocalCortexInteractions(userId: string): Promise<void> { requireUser(userId); const records = await localFirstStore.list<MemoryEntry>("insight", userId); for (const record of records) if (record.id.startsWith(`cortex-interaction:${userId}:`)) await localFirstStore.remove({ id: record.id, entity: "insight", userId }); }
