/**
 * The enabled v1 checks, in report order. Each check is an object:
 *
 *   {
 *     id:       'image-alt',                  // stable id, appears in findings
 *     title:    'Image alternative text',
 *     sc:       ['1.1.1'],                    // default success criteria for its findings
 *     inspects: ['image/*', 'gallery/*'],     // block identities whose content it understands;
 *                                             // used to report blocks that NO check read
 *     run(ctx): Array<{ severity, location, message, remediation?, measured?, sc?, basis? }>
 *   }
 *
 * ctx is { courseData, course, blocks }. Checks are pure: no ZIP, DOM or network.
 * The six v1 families (docs/SCOPE-V1.md) are added here, one per file.
 */

import { imageAlt } from './image-alt.js';
import { themeContrast } from './theme-contrast.js';

export const CHECKS = [imageAlt, themeContrast];
