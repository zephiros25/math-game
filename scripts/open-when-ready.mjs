// Waits until a local server answers, then opens it in the default browser.
// Used by the desktop launchers in scripts/launch/.
// Usage: node scripts/open-when-ready.mjs <url> [timeoutSeconds]

import { exec } from 'node:child_process';

const url = process.argv[2];
const timeout = Number(process.argv[3] ?? 120) * 1000;
const started = Date.now();

async function ready() {
  try {
    await fetch(url, { signal: AbortSignal.timeout(2000) });
    return true; // any answer (even an error page) means the server is up
  } catch {
    return false;
  }
}

while (!(await ready())) {
  if (Date.now() - started > timeout) {
    console.error(`${url} did not start within ${timeout / 1000}s; not opening the browser.`);
    process.exit(1);
  }
  await new Promise((r) => setTimeout(r, 1000));
}

// "start" is the Windows way to open a URL in the default browser.
exec(process.platform === 'win32' ? `start "" "${url}"` : `open "${url}"`);
