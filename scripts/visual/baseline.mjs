// The approved desktop baseline (tests/__baselines__, out of Git) and its fingerprints (tests/baselines.manifest.json,
// in Git), so a lost, missing or quietly changed baseline is noticed before anything is compared with it.
//
//   node scripts/visual/baseline.mjs verify          every baseline there, and unchanged since it was approved
//   node scripts/visual/baseline.mjs approve --yes   take the desktop baseline again from the site as it is now, and
//                                                    record it (only once the owner has approved the desktop as it is);
//                                                    Playwright options after --yes narrow it to some pages or widths
import { createHash } from 'node:crypto';
import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DIR = path.join(ROOT, 'tests', '__baselines__');
const MANIFEST = path.join(ROOT, 'tests', 'baselines.manifest.json');
const [cmd, flag] = process.argv.slice(2);

const files = (dir) =>
  fs.existsSync(dir)
    ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(path.join(dir, e.name)) : /\.(png|har)$/.test(e.name) ? [path.join(dir, e.name)] : []))
    : [];
const hash = (f) => createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const rel = (f) => path.relative(DIR, f).split(path.sep).join('/');

// A picture that failed while it was recorded (some creators' YouTube avatars are refused by the browser) is kept in
// the recording as a response with no status, which a replay leaves hanging instead of failing. Without its entry the
// replay refuses it, so it fails as it did then (the creator's initial shows) and the page finishes loading.
function forgetFailures() {
  for (const f of files(DIR).filter((f) => f.endsWith('.har'))) {
    const har = JSON.parse(fs.readFileSync(f, 'utf8'));
    const kept = har.log.entries.filter((e) => e.response.status > 0);
    if (kept.length === har.log.entries.length) continue;
    har.log.entries = kept;
    fs.writeFileSync(f, JSON.stringify(har));
  }
}

if (cmd === 'approve') {
  if (flag !== '--yes') {
    console.error('This replaces the approved desktop baseline. Run it with --yes, and only for a desktop the owner has approved.');
    process.exit(1);
  }
  // --built-from <commit>: the commit the served build (dist/) was made from, when the working tree has moved on since.
  // Anything else after --yes goes to Playwright (`-g "/work" --project=desktop-2560 --workers=1` retakes only those).
  const args = process.argv.slice(4);
  const at = args.indexOf('--built-from');
  const builtFrom = at >= 0 ? args.splice(at, 2)[1] : null;
  const extra = args.map((a) => (/[\s|$]/.test(a) ? `"${a}"` : a));
  const projects = extra.some((a) => a.startsWith('--project')) ? [] : ['--project=desktop-*'];
  const run = spawnSync('npx', ['playwright', 'test', ...projects, '--update-snapshots=all', ...extra], { stdio: 'inherit', shell: true, env: { ...process.env, STRIDE_APPROVE_BASELINE: 'yes' } });
  if (run.status !== 0) process.exit(run.status ?? 1);
  forgetFailures();
  const commit = builtFrom ?? execSync('git rev-parse --short HEAD').toString().trim();
  const dirty = !builtFrom && execSync('git status --porcelain -- src public').toString().trim() !== '';
  const entries = Object.fromEntries(files(DIR).map((f) => [rel(f), hash(f)]));
  fs.writeFileSync(MANIFEST, JSON.stringify({ approved: new Date().toISOString(), commit: dirty ? `${commit}+uncommitted` : commit, count: Object.keys(entries).length, files: entries }, null, 1) + '\n');
  console.log(`Baseline approved: ${Object.keys(entries).length} screenshots from ${commit}${dirty ? ' (with uncommitted changes)' : ''}.`);
} else if (cmd === 'verify') {
  if (!fs.existsSync(MANIFEST)) {
    console.error('No approved baseline yet (tests/baselines.manifest.json).');
    process.exit(1);
  }
  const m = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const missing = [];
  const changed = [];
  for (const [name, h] of Object.entries(m.files)) {
    const f = path.join(DIR, name);
    if (!fs.existsSync(f)) missing.push(name);
    else if (hash(f) !== h) changed.push(name);
  }
  const extra = files(DIR).map(rel).filter((n) => !(n in m.files));
  if (missing.length || changed.length || extra.length) {
    console.error(`The baseline isn't the approved one (${m.commit}): ${missing.length} missing, ${changed.length} changed, ${extra.length} not approved.`);
    [...missing.map((n) => `  missing   ${n}`), ...changed.map((n) => `  changed   ${n}`), ...extra.map((n) => `  unknown   ${n}`)].slice(0, 20).forEach((l) => console.error(l));
    process.exit(1);
  }
  console.log(`Baseline intact: ${m.count} screenshots, approved from ${m.commit} on ${m.approved.slice(0, 10)}.`);
} else {
  console.error('Usage: node scripts/visual/baseline.mjs verify | approve --yes');
  process.exit(1);
}
