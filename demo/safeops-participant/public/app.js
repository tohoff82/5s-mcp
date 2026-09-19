import { deriveControls } from './ui-state.js';
import { summarizePlan, summarizeApply, summarizeExplanation, technicalReceipt } from './presentation.js';

const statusDot = document.querySelector('#status-dot');
const statusTitle = document.querySelector('#status-title');
const statusDetail = document.querySelector('#status-detail');
const transcript = document.querySelector('#transcript');
const result = document.querySelector('#result');
const technical = document.querySelector('#technical');
const connect = document.querySelector('#connect');
const reconnect = document.querySelector('#reconnect');
const logout = document.querySelector('#logout');
const inspect = document.querySelector('#inspect');
const apply = document.querySelector('#apply');
const explain = document.querySelector('#explain');
const safeCount = document.querySelector('#safe-count');
const reviewCount = document.querySelector('#review-count');
const deniedCount = document.querySelector('#denied-count');
const effectState = document.querySelector('#effect-state');

const ui = {
  authenticated: false,
  connected: false,
  stale: false,
  busy: false,
  canApply: false,
  canExplain: false
};

const utterances = {
  inspect: 'Inspect this workspace and tell me what is safe to clean.',
  apply: 'Apply only the safe actions.',
  explain: 'What changed, and why were the other items left alone?'
};

connect.addEventListener('click', () => {
  location.href = '/oauth/start';
});

reconnect.addEventListener('click', async () => {
  setBusy(true);
  try {
    const data = await api('/api/reconnect');
    applySession(data);
    resetWorkflowUi();
    append('safeops', 'Backend reconnected. Run Inspect to establish a new workflow.');
  } catch (error) {
    handleRequestError(error);
  } finally {
    setBusy(false);
  }
});

logout.addEventListener('click', async () => {
  setBusy(true);
  try {
    await api('/api/logout');
    resetSessionUi();
    append('safeops', 'Demo session cleared. You can connect again in this browser.');
  } catch (error) {
    handleRequestError(error);
  } finally {
    setBusy(false);
  }
});

inspect.addEventListener('click', () => run('inspect', utterances.inspect, '/api/inspect'));
explain.addEventListener('click', () => run('explain', utterances.explain, '/api/explain'));

apply.addEventListener('click', async () => {
  append('user', utterances.apply);
  setBusy(true);
  try {
    const approval = await api('/api/approval');
    const applied = await api('/api/apply', { approval_nonce: approval.approval_nonce });
    showResult(applied);
    append('safeops', summarizeApply(applied));
    ui.canApply = false;
    ui.canExplain = true;
    effectState.textContent = applied.verification_state === 'VERIFIED_SUCCESS' ? 'VERIFIED' : 'CHECK';
  } catch (error) {
    handleRequestError(error);
  } finally {
    setBusy(false);
  }
});

async function run(kind, text, endpoint) {
  append('user', text);
  setBusy(true);
  try {
    const data = await api(endpoint);
    showResult(data);
    if (kind === 'inspect') {
      append('safeops', summarizePlan(data));
      updateSignals(data);
      ui.canApply = (data.safe_operation_ids || []).length > 0;
      ui.canExplain = true;
    } else {
      append('safeops', summarizeExplanation(data));
    }
  } catch (error) {
    handleRequestError(error);
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
  if (!response.ok) {
    const error = new Error(data.message || data.error || `HTTP ${response.status}`);
    error.code = data.error || null;
    error.status = response.status;
    throw error;
  }
  return data;
}

function handleRequestError(error) {
  if (error?.code === 'mcp_session_stale') {
    ui.connected = false;
    ui.stale = true;
    ui.canApply = false;
    ui.canExplain = false;
    append('safeops', 'Backend session expired. Reconnect to continue.');
    resetSignals();
    render();
    return;
  }
  append('safeops', `Stopped: ${error.message}`);
}

function applySession(session) {
  ui.authenticated = Boolean(session.authenticated);
  ui.connected = Boolean(session.mcp_connected);
  ui.stale = Boolean(session.mcp_stale);
  ui.canExplain = Boolean(session.current) && ui.connected;
  if (!ui.connected) ui.canApply = false;
}

function resetSessionUi() {
  ui.authenticated = false;
  ui.connected = false;
  ui.stale = false;
  ui.canApply = false;
  ui.canExplain = false;
  resetSignals();
  result.textContent = 'No backend result yet.';
  technical.open = false;
  render();
}

function resetWorkflowUi() {
  ui.canApply = false;
  ui.canExplain = false;
  resetSignals();
  result.textContent = 'No backend result yet.';
  technical.open = false;
}

function updateSignals(data) {
  safeCount.textContent = String((data.safe_operation_ids || []).length);
  reviewCount.textContent = String((data.review_operation_ids || []).length);
  deniedCount.textContent = String((data.denied_operation_ids || []).length);
  effectState.textContent = 'NONE';
}

function resetSignals() {
  safeCount.textContent = '—';
  reviewCount.textContent = '—';
  deniedCount.textContent = '—';
  effectState.textContent = 'NONE';
}

function showResult(data) {
  result.textContent = technicalReceipt(data);
}

function append(role, text) {
  const empty = transcript.querySelector('.empty-state');
  if (empty) empty.remove();

  const item = document.createElement('p');
  item.className = `message ${role}`;
  item.textContent = text;
  transcript.append(item);
  item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function setBusy(busy) {
  ui.busy = busy;
  render();
}

function render() {
  const controls = deriveControls(ui);
  connect.disabled = controls.connectDisabled;
  reconnect.disabled = controls.reconnectDisabled;
  logout.disabled = controls.logoutDisabled;
  inspect.disabled = controls.inspectDisabled;
  apply.disabled = controls.applyDisabled;
  explain.disabled = controls.explainDisabled;

  statusDot.dataset.state = controls.status;

  if (controls.status === 'connected') {
    statusTitle.textContent = 'Backend connected';
    statusDetail.textContent = 'OAuth identity active · MCP session ready';
  } else if (controls.status === 'stale') {
    statusTitle.textContent = 'Backend session expired';
    statusDetail.textContent = 'OAuth identity preserved · reconnect required';
  } else if (controls.status === 'authenticated') {
    statusTitle.textContent = 'User authenticated';
    statusDetail.textContent = 'OAuth identity active · MCP session not connected';
  } else {
    statusTitle.textContent = 'Not connected';
    statusDetail.textContent = 'Connect user OAuth to begin';
  }
}

const initial = await api('/api/session');
applySession(initial);
render();
