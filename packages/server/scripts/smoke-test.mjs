import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..', '..');
const SERVER_BIN = resolve(__dirname, '..', 'dist', 'bin.js');

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function smoke() {
  console.log('🚀 Starting smoke test...');

  // 1. Build server if not already built
  // (Assuming 'just build' was run or we run it here)
  
  // 2. Start server
  const server = spawn('node', [SERVER_BIN], {
    cwd: ROOT,
    env: { ...process.env, PORT: '4200', NODE_ENV: 'test' },
    stdio: 'inherit',
  });

  let success = false;
  try {
    // Wait for server to boot
    console.log('⏳ Waiting for server to boot...');
    await wait(3000);

    // 3. Start profile
    console.log('▶️ Starting apparatus-only profile...');
    const startRes = await fetch('http://localhost:4200/api/profiles/apparatus-only/start', {
      method: 'POST',
    });
    
    if (!startRes.ok) {
      throw new Error(`Failed to start profile: ${startRes.statusText}`);
    }

    // 4. Polling for healthy status
    console.log('🔍 Polling for healthy status...');
    const maxAttempts = 24; // 120 seconds
    for (let i = 0; i < maxAttempts; i++) {
      await wait(5000);

      const res = await fetch('http://localhost:4200/api/services');
      const services = await res.json();
      
      const apparatus = services.find(s => s.id === 'apparatus');
      if (!apparatus) {
        throw new Error('Apparatus service not found in status list');
      }

      console.log(`  [${i + 1}/${maxAttempts}] Apparatus state: ${apparatus.state}, health: ${apparatus.health?.healthy ? 'HEALTHY' : 'PENDING'}`);

      if (apparatus.state === 'running' && apparatus.health?.healthy) {
        console.log('✅ Smoke test passed!');
        success = true;
        break;
      }

      if (apparatus.state === 'crashed') {
        throw new Error(`Apparatus crashed: ${apparatus.lastError}`);
      }
    }

    if (!success) {
      throw new Error('Smoke test timed out waiting for healthy status');
    }

  } catch (err) {
    console.error(`❌ Smoke test failed: ${err.message}`);
  } finally {
    console.log('🛑 Tearing down...');
    server.kill('SIGTERM');
    await wait(2000);
    process.exit(success ? 0 : 1);
  }
}

smoke();
