import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SafetyPolicyManager } from '../safety-policy.js';
import { FiveSBridge } from './five-s/bridge.js';
import { createSafeOpsHttpServer, listenSafeOpsHttp } from './http.js';
import { TokenValidator } from './auth/token-validator.js';
import { createJwksJwtVerifier } from './auth/jwks-verifier.js';
import { buildProtectedResourceMetadata } from './auth/protected-resource-metadata.js';
import { TargetRegistry } from './targets/target-registry.js';
import { WorkflowStore } from './workflow/store.js';
import { WorkflowCoordinator } from './workflow/coordinator.js';
import { createMcpElicitationApprovalProvider } from './approval/mcp-elicitation.js';

export async function buildSafeOpsRuntime({ env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const resource = requireUrl(env.SAFEOPS_RESOURCE_URI, 'SAFEOPS_RESOURCE_URI');
  const authorizationServer = requireUrl(env.SAFEOPS_AUTHORIZATION_SERVER, 'SAFEOPS_AUTHORIZATION_SERVER');
  const issuer = requireUrl(env.SAFEOPS_ISSUER || authorizationServer, 'SAFEOPS_ISSUER');
  const jwksUri = requireUrl(env.SAFEOPS_JWKS_URI, 'SAFEOPS_JWKS_URI');
  const stateDir = requireAbsolutePath(env.SAFEOPS_STATE_DIR, 'SAFEOPS_STATE_DIR');
  const targetConfig = await loadConfig(env.SAFEOPS_TARGETS_JSON, env.SAFEOPS_TARGETS_FILE, 'SafeOps targets');
  if (!targetConfig?.targets) throw new Error('SafeOps target config must contain targets');
  const policy = await buildPolicy(env, stateDir);
  const targetRegistry = new TargetRegistry(targetConfig.targets);
  const store = new WorkflowStore(stateDir);
  const coordinator = new WorkflowCoordinator({ store });
  const plansDir = path.join(stateDir, 'plans');
  const backupDir = path.join(stateDir, 'backup');
  const bridgeFactory = targetContext => new FiveSBridge({ targetContext, plansDir, backupDir, policy });
  const verifyToken = createJwksJwtVerifier({ issuer, jwksUri, fetchImpl });
  const tokenValidator = new TokenValidator({ verifyToken, issuer, resource, requiredScopes: [] });
  const scopesSupported = csv(env.SAFEOPS_SCOPES_SUPPORTED || 'mcp:service,mcp:tools,mcp:resources,safeops:read,safeops:apply');
  const resourceMetadata = buildProtectedResourceMetadata({ resource, authorizationServers: [authorizationServer], scopesSupported });
  const dependencies = {
    targetRegistry,
    coordinator,
    store,
    bridgeFactory,
    approvalProviderFactory: server => createMcpElicitationApprovalProvider({ server })
  };
  const requiredUserScope = env.SAFEOPS_USER_SCOPE || 'mcp:tools';
  const httpServer = createSafeOpsHttpServer({ dependencies, tokenValidator, resourceMetadata, requiredUserScope });
  return {
    httpServer,
    config: Object.freeze({ resource, authorizationServer, issuer, jwksUri, stateDir, requiredUserScope, scopesSupported })
  };
}

export async function startSafeOpsLab(options = {}) {
  const env = options.env || process.env;
  const runtime = await buildSafeOpsRuntime(options);
  const host = env.HOST || '0.0.0.0';
  const port = parsePort(env.PORT || '3000');
  const address = await listenSafeOpsHttp(runtime.httpServer, { host, port });
  return { ...runtime, address };
}

async function buildPolicy(env, stateDir) {
  if (env.SAFEOPS_POLICY_JSON) {
    const policy = JSON.parse(env.SAFEOPS_POLICY_JSON);
    await fs.mkdir(stateDir, { recursive: true, mode: 0o700 });
    const policyPath = path.join(stateDir, 'runtime-policy.json');
    await fs.writeFile(policyPath, `${JSON.stringify(policy, null, 2)}\n`, { mode: 0o600 });
    return new SafetyPolicyManager(policyPath);
  }
  if (env.SAFEOPS_POLICY_FILE) return new SafetyPolicyManager(requireAbsolutePath(env.SAFEOPS_POLICY_FILE, 'SAFEOPS_POLICY_FILE'));
  return new SafetyPolicyManager();
}

async function loadConfig(jsonValue, fileValue, label) {
  if (jsonValue) return JSON.parse(jsonValue);
  if (fileValue) return JSON.parse(await fs.readFile(requireAbsolutePath(fileValue, `${label} file`), 'utf8'));
  throw new Error(`${label} configuration is required`);
}

function csv(value) {
  const items = String(value).split(',').map(item => item.trim()).filter(Boolean);
  if (items.length === 0) throw new Error('At least one scope is required');
  return [...new Set(items)];
}

function parsePort(value) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('PORT must be an integer from 0 to 65535');
  return port;
}

function requireUrl(value, label) {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`${label} is required`);
  return new URL(value).toString().replace(/\/$/, '');
}

function requireAbsolutePath(value, label) {
  if (typeof value !== 'string' || !path.isAbsolute(value)) throw new Error(`${label} must be an absolute path`);
  return path.resolve(value);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const runtime = await startSafeOpsLab();
  const address = runtime.address;
  console.error(`[SafeOps] listening on ${typeof address === 'object' ? `${address.address}:${address.port}` : address}`);
}
