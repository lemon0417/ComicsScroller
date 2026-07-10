import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(new URL('.', import.meta.url).pathname, '..');
const pkgPath = resolve(root, 'package.json');
const manifestPaths = [
  resolve(root, 'src/manifest/manifest.json'),
  resolve(root, 'src/manifest/manifest.dev.json'),
];

const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

const pkgVersion = String(pkg.version || '').trim();

if (!pkgVersion) {
  console.error('Release check failed: missing version in package.json');
  process.exit(1);
}

for (const manifestPath of manifestPaths) {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const manifestVersion = String(manifest.version || '').trim();

  if (!manifestVersion) {
    console.error(`Release check failed: missing version in ${manifestPath}`);
    process.exit(1);
  }

  if (pkgVersion !== manifestVersion) {
    console.error(
      `Release check failed: package.json (${pkgVersion}) does not match ${manifestPath} (${manifestVersion}).`,
    );
    process.exit(1);
  }
}

const tagName = String(
  process.env.COMIC_SCROLLER_RELEASE_TAG || process.env.GITHUB_REF_NAME || '',
).trim();
const shouldValidateTag =
  Boolean(process.env.COMIC_SCROLLER_RELEASE_TAG) ||
  process.env.GITHUB_REF_TYPE === 'tag';

if (tagName && shouldValidateTag) {
  const tagVersion = tagName.startsWith('v') ? tagName.slice(1) : tagName;

  if (!/^\d+\.\d+\.\d+$/.test(tagVersion)) {
    console.error(`Release check failed: invalid release tag "${tagName}".`);
    process.exit(1);
  }

  if (tagVersion !== pkgVersion) {
    console.error(
      `Release check failed: tag ${tagName} does not match package.json (${pkgVersion}).`,
    );
    process.exit(1);
  }
}

console.log(`Release check OK: version ${pkgVersion}`);
