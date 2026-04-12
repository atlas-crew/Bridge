import type { LogEntry } from '@inferno-lab/shared';

export class LogBuffer {
  private buffer: LogEntry[];
  private capacity: number;
  private writeIndex = 0;
  private count = 0;

  constructor(capacity = 1000) {
    this.capacity = capacity;
    this.buffer = new Array(capacity);
  }

  push(entry: LogEntry): void {
    this.buffer[this.writeIndex] = entry;
    this.writeIndex = (this.writeIndex + 1) % this.capacity;
    if (this.count < this.capacity) this.count++;
  }

  getAll(): LogEntry[] {
    if (this.count < this.capacity) {
      return this.buffer.slice(0, this.count);
    }
    // Wrap around — oldest entries start at writeIndex
    return [
      ...this.buffer.slice(this.writeIndex),
      ...this.buffer.slice(0, this.writeIndex),
    ];
  }

  getSince(timestamp: number): LogEntry[] {
    return this.getAll().filter((e) => e.timestamp >= timestamp);
  }

  clear(): void {
    this.writeIndex = 0;
    this.count = 0;
  }
}
