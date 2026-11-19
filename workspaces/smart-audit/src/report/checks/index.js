/**
 * The enabled v1 checks, in the order of the contract's six families
 * (docs/SCOPE-V1.md). Each check is an object:
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
 * ctx is { courseData, course, blocks }. Checks are pure: no ZIP or network.
 * Rich-text checks parse HTML with DOMParser (an inert parser, not a renderer).
 */

import { imageAlt } from './image-alt.js';
import { headingStructure } from './heading-structure.js';
import { linkPurpose } from './link-purpose.js';
import { mediaAlternatives } from './media-alternatives.js';
import { themeContrast } from './theme-contrast.js';
import { titlesNavigation } from './titles-navigation.js';

export const CHECKS = [imageAlt, headingStructure, linkPurpose, mediaAlternatives, themeContrast, titlesNavigation];
