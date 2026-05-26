export class MockSocket {
  constructor() {
    this.handlers = new Map();
    this.emitted = [];
  }

  on(event, handler) {
    const handlers = this.handlers.get(event) || [];
    handlers.push(handler);
    this.handlers.set(event, handlers);
    return this;
  }

  off(event, handler) {
    if (!this.handlers.has(event)) return this;
    if (!handler) {
      this.handlers.delete(event);
      return this;
    }
    const handlers = this.handlers.get(event).filter((candidate) => candidate !== handler);
    if (handlers.length) this.handlers.set(event, handlers);
    else this.handlers.delete(event);
    return this;
  }

  emit(event, ...args) {
    this.emitted.push({ event, args });
    return this;
  }

  serverEmit(event, ...args) {
    for (const handler of this.handlers.get(event) || []) {
      handler(...args);
    }
  }

  lastEmit(event) {
    const matches = this.emitted.filter((entry) => entry.event === event);
    return matches[matches.length - 1] || null;
  }
}
