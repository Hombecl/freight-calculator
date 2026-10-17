#!/usr/bin/env node
// Manual maintainer command. Do not schedule: unattended op jobs need a lock,
// persistent backoff and a >=1h circuit breaker after rate limiting.
import { spawn } from 'node:child_process';
import { open } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const FIELDS = ['at', 'email', 'source', 'country', 'proWaitlist', 'company', 'useCase'];
const csvCell = value => {
  let text = String(value ?? '');
  // Treat user-supplied spreadsheet cells as text, including leading whitespace.
  if (/^[\s]*[=+@-]|^[\t\r\n]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
};

export function selectLeads(payload, days, now = Date.now()) {
  if (payload.truncated || !Array.isArray(payload.leads)) throw Error('Incomplete lead response; no export written.');
  const cutoff = now - days * 864e5;
  return payload.leads.filter(lead => {
    const at = Date.parse(lead?.at);
    return typeof lead?.email === 'string' && at >= cutoff && at <= now;
  }).map(lead => Object.fromEntries(FIELDS.map(field => [field, field === 'proWaitlist' ? lead[field] === true : String(lead[field] ?? '')])))
    .sort((a, b) => a.at.localeCompare(b.at));
}

export function leadCSV(leads) {
  return [FIELDS, ...leads.map(lead => FIELDS.map(field => lead[field]))].map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

export function leadSummary(leads) {
  const sources = {};
  for (const lead of leads) sources[lead.source] = (sources[lead.source] ?? 0) + 1;
  return { records: leads.length, uniqueEmails: new Set(leads.map(lead => lead.email.trim().toLowerCase())).size,
    productUpdateOptIns: leads.filter(lead => lead.proWaitlist).length, sources };
}

function readSecret(reference) {
  if (!/^op:\/\/[^/]+\/[^/]+\/.+/.test(reference)) throw Error('Supply an exact op:// vault/item/field reference.');
  return new Promise((resolveSecret, reject) => {
    const child = spawn('op', ['read', reference], { detached: true, stdio: ['ignore', 'pipe', 'ignore'] });
    let output = '';
    const timer = setTimeout(() => {
      try { process.kill(-child.pid, 'SIGKILL'); } catch { /* already exited */ }
      reject(Error('1Password timed out; stopped without retry.'));
    }, 25000);
    child.stdout.on('data', chunk => { output += chunk; });
    child.on('error', () => { clearTimeout(timer); reject(Error('1Password CLI did not start.')); });
    child.on('close', code => {
      clearTimeout(timer);
      if (code !== 0 || !output.trim()) reject(Error('1Password read failed; stopped without retry. Check the exact reference and service-account environment.'));
      else resolveSecret(output.trim());
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log('Manual use: node scripts/export-leads.mjs --token-ref op://VAULT/ITEM/FIELD --out /private/path/leads.csv [--days 28]');
    return;
  }
  const flags = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!['--token-ref', '--out', '--days'].includes(args[i]) || !args[i + 1]) throw Error('Invalid arguments; use --help.');
    flags[args[i]] = args[i + 1];
  }
  const days = Number(flags['--days'] ?? 28);
  if (!Number.isInteger(days) || days < 1 || days > 365 || !flags['--out'] || !flags['--token-ref']) throw Error('Provide --token-ref, --out, and days between 1 and 365.');
  // Fetch only from the fixed first-party endpoint. No token in URLs, logs or files.
  const token = await readSecret(flags['--token-ref']);
  const response = await fetch(`https://www.dimpack3d.com/api/stats?days=${days}`, {
    headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000), redirect: 'error',
  });
  if (!response.ok) throw Error(`Lead read returned HTTP ${response.status}; no export written.`);
  const leads = selectLeads(await response.json(), days);
  // Exclusive creation avoids overwriting existing exports; private permissions.
  const path = resolve(flags['--out']);
  const file = await open(path, 'wx', 0o600);
  try { await file.writeFile(leadCSV(leads)); } finally { await file.close(); }
  console.log(JSON.stringify({ ...leadSummary(leads), output: path }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
