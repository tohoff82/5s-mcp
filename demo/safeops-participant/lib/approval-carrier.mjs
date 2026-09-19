import crypto from 'node:crypto';

export class ApprovalCarrier {
  constructor({ ttlMs = 60_000, now = () => Date.now() } = {}) {
    this.ttlMs = ttlMs;
    this.now = now;
    this.pending = new Map();
    this.armed = null;
  }

  issue({ sessionId, workflowId, planId }) {
    requireScope({ sessionId, workflowId, planId });
    const nonce = crypto.randomBytes(24).toString('base64url');
    const record = Object.freeze({
      nonce,
      sessionId,
      workflowId,
      planId,
      expiresAt: this.now() + this.ttlMs
    });
    this.pending.set(nonce, record);
    return record;
  }

  arm({ sessionId, workflowId, planId, nonce }) {
    requireScope({ sessionId, workflowId, planId });
    const record = this.pending.get(nonce);
    if (!record) throw new Error('Approval event is missing or already consumed');
    if (record.expiresAt <= this.now()) {
      this.pending.delete(nonce);
      throw new Error('Approval event expired');
    }
    if (record.sessionId !== sessionId || record.workflowId !== workflowId || record.planId !== planId) {
      throw new Error('Approval event scope mismatch');
    }
    this.pending.delete(nonce);
    this.armed = { ...record, used: false };
  }

  disarm() {
    this.armed = null;
  }

  async handleElicitation(request) {
    const armed = this.armed;
    if (!armed || armed.used) {
      return { action: 'decline' };
    }
    if (request?.params?.mode && request.params.mode !== 'form') {
      return { action: 'decline' };
    }
    const confirm = request?.params?.requestedSchema?.properties?.confirm;
    if (!confirm || confirm.type !== 'boolean') {
      return { action: 'decline' };
    }
    this.armed = { ...armed, used: true };
    return { action: 'accept', content: { confirm: true } };
  }
}

function requireScope({ sessionId, workflowId, planId }) {
  for (const [name, value] of Object.entries({ sessionId, workflowId, planId })) {
    if (typeof value !== 'string' || value.length === 0) throw new Error(`${name} is required`);
  }
}
