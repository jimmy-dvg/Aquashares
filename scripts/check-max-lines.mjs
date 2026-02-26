import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();

const FILE_LIMITS = {
  '.js': 450,
  '.css': 320,
  '.html': 260
};

const TARGET_PATHS = [
  'src',
  '.'
];

const ROOT_HTML_FILES = new Set([
  'index.html',
  'login.html',
  'register.html',
  'post-create.html',
  'post-detail.html',
  'profile.html',
  'admin.html'
]);

const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  '.git',
  '.vscode',
  'public',
  'supabase'
]);

function countLines(filePath) {
  const content = readFileSync(filePath, 'utf8');
  if (!content) {
    return 0;
  }

  return content.split(/\r?\n/).length;
}

function shouldCheckFile(relativePath) {
  const extension = extname(relativePath);
  if (!FILE_LIMITS[extension]) {
    return false;
  }

  if (relativePath.startsWith('src/')) {
    return true;
  }

  return ROOT_HTML_FILES.has(relativePath);
}

function collectFiles(startPath, files = []) {
  const absolutePath = resolve(ROOT, startPath);
  const stats = statSync(absolutePath);

  if (stats.isFile()) {
    files.push(absolutePath);
    return files;
  }

  const entries = readdirSync(absolutePath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) {
        continue;
      }

      collectFiles(join(startPath, entry.name), files);
      continue;
    }

    files.push(resolve(ROOT, startPath, entry.name));
  }

  return files;
}

function toRelativePath(filePath) {
  return filePath.replace(`${ROOT}\\`, '').replace(/\\/g, '/');
}

function checkMaxLines() {
  const candidates = TARGET_PATHS.flatMap((targetPath) => collectFiles(targetPath));
  const violations = [];

  for (const absoluteFilePath of candidates) {
    const relativePath = toRelativePath(absoluteFilePath);

    if (!shouldCheckFile(relativePath)) {
      continue;
    }

    const extension = extname(relativePath);
    const maxLines = FILE_LIMITS[extension];
    const lines = countLines(absoluteFilePath);

    if (lines > maxLines) {
      violations.push({
        path: relativePath,
        lines,
        maxLines
      });
    }
  }

  if (!violations.length) {
    console.log('Max-lines check passed.');
    return;
  }

  console.error('Max-lines check failed. Files exceeding the limit:');
  for (const violation of violations) {
    console.error(`- ${violation.path}: ${violation.lines} lines (max ${violation.maxLines})`);
  }

  process.exitCode = 1;
}

checkMaxLines();
