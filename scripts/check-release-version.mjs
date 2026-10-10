/**
 * Fail CI whenever a change is submitted without a newer application release.
 * PRs compare against their base branch; main pushes compare against the parent.
 * The conversion core package version is deliberately managed independently.
 */
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const releasePath = 'app/release.ts';
const extract = (source) => {
  const channel = source.match(/export const studioChannel = '([^']+)'/);
  const version = source.match(/export const studioVersion = '([^']+)'/);
  if (!channel || !version || channel[1] !== 'Alpha' || !/^\\d+\\.\\d+(?:\\.\\d+)?$/.test(version[1])) {
    throw new Error('Invalid application release. Expected Alpha and a numeric version (e.g. 0.2.1).');
  }
  return version[1];
};

const current = extract(readFileSync(releasePath, 'utf8'));
const baseRef = process.env.GITHUB_EVENT_NAME === 'pull_request'
  ? `origin/${process.env.GITHUB_BASE_REF || 'main'}`
  : 'HEAD^';

let previousSource;
try {
  previousSource = execFileSync('git', ['show', `${baseRef}:${releasePath}`], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
} catch (error) {
  execFileSync('git', ['cat-file', '-e', `${baseRef}:app/App.tsx`], {
    encoding: 'utf8',
    stdio: 'ignore',
  });
  // First rollout: older commits did not have a release module.
  // Later pushes MUST increase its version.
  console.log(`Version tracking initialized: Alpha ${current} (${baseRef})`);
  process.exit(0);
}

const previous = extract(previousSource);
function parts(version) {
  return version.split('.').map(Number).concat(Array(3).fill(0)).slice(0, 3);
}
const now = parts(current);
const before = parts(previous);
const isNewer = now.some((value, i) =>
  now.slice(0, i).every((n, j) => n === before[j]) && value > before[i]
);
if (!isNewer) {
  console.error(`Release version must increase for every published change: Alpha ${previous} → Alpha ${current}`);
  process.exit(1);
}
console.log(`Release increment verified: Alpha ${previous} → Alpha ${current}`);
