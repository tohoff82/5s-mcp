import crypto from 'node:crypto';

export class DemoSessionStore {
  constructor({ now = () => Date.now() } = {}) {
    this.now = now;
    this.sessions = new Map();
  }

  create() {
    const id = crypto.randomUUID();
    const session = {
      id,
      created_at: this.now(),
      oauth_attempt: null,
      tokens: null,
      mcp: null,
      current: null
    };
    this.sessions.set(id, session);
    return session;
  }

  get(id) {
    return typeof id === 'string' ? this.sessions.get(id) ?? null : null;
  }

  getOrCreate(id) {
    return this.get(id) ?? this.create();
  }

  async destroy(id) {
    const session = this.get(id);
    if (session?.mcp && typeof session.mcp.close === 'function') {
      await session.mcp.close().catch(() => {});
    }
    if (session) {
      session.tokens = null;
      session.oauth_attempt = null;
      session.current = null;
    }
    this.sessions.delete(id);
  }
}
