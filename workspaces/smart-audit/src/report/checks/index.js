/**
 * The enabled v1 checks, in report order. Each check is an object:
 *
 *   {
 *     id:       'image-alt',                  // stable id, appears in findings
 *     title:    'Image alternative text',
 *     sc:       ['1.1.1'],                    // default success criteria for its findings
 *     inspects: ['image/*', 'interactive/*'], // block identities it reads; used to
 *                                             // report blocks that NO check examined
 *     run(ctx): Array<{ severity, location, message, remediation?, measured?, sc? }>
 *   }
 *
 * ctx is { courseData, course, blocks }. Checks are pure: no ZIP, DOM or network.
 * The six v1 families (docs/SCOPE-V1.md) are added here, one per file.
 */
export const CHECKS = [];
