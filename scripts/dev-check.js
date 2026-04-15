const net = require('net');

function checkPort(port, host = '127.0.0.1', timeoutMs = 1200) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const done = (ok) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(ok);
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
    socket.connect(port, host);
  });
}

async function main() {
  const checks = [
    { name: 'Redis', host: '127.0.0.1', port: 6379, required: true },
    { name: 'InfluxDB', host: '127.0.0.1', port: 8086, required: false }
  ];

  console.log('[dev-check] Checking local infrastructure...');

  let hasRequiredFailure = false;

  for (const item of checks) {
    const ok = await checkPort(item.port, item.host);
    const status = ok ? 'OK' : 'NOT READY';
    console.log(`[dev-check] ${item.name} ${item.host}:${item.port} -> ${status}`);

    if (!ok && item.required) {
      hasRequiredFailure = true;
    }
  }

  if (hasRequiredFailure) {
    console.error('[dev-check] Redis is required. Please start Redis first, then rerun `npm run dev:stack`.');
    process.exit(1);
  }

  console.log('[dev-check] Done. Starting frontend/backend/agent...');
}

main().catch((error) => {
  console.error('[dev-check] Unexpected error:', error);
  process.exit(1);
});
