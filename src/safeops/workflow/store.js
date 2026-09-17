import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

export class WorkflowStore {
  constructor(stateDir) {
    if (typeof stateDir !== 'string' || stateDir.length === 0) throw new Error('stateDir is required');
    this.stateDir = path.resolve(stateDir);
  }

  async createWorkflow(initialState) {
    const workflowId = requireId(initialState?.workflow_id, 'workflow_id');
    const dir = this.workflowDir(workflowId);
    await fs.mkdir(path.join(dir, 'objects'), { recursive: true, mode: 0o700 });
    const currentPath = path.join(dir, 'current.json');
    await fs.writeFile(currentPath, encode(initialState), { flag: 'wx', mode: 0o600 });
    await this.appendEvent(workflowId, { type: 'workflow_created', at: initialState.created_at, state: initialState.lifecycle_state });
    return initialState;
  }

  async loadCurrent(workflowId) {
    const data = await fs.readFile(path.join(this.workflowDir(workflowId), 'current.json'), 'utf8');
    return JSON.parse(data);
  }

  async writeCurrent(workflowId, state) {
    const dir = this.workflowDir(workflowId);
    await fs.mkdir(dir, { recursive: true, mode: 0o700 });
    const destination = path.join(dir, 'current.json');
    const temporary = path.join(dir, `.current-${process.pid}-${crypto.randomBytes(6).toString('hex')}.tmp`);
    await fs.writeFile(temporary, encode(state), { mode: 0o600 });
    await fs.rename(temporary, destination);
    return state;
  }

  async appendEvent(workflowId, event) {
    const dir = this.workflowDir(workflowId);
    await fs.mkdir(dir, { recursive: true, mode: 0o700 });
    const record = { ...event, workflow_id: requireId(workflowId, 'workflow_id') };
    await fs.appendFile(path.join(dir, 'events.ndjson'), `${JSON.stringify(record)}\n`, { mode: 0o600 });
    return record;
  }

  async listEvents(workflowId) {
    try {
      const data = await fs.readFile(path.join(this.workflowDir(workflowId), 'events.ndjson'), 'utf8');
      return data.split('\n').filter(Boolean).map(line => JSON.parse(line));
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }

  async writeObject(workflowId, objectId, value) {
    const dir = path.join(this.workflowDir(workflowId), 'objects');
    await fs.mkdir(dir, { recursive: true, mode: 0o700 });
    const file = path.join(dir, `${requireId(objectId, 'object_id')}.json`);
    await fs.writeFile(file, encode(value), { flag: 'wx', mode: 0o600 });
    return value;
  }

  async readObject(workflowId, objectId) {
    const file = path.join(this.workflowDir(workflowId), 'objects', `${requireId(objectId, 'object_id')}.json`);
    return JSON.parse(await fs.readFile(file, 'utf8'));
  }

  workflowDir(workflowId) {
    return path.join(this.stateDir, 'workflows', requireId(workflowId, 'workflow_id'));
  }
}

function requireId(value, label) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,159}$/.test(value)) {
    throw new Error(`Invalid ${label}`);
  }
  return value;
}

function encode(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}
