import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(new URL('.', import.meta.url).pathname, '..');
const outputPath = resolve(root, process.argv[2] || 'release-notes.txt');
const tagName = String(process.env.GITHUB_REF_NAME || '').trim();
const tagPrefix = tagName.startsWith('v') ? 'v' : '';

function run(command, args) {
  try {
    return execFileSync(command, args, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

function generateConventionalNotes() {
  return run(resolve(root, 'node_modules/.bin/conventional-changelog'), [
    '-p',
    'angular',
    '-r',
    '1',
    '--tag-prefix',
    tagPrefix,
  ]);
}

function findPreviousTag() {
  const args = ['describe', '--tags', '--abbrev=0'];
  if (tagPrefix) {
    args.push('--match', `${tagPrefix}*`);
  }
  args.push('HEAD^');
  return run('git', args);
}

function generateCommitFallback() {
  const previousTag = findPreviousTag();
  const range = previousTag ? `${previousTag}..HEAD` : '';
  const args = ['log', '--pretty=format:- %s (%h)'];
  if (range) {
    args.push(range);
  }
  const commits = run('git', args);
  return `## Changes\n${commits}`;
}

const notes = generateConventionalNotes() || generateCommitFallback();
writeFileSync(outputPath, `${notes.trim()}\n`);
console.log(`Wrote ${outputPath}`);
