/**
 * Check 5: theme colour contrast (WCAG SC 1.4.3 and 1.4.11, Level AA).
 *
 * What the export holds is one colour: the theme accent. It has no text and
 * background pairs, and the Rise player chooses foreground colours itself, so
 * where the accent is actually used (text, button fill, header) is player
 * behaviour, not export data. That makes every result here REVIEW and never
 * FAIL (docs/SCOPE-V1.md, family 5).
 *
 * Reported against white, the usual page background. A finding appears when
 * the accent falls below 4.5:1 (normal text) against white.
 */

import { courseLocation } from '../walk.js';
import { contrastRatio, formatRatio, nearestCompliantOnWhite, parseHex } from '../colour.js';

const NORMAL_TEXT = 4.5;
const LARGE_TEXT_AND_UI = 3;

export const themeContrast = {
  id: 'theme-contrast',
  title: 'Theme accent colour contrast',
  sc: ['1.4.3', '1.4.11'],
  inspects: [],

  run({ course }) {
    const accent = course?.theme?.colorAccent ?? course?.color;

    if (typeof accent !== 'string' || !parseHex(accent)) {
      return [
        {
          severity: 'NOT CHECKED',
          location: courseLocation(),
          message: accent === undefined || accent === null ? 'The export holds no theme accent colour to check.' : `The theme accent colour "${accent}" is not a hex colour, so it could not be checked.`,
        },
      ];
    }

    const onWhite = contrastRatio(accent, '#ffffff');
    const onBlack = contrastRatio(accent, '#000000');
    if (onWhite >= NORMAL_TEXT) return [];

    const suggestion = nearestCompliantOnWhite(accent, NORMAL_TEXT);
    const level =
      onWhite >= LARGE_TEXT_AND_UI
        ? `That is below the 4.5:1 needed for normal-size text, but meets the 3:1 needed for large text and interface components.`
        : `That is below both the 4.5:1 needed for normal-size text and the 3:1 needed for large text and interface components.`;

    return [
      {
        severity: 'REVIEW',
        location: courseLocation(),
        message:
          `The theme accent colour ${accent.toLowerCase()} has a contrast ratio of ${formatRatio(onWhite)}:1 against white (${formatRatio(onBlack)}:1 against black). ${level} ` +
          `The export does not show where the player uses this colour, so this is a prompt to check, not a confirmed failure. It affects every course built on this theme.`,
        remediation: `If the accent colour is used for text or controls on a white background, darken it to ${suggestion} or darker.`,
        measured: { value: `${formatRatio(onWhite)}:1 against white`, required: '4.5:1 for text, 3:1 for large text and interface components' },
      },
    ];
  },
};
