import type { MemoryQuery, MemoryRecord, MemoryWriteInput } from "./types";

export interface MemoryStore {
  list(query?: MemoryQuery): MemoryRecord[];
  findById(id: string): MemoryRecord | null;
  create(input: MemoryWriteInput): MemoryRecord;
  update(id: string, input: Partial<MemoryWriteInput>): MemoryRecord | null;
  delete(id: string): boolean;
}
