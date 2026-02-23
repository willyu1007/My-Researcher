#!/usr/bin/env node

import net from 'node:net';
import process from 'node:process';
import { spawn } from 'node:child_process';

const DEFAULT_BASE_PORT = 5173;
const MAX_PORT_ATTEMPTS = 30;
const RENDERER_STARTUP_GRACE_MS = 1_200;
const DEV_HOST = '127.0.0.1';

function parsePort(value, fallback) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    return fallback;
  }
  return parsed;
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function waitForPortReady(port, timeoutMs = 30_000) {
  const started = Date.now();

  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      const socket = net.createConnection({ host: DEV_HOST, port });

      socket.once('connect', () => {
        socket.end();
        resolve();
      });

      socket.once('error', () => {
        socket.destroy();
        if (Date.now() - started > timeoutMs) {
          reject(new Error(`Timed out waiting for renderer on port ${port}.`));
          return;
        }
        setTimeout(tryConnect, 200);
      });
    };

    tryConnect();
  });
}

function waitForStableStartup(renderer, graceMs = RENDERER_STARTUP_GRACE_MS) {
  return new Promise((resolve, reject) => {
    const onError = (error) => {
      cleanup();
      reject(error);
    };

    const onExit = (code) => {
      cleanup();
      reject(new Error(`renderer exited during startup (${code ?? 1})`));
    };

    const cleanup = () => {
      clearTimeout(timer);
      renderer.off('error', onError);
      renderer.off('exit', onExit);
    };

    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, graceMs);

    renderer.once('error', onError);
    renderer.once('exit', onExit);
  });
}

function terminateProcess(child, signal = 'SIGTERM') {
  if (!child || child.killed) {
    return;
  }

  child.kill(signal);
}

function runCommand(command, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      env,
    });

    child.once('error', (error) => {
      reject(error);
    });

    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(' ')} failed (code=${code ?? 'null'}, signal=${signal ?? 'null'})`));
    });
  });
}

function startRenderer(port) {
  return spawn('pnpm', ['exec', 'vite', '--host', DEV_HOST, '--port', String(port), '--strictPort'], {
    stdio: 'inherit',
    env: process.env,
  });
}

async function startRendererWithRetry(basePort, maxAttempts = MAX_PORT_ATTEMPTS) {
  let lastError = null;

  for (let offset = 0; offset < maxAttempts; offset += 1) {
    const port = basePort + offset;
    const renderer = startRenderer(port);

    try {
      // Startup grace avoids false positives where another process owns the port.
      // eslint-disable-next-line no-await-in-loop
      await waitForStableStartup(renderer);
      // eslint-disable-next-line no-await-in-loop
      await waitForPortReady(port);

      if (port !== basePort) {
        console.log(`[desktop-dev] Port ${basePort} in use, switched to ${port}.`);
      }

      return { renderer, port };
    } catch (error) {
      lastError = error;
      terminateProcess(renderer);

      if (offset < maxAttempts - 1) {
        console.warn(`[desktop-dev] Renderer failed on port ${port}; retrying ${port + 1}.`);
        // eslint-disable-next-line no-await-in-loop
        await delay(150);
      }
    }
  }

  const reason = lastError instanceof Error ? lastError.message : String(lastError ?? 'unknown error');
  throw new Error(
    `Failed to start renderer after ${maxAttempts} attempts from ${basePort}. Last error: ${reason}`,
  );
}

async function main() {
  const basePort = parsePort(process.env.DESKTOP_DEV_PORT, DEFAULT_BASE_PORT);
  const { renderer, port } = await startRendererWithRetry(basePort);

  let electron = null;
  let shuttingDown = false;

  const shutdownAll = (exitCode = 0) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;

    terminateProcess(electron);
    terminateProcess(renderer);

    setTimeout(() => {
      terminateProcess(electron, 'SIGKILL');
      terminateProcess(renderer, 'SIGKILL');
      process.exit(exitCode);
    }, 500);
  };

  process.on('SIGINT', () => shutdownAll(130));
  process.on('SIGTERM', () => shutdownAll(143));

  renderer.once('exit', (code) => {
    if (shuttingDown) {
      return;
    }
    console.error(`[desktop-dev] renderer exited (${code ?? 1}).`);
    shutdownAll(code ?? 1);
  });

  await waitForPortReady(port);
  console.log('[desktop-dev] Building main/preload...');
  await runCommand('pnpm', ['exec', 'tsc', '-p', 'tsconfig.main.json']);

  const electronEnv = {
    ...process.env,
    VITE_DEV_SERVER_URL: `http://${DEV_HOST}:${port}`,
  };
  delete electronEnv.ELECTRON_RUN_AS_NODE;

  electron = spawn('pnpm', ['exec', 'electron', 'dist/main/main.js'], {
    stdio: 'inherit',
    env: electronEnv,
  });

  electron.once('exit', (code) => {
    if (shuttingDown) {
      return;
    }
    console.log(`[desktop-dev] electron exited (${code ?? 0}).`);
    shutdownAll(code ?? 0);
  });
}

main().catch((error) => {
  console.error(`[desktop-dev] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
