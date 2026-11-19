/**
 * The one finding shape every check returns (docs/SCOPE-V1.md, severity model).
 *
 *   FAIL         mechanically certain
 *   REVIEW       detected, but needs human judgment or information the export lacks
 *   NOT CHECKED  looked at, could not be evaluated; says why
 *
 * Each finding carries: WCAG success criterion, location, severity, a measured
 * value where applicable, and a one-line remediation note.
 */

export const SEVERITIES = Object.freeze(['FAIL', 'REVIEW', 'NOT CHECKED']);

/**
 * What a finding rests on: a WCAG success criterion, or "best-practice" where
 * W3C guidance advises something but defines no failure (for example skipped
 * heading levels). Best-practice findings are never FAIL.
 */
export const BASES = Object.freeze(['wcag', 'best-practice']);

const SC_PATTERN = /^[1-4]\.\d{1,2}\.\d{1,2}$/;

/**
 * Validate and freeze a finding. Throws TypeError on anything malformed so a
 * buggy check fails loudly in tests instead of producing a vague report.
 */
export function createFinding(input) {
  const { checkId, sc, severity, location, message, remediation = null, measured = null, basis = 'wcag' } = input ?? {};

  if (typeof checkId !== 'string' || !checkId) throw new TypeError('finding.checkId is required');
  if (!SEVERITIES.includes(severity)) {
    throw new TypeError(`finding.severity must be one of ${SEVERITIES.join(', ')} (got ${JSON.stringify(severity)})`);
  }

  const scList = Array.isArray(sc) ? sc : sc ? [sc] : [];
  if (!scList.length || !scList.every((s) => SC_PATTERN.test(s))) {
    throw new TypeError('finding.sc must be one or more WCAG success criterion numbers such as "1.1.1"');
  }

  if (typeof message !== 'string' || !message.trim()) throw new TypeError('finding.message is required');

  if (!BASES.includes(basis)) throw new TypeError(`finding.basis must be one of ${BASES.join(', ')} (got ${JSON.stringify(basis)})`);
  if (basis === 'best-practice' && severity === 'FAIL') {
    throw new TypeError('a best-practice finding can never be FAIL; WCAG defines no failure for it');
  }

  const needsRemediation = severity === 'FAIL' || severity === 'REVIEW';
  if (needsRemediation && (typeof remediation !== 'string' || !remediation.trim())) {
    throw new TypeError(`finding.remediation is required for ${severity} findings`);
  }

  if (!location || typeof location !== 'object' || !location.scope) {
    throw new TypeError('finding.location is required (use courseLocation() for course-wide findings)');
  }

  return Object.freeze({
    checkId,
    sc: Object.freeze([...scList]),
    severity,
    basis,
    location,
    message: message.trim(),
    remediation: typeof remediation === 'string' ? remediation.trim() : null,
    measured,
  });
}

const SEVERITY_ORDER = { FAIL: 0, REVIEW: 1, 'NOT CHECKED': 2 };

/** Most severe first, then course order (lesson, block, item), then check id. */
export function compareFindings(a, b) {
  return (
    SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
    (a.location.lessonIndex ?? -1) - (b.location.lessonIndex ?? -1) ||
    (a.location.blockIndex ?? -1) - (b.location.blockIndex ?? -1) ||
    String(a.location.itemPath ?? '').localeCompare(String(b.location.itemPath ?? '')) ||
    a.checkId.localeCompare(b.checkId)
  );
}

export function sortFindings(findings) {
  return [...findings].sort(compareFindings);
}
