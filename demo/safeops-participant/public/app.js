const status = document.querySelector('#status');
const transcript = document.querySelector('#transcript');
const result = document.querySelector('#result');
const connect = document.querySelector('#connect');
const inspect = document.querySelector('#inspect');
const apply = document.querySelector('#apply');
const explain = document.querySelector('#explain');

const ui = { connected: false, busy: false, canApply: false, canExplain: false };

connect.addEventListener('click', () => { location.href = '/oauth/start'; });
inspect.addEventListener('click', () => run('user', inspect.textContent, '/api/inspect'));
explain.addEventListener('click', () => run('user', explain.textContent, '/api/explain'));
apply.addEventListener('click', async () => {
  append('user', apply.textContent);
  setBusy(true);
  try {
    const approval = await api('/api/approval');
    const applied = await api('/api/apply', { approval_nonce: approval.approval_nonce });
    showResult(applied);
    append('safeops', summarizeApply(applied));
    ui.canApply = false;
    ui.canExplain = true;
  } catch (error) {
    append('safeops', `Stopped: ${error.message}`);
  } finally {
    setBusy(false);
  }
});

async function run(role, text, endpoint) {
  append(role, text);
  setBusy(true);
  try {
    const data = await api(endpoint);
    showResult(data);
    if (endpoint.endsWith('inspect')) {
      append('safeops', summarizePlan(data));
      ui.canApply = (data.safe_operation_ids || []).length > 0;
      ui.canExplain = true;
    } else {
      append('safeops', summarizeExplanation(data));
    }
  } catch (error) {
    append('safeops', `Stopped: ${error.message}`);
  } finally {
    setBusy(false);
  }
}

async function api(endpoint, body = undefined) {
  const response = await fetch(endpoint, {
    method: endpoint === '/api/session' ? 'GET' : 'POST',
    headers: body ? { 'content-type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || data.error || `HTTP ${response.status}`);
  return data;
}

function showResult(data) {
  result.replaceChildren();
  const pre = document.createElement('pre');
  pre.textContent = JSON.stringify(data, null, 2);
  result.append(pre);
}

function summarizePlan(data) {
  return [
    `SAFE: ${(data.safe_operation_ids || []).length}`,
    `REVIEW: ${(data.review_operation_ids || []).length}`,
    `DENIED: ${(data.denied_operation_ids || []).length}`,
    'No effect has been applied.'
  ].join(' · ');
}

function summarizeApply(data) {
  return `Verification: ${data.verification_state || 'UNKNOWN'}. Approved actions: ${(data.approved_operation_ids || []).length}.`;
}

function summarizeExplanation(data) {
  return data.summary || data.explanation || JSON.stringify(data);
}

function append(role, text) {
  const item = document.createElement('p');
  item.className = `message ${role}`;
  item.textContent = text;
  transcript.append(item);
}

function setBusy(busy) {
  ui.busy = busy;
  renderControls();
}

function renderControls() {
  connect.disabled = ui.connected || ui.busy;
  inspect.disabled = !ui.connected || ui.busy;
  apply.disabled = !ui.connected || ui.busy || !ui.canApply;
  explain.disabled = !ui.connected || ui.busy || !ui.canExplain;
}

const initial = await api('/api/session');
ui.connected = initial.mcp_connected;
ui.canExplain = Boolean(initial.current);
status.textContent = initial.mcp_connected
  ? 'Connected to the real SafeOps MCP backend through participant demo carrier.'
  : 'Not connected. User OAuth is required before SafeOps calls.';
renderControls();
