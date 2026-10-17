import { promises as fs } from 'node:fs';
import path from 'node:path';

const DEFAULT_PROMOTION_STACK_MARKERS = [
  { id: 'unocss-runtime-cdn', pattern: /@unocss\/runtime/i },
  { id: 'vue3-cdn', pattern: /vue@3|vue\.global/i },
  { id: 'lucide-cdn', pattern: /lucide/i },
  { id: 'browser-sfc-loader', pattern: /loadSfc|sfc-loader/i }
];

export function normalizeDemoRoute(route = '/') {
  const raw = String(route || '/').trim();
  if (raw === '' || raw === '/') return '/';

  let pathname = raw;
  try {
    pathname = new URL(raw).pathname;
  } catch {
    pathname = raw.split(/[?#]/)[0];
  }

  const withLeadingSlash = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const collapsed = withLeadingSlash.replace(/\/+/g, '/');
  return collapsed.endsWith('/') ? collapsed : `${collapsed}/`;
}

export async function auditPromotionReadiness(options) {
  if (!options?.target) throw new Error('auditPromotionReadiness requires target');

  const targetRoot = path.resolve(options.target);
  const publicRoot = path.resolve(targetRoot, options.publicDir ?? 'public');
  const sitePath = path.join(publicRoot, options.siteFile ?? 'site.json');
  const indexPath = path.join(publicRoot, options.indexFile ?? 'index.html');
  const bootPath = path.join(publicRoot, 'app', 'boot.js');
  const portfolioPath = path.join(publicRoot, 'content', 'portfolio.json');
  const issues = [];

  const site = await readOptionalJson(sitePath, issues, 'site-json');
  const portfolio = await readOptionalJson(portfolioPath, [], 'portfolio-json');
  const indexText = await readOptionalUtf8(indexPath);
  const bootText = await readOptionalUtf8(bootPath);
  const route = normalizeDemoRoute(options.route ?? site?.basePath ?? '/');
  const slug = String(options.slug ?? site?.slug ?? path.basename(targetRoot)).replace(/-lite$/, '');
  const promotionMode = Boolean(options.promote);

  auditSiteContract({ issues, indexText, site, sitePath, indexPath, targetRoot, route, promotionMode });
  const stack = auditPromotionStack([indexText, bootText].filter(Boolean).join('\n'), options.requiredStackMarkers);
  auditStackContract(issues, stack);

  const portfolioEntry = findPromotionEntry(portfolio, slug, route);
  const rollbackPath = options.rollbackPath ?? portfolioEntry?.rollback_path ?? portfolioEntry?.rollbackPath ?? null;
  auditRollbackContract({ issues, rollbackPath, promotionMode, portfolioPath, targetRoot });

  const evidence = normalizeEvidence(options.evidence);
  auditEvidenceContract(issues, evidence, promotionMode);

  return {
    ok: issues.filter((issue) => issue.severity === 'error').length === 0,
    target: targetRoot,
    generatedAt: new Date().toISOString(),
    slug,
    route,
    promotionMode,
    stack,
    rollbackPath,
    evidence,
    summary: summarizeIssues(issues),
    issues
  };
}

export function formatPromotionReport(report) {
  const lines = [
    `Promotion audit: ${report.ok ? 'PASS' : 'FAIL'}`,
    `Target: ${report.target}`,
    `Route: ${report.route}`,
    `Slug: ${report.slug}`,
    `Issues: ${report.summary.total} total (${report.summary.errors} errors, ${report.summary.warnings} warnings)`,
    '',
    'Stack markers:'
  ];

  for (const marker of report.stack) lines.push(`  - ${marker.id}: ${marker.present ? 'present' : 'missing'}`);
  if (report.rollbackPath) lines.push(`Rollback: ${report.rollbackPath}`);
  appendPromotionIssues(lines, report.issues);
  return `${lines.join('\n')}\n`;
}

function auditSiteContract(context) {
  const { issues, indexText, site, sitePath, indexPath, targetRoot, route, promotionMode } = context;
  if (!indexText) {
    issues.push(promotionIssue('error', 'missing-index', toPosix(path.relative(targetRoot, indexPath)),
      'Public index.html is required for a promotable static/V gateway surface'));
  }

  if (site?.basePath && normalizeDemoRoute(site.basePath) !== route) {
    issues.push(promotionIssue('error', 'route-mismatch', toPosix(path.relative(targetRoot, sitePath)),
      `site.basePath ${site.basePath} does not match expected route ${route}`));
  }

  if (route !== '/' && !route.startsWith('/demo/')) {
    issues.push(promotionIssue('error', 'invalid-demo-route', null,
      `Promotion route must be / or /demo/{project}/, received ${route}`));
  }

  if (site && typeof site.online !== 'boolean') {
    issues.push(promotionIssue(promotionMode ? 'error' : 'warning', 'online-flag-not-explicit',
      toPosix(path.relative(targetRoot, sitePath)), 'site.online must be an explicit boolean'));
  }
}

function auditStackContract(issues, stack) {
  for (const marker of stack.filter((item) => !item.present)) {
    issues.push(promotionIssue('error', 'missing-stack-marker', marker.id,
      `Required stack marker is missing: ${marker.id}`));
  }
}

function auditRollbackContract(context) {
  const { issues, rollbackPath, promotionMode, portfolioPath, targetRoot } = context;
  if (rollbackPath) return;
  issues.push(promotionIssue(promotionMode ? 'error' : 'warning', 'missing-rollback-path',
    toPosix(path.relative(targetRoot, portfolioPath)), 'Promotion requires an explicit rollback path before live cutover'));
}

function auditEvidenceContract(issues, evidence, promotionMode) {
  for (const [key, value] of Object.entries(evidence)) {
    if (!value) {
      issues.push(promotionIssue(promotionMode ? 'error' : 'warning', `missing-${key}-evidence`, null,
        `Promotion evidence is missing: ${key}`));
    }
  }
}

function auditPromotionStack(text, markers = DEFAULT_PROMOTION_STACK_MARKERS) {
  return markers.map((marker) => ({
    id: marker.id,
    present: marker.pattern.test(text)
  }));
}

async function readOptionalJson(filePath, issues, code) {
  const text = await readOptionalUtf8(filePath);
  if (text === null) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    issues.push(promotionIssue('error', code, filePath, error.message));
    return null;
  }
}

async function readOptionalUtf8(filePath) {
  try {
    const buffer = await fs.readFile(filePath);
    if (buffer.includes(0)) return null;
    return buffer.toString('utf8');
  } catch {
    return null;
  }
}

function findPromotionEntry(portfolio, slug, route) {
  const routes = Array.isArray(portfolio?.routes) ? portfolio.routes : [];
  return routes.find((entry) => {
    const entryRoute = normalizeDemoRoute(entry.folder_route ?? entry.route ?? entry.public_href ?? '/');
    return entry.slug === slug || entryRoute === route;
  });
}

function normalizeEvidence(evidence = {}) {
  return {
    hostedSource: Boolean(evidence.hostedSource),
    localSmoke: Boolean(evidence.localSmoke),
    visual: Boolean(evidence.visual),
    functional: Boolean(evidence.functional),
    liveSecretBoundary: Boolean(evidence.liveSecretBoundary),
    rollback: Boolean(evidence.rollback)
  };
}

function appendPromotionIssues(lines, issues) {
  if (issues.length === 0) return;
  lines.push('');
  lines.push('Issues:');
  for (const issue of issues) {
    const location = [issue.file, issue.line].filter(Boolean).join(':');
    lines.push(`  - [${issue.severity}] ${issue.code}${location ? ` ${location}` : ''}: ${issue.message}`);
  }
}

function promotionIssue(severity, code, file, message) {
  return {
    severity,
    code,
    file,
    message
  };
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
