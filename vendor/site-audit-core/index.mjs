import { promises as fs } from 'node:fs';
import path from 'node:path';

export { auditPromotionReadiness, formatPromotionReport, normalizeDemoRoute } from './promotion.mjs';

const DEFAULT_FILE_NAME_PATTERN = '^[A-Za-z0-9._-]+$';
const DEFAULT_TEXT_EXTENSIONS = new Set([
  '.astro',
  '.css',
  '.csv',
  '.html',
  '.js',
  '.json',
  '.jsonc',
  '.jsx',
  '.md',
  '.mjs',
  '.scss',
  '.svg',
  '.toml',
  '.ts',
  '.tsx',
  '.txt',
  '.vue',
  '.xml',
  '.yaml',
  '.yml'
]);
const DATA_EXTENSIONS = new Set(['.csv', '.json', '.jsonc', '.js', '.mjs', '.toml', '.txt', '.yaml', '.yml']);
const RESERVED_WINDOWS_NAMES = new Set([
  'con',
  'prn',
  'aux',
  'nul',
  'com1',
  'com2',
  'com3',
  'com4',
  'com5',
  'com6',
  'com7',
  'com8',
  'com9',
  'lpt1',
  'lpt2',
  'lpt3',
  'lpt4',
  'lpt5',
  'lpt6',
  'lpt7',
  'lpt8',
  'lpt9'
]);

export async function loadManifest(manifestPath) {
  if (!manifestPath) return {};
  const raw = await fs.readFile(manifestPath, 'utf8');
  return JSON.parse(raw);
}

export async function auditSite(options) {
  const targetRoot = path.resolve(options.target);
  const maxLines = Number(options.maxLines ?? 600);
  const manifest = normalizeManifest(options.manifest ?? {});
  const files = (await listFiles(targetRoot)).filter((file) => !isIgnoredRelativePath(file.relativePath, manifest));
  const filesByRelativePath = new Map(files.map((file) => [file.relativePath, file]));
  const issues = [];

  issues.push(...auditExpectedFiles(filesByRelativePath, manifest));
  issues.push(...auditFileNames(files, manifest));
  issues.push(...await auditLineCounts(files, maxLines));
  issues.push(...await auditAnchors(files, filesByRelativePath, manifest));

  const externalDataSources = await collectExternalDataSources(files);
  issues.push(...auditExternalDataSources(externalDataSources, manifest));

  return {
    ok: issues.filter((issue) => issue.severity === 'error').length === 0,
    target: targetRoot,
    generatedAt: new Date().toISOString(),
    config: {
      maxLines,
      manifest: manifest.sourcePath ?? null,
      ignoredPaths: manifest.ignoredPaths
    },
    summary: summarizeIssues(issues),
    files: {
      expected: manifest.expectedFiles,
      actual: files.map((file) => file.relativePath),
      missing: manifest.expectedFiles.filter((file) => !filesByRelativePath.has(file)),
      unexpected: manifest.expectedFiles.length > 0
        ? files.filter((file) => !manifest.expectedFiles.includes(file.relativePath)).map((file) => file.relativePath)
        : []
    },
    externalDataSources,
    issues
  };
}

export function formatHumanReport(report) {
  const lines = [];
  lines.push(`Site audit: ${report.ok ? 'PASS' : 'FAIL'}`);
  lines.push(`Target: ${report.target}`);
  lines.push(`Files: ${report.files.actual.length} actual, ${report.files.expected.length} expected`);
  lines.push(`Issues: ${report.summary.total} total (${report.summary.errors} errors, ${report.summary.warnings} warnings)`);

  if (report.files.missing.length > 0) {
    lines.push('');
    lines.push('Missing expected files:');
    for (const file of report.files.missing) lines.push(`  - ${file}`);
  }

  if (report.files.unexpected.length > 0) {
    lines.push('');
    lines.push('Unexpected files:');
    for (const file of report.files.unexpected) lines.push(`  - ${file}`);
  }

  if (report.externalDataSources.length > 0) {
    lines.push('');
    lines.push('External data sources:');
    for (const source of report.externalDataSources) {
      lines.push(`  - ${source.url} (${source.file}:${source.line})`);
    }
  }

  if (report.issues.length > 0) {
    lines.push('');
    lines.push('Issues:');
    for (const issue of report.issues) {
      const location = [issue.file, issue.line].filter(Boolean).join(':');
      lines.push(`  - [${issue.severity}] ${issue.code}${location ? ` ${location}` : ''}: ${issue.message}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

function normalizeManifest(manifest) {
  const expectedFiles = normalizePathList(manifest.expectedFiles ?? manifest.files ?? []);
  const fileNamePattern = new RegExp(manifest.fileNamePattern ?? DEFAULT_FILE_NAME_PATTERN);
  return {
    sourcePath: manifest.sourcePath ?? null,
    expectedFiles,
    fileNamePattern,
    requiredAnchors: normalizePathList(manifest.requiredAnchors ?? []),
    ignoredPaths: normalizePathList(manifest.ignoredPaths ?? []),
    allowedExternalSources: normalizeAllowedSources(
      manifest.allowedExternalSources ?? manifest.externalSourceAllowlist ?? manifest.externalSources ?? []
    )
  };
}

function isIgnoredRelativePath(relativePath, manifest) {
  return manifest.ignoredPaths.some((pattern) => {
    if (pattern.endsWith('/**')) {
      const prefix = pattern.slice(0, -3);
      return relativePath === prefix || relativePath.startsWith(`${prefix}/`);
    }
    return relativePath === pattern || relativePath.startsWith(`${pattern}/`);
  });
}

async function listFiles(root) {
  const entries = [];
  await walk(root, root, entries);
  return entries.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

async function walk(root, currentDir, entries) {
  const dirents = await fs.readdir(currentDir, { withFileTypes: true });
  for (const dirent of dirents) {
    if (shouldSkipDirent(dirent)) continue;
    const absolutePath = path.join(currentDir, dirent.name);
    if (dirent.isDirectory()) {
      await walk(root, absolutePath, entries);
      continue;
    }
    if (!dirent.isFile()) continue;
    const stat = await fs.stat(absolutePath);
    entries.push({
      absolutePath,
      relativePath: toPosix(path.relative(root, absolutePath)),
      sizeBytes: stat.size
    });
  }
}

function auditExpectedFiles(filesByRelativePath, manifest) {
  const issues = [];
  for (const expectedFile of manifest.expectedFiles) {
    if (!filesByRelativePath.has(expectedFile)) {
      issues.push({
        severity: 'error',
        code: 'missing-expected-file',
        file: expectedFile,
        message: `Expected file is missing: ${expectedFile}`
      });
    }
  }
  if (manifest.expectedFiles.length === 0) return issues;
  const expected = new Set(manifest.expectedFiles);
  for (const actualFile of filesByRelativePath.keys()) {
    if (!expected.has(actualFile)) {
      issues.push({
        severity: 'warning',
        code: 'unexpected-file',
        file: actualFile,
        message: `File is present but is not listed in the manifest: ${actualFile}`
      });
    }
  }
  return issues;
}

function auditFileNames(files, manifest) {
  const issues = [];
  for (const file of files) {
    for (const segment of file.relativePath.split('/')) {
      const baseName = segment.replace(/\.[^.]+$/, '').toLowerCase();
      if (!manifest.fileNamePattern.test(segment)) {
        issues.push({
          severity: 'warning',
          code: 'unsafe-file-name',
          file: file.relativePath,
          message: `File path segment "${segment}" does not match the configured safe filename pattern`
        });
      }
      if (RESERVED_WINDOWS_NAMES.has(baseName)) {
        issues.push({
          severity: 'warning',
          code: 'reserved-file-name',
          file: file.relativePath,
          message: `File path segment "${segment}" uses a reserved Windows device name`
        });
      }
    }
  }
  return issues;
}

async function auditLineCounts(files, maxLines) {
  const issues = [];
  for (const file of files.filter(isTextLikeFile)) {
    const text = await readUtf8(file.absolutePath);
    if (text === null) continue;
    const lineCount = countLines(text);
    file.lineCount = lineCount;
    if (lineCount > maxLines) {
      issues.push({
        severity: 'warning',
        code: 'file-too-long',
        file: file.relativePath,
        message: `File has ${lineCount} lines, above the configured limit of ${maxLines}`
      });
    }
  }
  return issues;
}

async function auditAnchors(files, filesByRelativePath, manifest) {
  const htmlFiles = files.filter((file) => ['.htm', '.html'].includes(path.extname(file.relativePath).toLowerCase()));
  const anchorsByFile = new Map();
  const htmlTextByFile = new Map();
  const issues = [];

  for (const file of htmlFiles) {
    const text = await readUtf8(file.absolutePath);
    if (text === null) continue;
    htmlTextByFile.set(file.relativePath, text);
    anchorsByFile.set(file.relativePath, collectAnchorTargets(text));
  }

  for (const file of htmlFiles) {
    const text = htmlTextByFile.get(file.relativePath);
    if (!text) continue;
    for (const href of collectHrefAnchors(text)) {
      const target = resolveAnchorTarget(file.relativePath, href.value);
      if (!target || target.anchor === '' || target.anchor.toLowerCase() === 'top') continue;

      if (!filesByRelativePath.has(target.file)) {
        issues.push({
          severity: 'error',
          code: 'missing-anchor-file',
          file: file.relativePath,
          line: href.line,
          message: `Anchor link points to missing file: ${href.value}`
        });
        continue;
      }

      const targetAnchors = anchorsByFile.get(target.file);
      if (!targetAnchors) continue;
      if (!targetAnchors.has(target.anchor)) {
        issues.push({
          severity: 'error',
          code: 'missing-internal-anchor',
          file: file.relativePath,
          line: href.line,
          message: `Anchor link "${href.value}" does not match an id or name in ${target.file}`
        });
      }
    }
  }

  issues.push(...auditRequiredAnchors(anchorsByFile, manifest));

  return issues;
}

function auditRequiredAnchors(anchorsByFile, manifest) {
  if (manifest.requiredAnchors.length === 0) return [];
  const allAnchors = new Set();
  for (const anchors of anchorsByFile.values()) {
    for (const anchor of anchors) allAnchors.add(anchor);
  }
  return manifest.requiredAnchors
    .filter((anchor) => !allAnchors.has(anchor))
    .map((anchor) => ({
      severity: 'error',
      code: 'missing-required-anchor',
      message: `Required anchor is missing from HTML: #${anchor}`
    }));
}

async function collectExternalDataSources(files) {
  const sources = [];
  for (const file of files.filter(isDataFile)) {
    const text = await readUtf8(file.absolutePath);
    if (text === null) continue;
    const urlPattern = /\bhttps?:\/\/[^\s"'<>),\\\]]+/gi;
    for (const match of text.matchAll(urlPattern)) {
      sources.push({
        file: file.relativePath,
        line: lineForIndex(text, match.index ?? 0),
        url: trimTrailingUrlPunctuation(match[0]),
        host: hostForUrl(match[0])
      });
    }
  }
  return sources;
}

function auditExternalDataSources(externalDataSources, manifest) {
  if (manifest.allowedExternalSources.length === 0) return [];
  return externalDataSources
    .filter((source) => !isAllowedExternalSource(source, manifest.allowedExternalSources))
    .map((source) => ({
      severity: 'warning',
      code: 'unapproved-external-data-source',
      file: source.file,
      line: source.line,
      message: `External data source is not listed in allowedExternalSources: ${source.url}`
    }));
}

function collectAnchorTargets(html) {
  const anchors = new Set();
  const attrPattern = /\s(?:id|name)\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s"'=<>`]+))/gi;
  for (const match of html.matchAll(attrPattern)) {
    const value = decodeFragment(match[1] ?? match[2] ?? match[3] ?? '');
    if (value) anchors.add(value);
  }
  return anchors;
}

function collectHrefAnchors(html) {
  const hrefs = [];
  const hrefPattern = /\shref\s*=\s*(?:"([^"]*#[^"]*)"|'([^']*#[^']*)'|([^\s"'=<>`]*#[^\s"'=<>`]*))/gi;
  for (const match of html.matchAll(hrefPattern)) {
    hrefs.push({
      value: match[1] ?? match[2] ?? match[3] ?? '',
      line: lineForIndex(html, match.index ?? 0)
    });
  }
  return hrefs;
}

function resolveAnchorTarget(sourceFile, href) {
  if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return null;
  const hashIndex = href.indexOf('#');
  if (hashIndex < 0) return null;
  const hrefPath = href.slice(0, hashIndex);
  const anchor = decodeFragment(href.slice(hashIndex + 1));
  if (hrefPath === '') return { file: sourceFile, anchor };

  const sourceDir = path.posix.dirname(sourceFile);
  const pathWithoutQuery = hrefPath.split('?')[0];
  const rawTarget = pathWithoutQuery.endsWith('/') ? `${pathWithoutQuery}index.html` : pathWithoutQuery;
  const targetFile = rawTarget.startsWith('/')
    ? toPosix(path.posix.normalize(rawTarget.slice(1)))
    : toPosix(path.posix.normalize(path.posix.join(sourceDir, rawTarget)));
  return { file: targetFile.replace(/^\.\//, ''), anchor };
}

function normalizePathList(files) {
  if (!Array.isArray(files)) return [];
  return [...new Set(files.map((file) => toPosix(String(file).trim()).replace(/^\.\//, '')).filter(Boolean))].sort();
}

function normalizeAllowedSources(sources) {
  if (!Array.isArray(sources)) return [];
  return sources.map((source) => String(source).trim()).filter(Boolean);
}

function isAllowedExternalSource(source, allowedSources) {
  return allowedSources.some((allowed) => {
    if (allowed.startsWith('http://') || allowed.startsWith('https://')) {
      return source.url.startsWith(allowed);
    }
    if (allowed.startsWith('*.')) {
      const domain = allowed.slice(2);
      return source.host === domain || source.host.endsWith(`.${domain}`);
    }
    return source.host === allowed;
  });
}

function shouldSkipDirent(dirent) {
  return dirent.isDirectory() && new Set(['.git', '.hg', '.svn', 'node_modules']).has(dirent.name);
}

function isTextLikeFile(file) {
  return DEFAULT_TEXT_EXTENSIONS.has(path.extname(file.relativePath).toLowerCase());
}

function isDataFile(file) {
  const parts = file.relativePath.split('/');
  const ext = path.extname(file.relativePath).toLowerCase();
  const base = path.basename(file.relativePath).toLowerCase();
  const dataLikeName = base.startsWith('data.') || base.startsWith('content.') || base.includes('manifest');
  return DATA_EXTENSIONS.has(ext) && (parts.includes('data') || dataLikeName);
}

async function readUtf8(filePath) {
  const buffer = await fs.readFile(filePath);
  if (buffer.includes(0)) return null;
  return buffer.toString('utf8');
}

function countLines(text) {
  if (text.length === 0) return 0;
  return text.split(/\r\n|\r|\n/).length;
}

function lineForIndex(text, index) {
  return text.slice(0, index).split(/\r\n|\r|\n/).length;
}

function decodeFragment(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function trimTrailingUrlPunctuation(url) {
  return url.replace(/[.;:!?]+$/g, '');
}

function hostForUrl(url) {
  try {
    return new URL(trimTrailingUrlPunctuation(url)).host;
  } catch {
    return '';
  }
}

function summarizeIssues(issues) {
  return {
    total: issues.length,
    errors: issues.filter((issue) => issue.severity === 'error').length,
    warnings: issues.filter((issue) => issue.severity === 'warning').length
  };
}

function toPosix(value) {
  return value.replaceAll(path.win32.sep, '/').replaceAll(path.sep, '/');
}
