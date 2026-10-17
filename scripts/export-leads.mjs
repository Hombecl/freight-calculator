#!/usr/bin/env node
// Manual maintainer command. Do not schedule: unattended op jobs need a lock,
// persistent backoff and a >=1h circuit breaker after rate limiting.
import { spawn } from 'node:child_process';
import { open } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const FIELDS = ['at', 'email', 'source', 'country', 'proWaitlist', 'company', 'useCase', 'purpose'];
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
  const counts = new Map();
  for (const lead of leads) counts.set(lead.source, (counts.get(lead.source) ?? 0) + 1);
  const sources = Object.fromEntries(counts);
  return { records: leads.length, uniqueEmails: new Set(leads.map(lead => lead.email.trim().toLowerCase())).size,
    productUpdateOptIns: leads.filter(lead => lead.proWaitlist).length, sources };
}

/** Administrative fallback when STATS_KEY is not available. Reads only dated
 * lead keys; never enumerates API credentials, shared plans or rate counters. */
export async function cloudflareLeads(token, accountId, days, now = Date.now(), fetcher = fetch) {
  if (!/^[a-f0-9]{32}$/.test(accountId)) throw Error('Invalid Cloudflare account ID.');
  const base = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/13e65133a1414b1ebe5d125d38d43eb8`;
  const cutoff = now - days * 864e5;
  const request = async path => {
    const res = await fetcher(base + path, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000), redirect: 'error' });
    if (!res.ok) throw Error(`Cloudflare lead read returned HTTP ${res.status}; no export written.`);
    return res;
  };
  const keys = [];
  for (let year = new Date(cutoff).getUTCFullYear(); year <= new Date(now).getUTCFullYear(); year++) {
    let cursor = '', seen = new Set(), completed = false;
    for (let page = 0; page < 100; page++) {
      const payload = await (await request(`/keys?prefix=${year}-&limit=1000&cursor=${encodeURIComponent(cursor)}`)).json();
      if (!payload.success || !Array.isArray(payload.result)) throw Error('Incomplete Cloudflare key response; no export written.');
      for (const key of payload.result) {
        if (!/^\d{4}-\d{2}-\d{2}T[^_]+_[a-f0-9]+$/.test(key.name ?? '')) continue;
        const at = Date.parse(key.name.split('_')[0]);
        if (at >= cutoff && at <= now) keys.push(key.name);
      }
      cursor = payload.result_info?.cursor ?? '';
      if (!cursor) { completed = true; break; }
      if (seen.has(cursor)) throw Error('Repeated Cloudflare cursor; no export written.');
      seen.add(cursor);
    }
    if (!completed) throw Error('Truncated Cloudflare key list; no export written.');
  }
  const leads = [];
  // Bounded concurrency also prevents a burst of hundreds of reads.
  for (let i = 0; i < keys.length; i += 5) {
    leads.push(...await Promise.all(keys.slice(i, i + 5).map(async key => (await request(`/values/${encodeURIComponent(key)}`)).json())));
  }
  return { leads };
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
    console.log('Manual use: node scripts/export-leads.mjs --token-ref op://VAULT/ITEM/FIELD --out /private/path/leads.csv [--days 28]\nCloudflare fallback: replace --token-ref with --cloudflare-token-ref op://VAULT/ITEM/FIELD --account-id ACCOUNT_ID');
    return;
  }
  const flags = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!['--token-ref', '--cloudflare-token-ref', '--account-id', '--out', '--days'].includes(args[i]) || !args[i + 1]) throw Error('Invalid arguments; use --help.');
    flags[args[i]] = args[i + 1];
  }
  const days = Number(flags['--days'] ?? 28);
  const cfRef = flags['--cloudflare-token-ref'];
  if (!Number.isInteger(days) || days < 1 || days > 365 || !flags['--out'] || Boolean(flags['--token-ref']) === Boolean(cfRef) || (cfRef && !/^[a-f0-9]{32}$/.test(flags['--account-id'] ?? ''))) throw Error('Provide one token reference, --out, days between 1 and 365, and --account-id for Cloudflare mode.');
  // Fetch only from the fixed first-party endpoint. No token in URLs, logs or files.
  const token = await readSecret(cfRef ?? flags['--token-ref']);
  let payload;
  if (cfRef) payload = await cloudflareLeads(token, flags['--account-id'], days);
  else {
    const response = await fetch(`https://www.dimpack3d.com/api/stats?days=${days}`, {
      headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000), redirect: 'error',
    });
    if (!response.ok) throw Error(`Lead read returned HTTP ${response.status}; no export written.`);
    payload = await response.json();
  }
  const leads = selectLeads(payload, days);
  // Exclusive creation avoids overwriting existing exports; private permissions.
  const path = resolve(flags['--out']);
  const file = await open(path, 'wx', 0o600);
  try { await file.writeFile(leadCSV(leads)); } finally { await file.close(); }
  console.log(JSON.stringify({ ...leadSummary(leads), output: path }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
