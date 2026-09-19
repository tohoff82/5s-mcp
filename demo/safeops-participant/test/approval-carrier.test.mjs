import test from 'node:test';
import assert from 'node:assert/strict';
import { ApprovalCarrier } from '../lib/approval-carrier.mjs';

const scope = { sessionId: 'session-a', workflowId: 'workflow-a', planId: 'plan-a' };
const elicitation = {
  params: {
    mode: 'form',
    requestedSchema: {
      type: 'object',
      properties: { confirm: { type: 'boolean' } },
      required: ['confirm']
    }
  }
};

test('explicit approval is scoped and single-use', async () => {
  const carrier = new ApprovalCarrier();
  assert.deepEqual(await carrier.handleElicitation(elicitation), { action: 'decline' });

  const approval = carrier.issue(scope);
  carrier.arm({ ...scope, nonce: approval.nonce });
  assert.deepEqual(await carrier.handleElicitation(elicitation), {
    action: 'accept',
    content: { confirm: true }
  });
  assert.deepEqual(await carrier.handleElicitation(elicitation), { action: 'decline' });
});

test('cross-session and cross-plan approval fail closed', () => {
  const carrier = new ApprovalCarrier();
  const first = carrier.issue(scope);
  assert.throws(
    () => carrier.arm({ ...scope, sessionId: 'session-b', nonce: first.nonce }),
    /scope mismatch/
  );

  const second = carrier.issue(scope);
  assert.throws(
    () => carrier.arm({ ...scope, planId: 'plan-b', nonce: second.nonce }),
    /scope mismatch/
  );
});

test('stale approval fails closed', () => {
  let now = 1000;
  const carrier = new ApprovalCarrier({ ttlMs: 10, now: () => now });
  const approval = carrier.issue(scope);
  now = 1011;
  assert.throws(() => carrier.arm({ ...scope, nonce: approval.nonce }), /expired/);
});
