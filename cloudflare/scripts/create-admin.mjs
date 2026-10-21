import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { createInterface } from 'node:readline';

function ask(prompt) {
  return new Promise((resolve) => {
    const input = process.stdin;
    const output = process.stdout;
    output.write(prompt);
    let value = '';
    const onData = (chunk) => {
      const character = chunk.toString();
      if (character === '\r' || character === '\n') {
        input.setRawMode(false);
        input.pause();
        input.removeListener('data', onData);
        output.write('\n');
        resolve(value);
      } else if (character === '\u0003') {
        process.exit(130);
      } else if (character === '\u007f' || character === '\b') {
        value = value.slice(0, -1);
      } else if (character >= ' ') {
        value += character;
      }
    };
    input.setRawMode(true);
    input.resume();
    input.on('data', onData);
  });
}

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('Usage: node cloudflare/scripts/create-admin.mjs admin@example.com');
  process.exit(2);
}
if (!process.stdin.isTTY || !process.stdin.setRawMode) {
  console.error('Run this command in an interactive terminal so the password can be entered privately.');
  process.exit(2);
}

const password = await ask('New admin password (minimum 12 characters): ');
if (password.length < 12) {
  console.error('Use a password with at least 12 characters.');
  process.exit(2);
}
const salt = randomBytes(16);
const hash = pbkdf2Sync(password, salt, 210_000, 32, 'sha256');
const sqlString = (value) => `'${value.replaceAll("'", "''")}'`;
console.log(`INSERT INTO admin_users (email,password_salt,password_hash) VALUES (${sqlString(email)},${sqlString(salt.toString('hex'))},${sqlString(hash.toString('hex'))}) ON CONFLICT(email) DO UPDATE SET password_salt=excluded.password_salt,password_hash=excluded.password_hash;`);
