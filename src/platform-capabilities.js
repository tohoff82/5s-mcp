import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export function currentPlatform() {
  return {
    platform: os.platform(),
    is_linux: os.platform() === 'linux',
    is_macos: os.platform() === 'darwin'
  };
}

export async function commandAvailable(command) {
  try {
    await execFileAsync('sh', ['-lc', `command -v ${shellToken(command)} >/dev/null 2>&1`], { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

export async function optionalExec(command, args = [], options = {}) {
  if (!(await commandAvailable(command))) {
    return unsupported(command);
  }

  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      timeout: options.timeout || 10000,
      maxBuffer: options.maxBuffer || 512 * 1024
    });
    return {
      status: 'ok',
      command,
      stdout: stdout || '',
      stderr: stderr || ''
    };
  } catch (error) {
    return {
      status: 'error',
      command,
      stdout: error.stdout || '',
      stderr: error.stderr || error.message,
      error: error.message
    };
  }
}

export async function systemdStatus(args = []) {
  return await optionalExec('systemctl', args);
}

export async function journalctlStatus(args = []) {
  return await optionalExec('journalctl', args);
}

export async function memorySnapshot() {
  const free = await optionalExec('free', ['-m']);
  if (free.status === 'ok') {
    return {
      status: 'ok',
      source: 'free',
      raw: free.stdout.trim()
    };
  }

  if (os.platform() === 'darwin') {
    const vmStat = await optionalExec('vm_stat', []);
    const sysctl = await optionalExec('sysctl', ['-n', 'hw.memsize']);
    return {
      status: vmStat.status === 'ok' || sysctl.status === 'ok' ? 'ok' : 'unsupported',
      source: 'darwin',
      raw: [vmStat.stdout, sysctl.stdout].filter(Boolean).join('\n').trim(),
      note: 'macOS memory output is not equivalent to Linux free -m'
    };
  }

  return {
    status: 'unsupported',
    source: 'none',
    raw: '',
    reason: free.reason || free.error || 'No supported memory command available'
  };
}

export function unsupported(command) {
  return {
    status: 'unsupported',
    command,
    stdout: '',
    stderr: '',
    reason: `${command} is not available on this platform`
  };
}

function shellToken(value) {
  return String(value).replace(/[^A-Za-z0-9_.-]/g, '');
}
