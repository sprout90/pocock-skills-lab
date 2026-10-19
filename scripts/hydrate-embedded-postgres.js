import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { arch, platform } from 'node:os';

const packages = {
  'win32:x64': '@embedded-postgres/windows-x64',
  'linux:x64': '@embedded-postgres/linux-x64',
  'linux:arm64': '@embedded-postgres/linux-arm64',
  'darwin:x64': '@embedded-postgres/darwin-x64',
  'darwin:arm64': '@embedded-postgres/darwin-arm64',
};

const packageName = packages[`${platform()}:${arch()}`];
if (!packageName) {
  process.exit(0);
}

const require = createRequire(import.meta.url);
let packageJson;
try {
  packageJson = require.resolve(`${packageName}/package.json`);
} catch {
  process.exit(0);
}

const packageRoot = path.dirname(packageJson);
const script = path.join(packageRoot, 'scripts', 'hydrate-symlinks.js');
if (!existsSync(script)) {
  process.exit(0);
}

const result = spawnSync(process.execPath, [script], {
  cwd: packageRoot,
  stdio: 'inherit',
});
process.exit(result.status ?? 1);
