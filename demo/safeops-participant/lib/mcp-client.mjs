import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { ElicitRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { ApprovalCarrier } from './approval-carrier.mjs';

export const EXPECTED_SAFEOPS_TOOLS = Object.freeze([
  'safeops_apply_safe_actions',
  'safeops_explain_workflow',
  'safeops_inspect_workspace'
]);

export class DemoMcpClient {
  constructor({
    resourceUri,
    oauthClient,
    session,
    clientFactory = defaultClientFactory,
    transportFactory = defaultTransportFactory,
    approvalCarrier = new ApprovalCarrier()
  }) {
    this.resourceUri = new URL(resourceUri).toString();
    this.oauthClient = oauthClient;
    this.session = session;
    this.clientFactory = clientFactory;
    this.transportFactory = transportFactory;
    this.approvalCarrier = approvalCarrier;
    this.client = null;
    this.transport = null;
  }

  async connect() {
    const client = this.clientFactory();
    client.setRequestHandler(ElicitRequestSchema, request => this.approvalCarrier.handleElicitation(request));
    const transport = this.transportFactory({
      resourceUri: this.resourceUri,
      fetchImpl: (input, init = {}) => {
        const headers = new Headers(init.headers || {});
        if (this.session.replayLease) headers.set('x-safeops-demo-lease', this.session.replayLease);
        return this.oauthClient.authorizedFetch(this.session, input, { ...init, headers });
      }
    });
    await client.connect(transport);
    const tools = await client.listTools();
    assertExactToolSurface(tools.tools);
    this.client = client;
    this.transport = transport;
    return { tools: tools.tools.map(tool => tool.name).sort() };
  }

  async replayRequest(action, body) {
    const url = new URL('/__safeops_demo/' + action, this.resourceUri);
    const response = await this.oauthClient.authorizedFetch(this.session, url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
    const result = await response.json();
    if (!response.ok) {
      const error = new Error(result.message || 'Demo preparation failed');
      error.status = response.status;
      error.code = result.error;
      throw error;
    }
    return result;
  }

  async prepare() {
    const result = await this.replayRequest('prepare', { session_id: this.session.id });
    if (result.fixture_ready !== true || typeof result.lease_token !== 'string') throw new Error('Fixture preparation was not verified');
    this.session.replayLease = result.lease_token;
    this.session.current = null;
    return { fixture_ready: true, lease_expires_in_seconds: result.lease_expires_in_seconds };
  }

  async release() {
    if (!this.session.replayLease) return { released: false };
    const result = await this.replayRequest('release', {
      session_id: this.session.id, lease_token: this.session.replayLease
    });
    if (result.released) this.session.replayLease = null;
    return result;
  }

  async inspect({ targetId }) {
    const result = await this.call('safeops_inspect_workspace', { target_id: targetId });
    requireWorkflowResult(result);
    this.session.current = {
      workflow_id: result.workflow_id,
      plan_id: result.plan_id,
      target_id: result.target_id
    };
    return result;
  }

  issueApproval() {
    const current = requireCurrent(this.session);
    return this.approvalCarrier.issue({
      sessionId: this.session.id,
      workflowId: current.workflow_id,
      planId: current.plan_id
    });
  }

  async apply({ approvalNonce }) {
    const current = requireCurrent(this.session);
    this.approvalCarrier.arm({
      sessionId: this.session.id,
      workflowId: current.workflow_id,
      planId: current.plan_id,
      nonce: approvalNonce
    });
    try {
      return await this.call('safeops_apply_safe_actions', {
        workflow_id: current.workflow_id,
        plan_id: current.plan_id
      });
    } finally {
      this.approvalCarrier.disarm();
    }
  }

  async explain() {
    const current = requireCurrent(this.session);
    return this.call('safeops_explain_workflow', { workflow_id: current.workflow_id });
  }

  async close() {
    if (this.client && typeof this.client.close === 'function') await this.client.close().catch(() => {});
    this.client = null;
    this.transport = null;
    this.approvalCarrier.disarm();
  }

  async call(name, args) {
    if (!this.client) throw new Error('MCP client is not connected');
    const response = await this.client.callTool({ name, arguments: args });
    if (response?.isError) throw new Error(`SafeOps tool failed: ${name}`);
    if (response?.structuredContent) return response.structuredContent;
    const text = response?.content?.find(item => item.type === 'text')?.text;
    if (typeof text === 'string') return JSON.parse(text);
    throw new Error(`SafeOps tool returned no structured result: ${name}`);
  }
}

export function assertExactToolSurface(tools) {
  const names = (tools || []).map(tool => tool.name).sort();
  if (names.length !== EXPECTED_SAFEOPS_TOOLS.length || names.some((name, index) => name !== EXPECTED_SAFEOPS_TOOLS[index])) {
    throw new Error(`Unexpected SafeOps tool surface: ${names.join(', ')}`);
  }
}

function defaultClientFactory() {
  return new Client(
    { name: 'safeops-participant-demo', version: '0.1.0' },
    { capabilities: { elicitation: {} } }
  );
}

function defaultTransportFactory({ resourceUri, fetchImpl }) {
  return new StreamableHTTPClientTransport(new URL(resourceUri), { fetch: fetchImpl });
}

function requireWorkflowResult(result) {
  if (!result?.workflow_id || !result?.plan_id || !result?.target_id) throw new Error('SafeOps inspect result is missing workflow binding');
}

function requireCurrent(session) {
  if (!session?.current?.workflow_id || !session.current.plan_id) throw new Error('No current SafeOps workflow');
  return session.current;
}
