/**
 * Issue collector — the v1 verification pass, relocated verbatim from index.html.
 *
 * This is NOT the audit-check module. Per docs/RESTART-BRIEF.md §1, real check
 * logic (src/audit.js) stays blocked until the extraction completeness gate
 * passes. This function only surfaces gaps the dump already knows about
 * (missing alt text, empty slots, unknown blocks/fields) so the dump tool stays
 * useful for manual extraction verification. Pure function over the dump model.
 */

import { toStr } from './extract.js';
import { stripHtml } from './html.js';

export function collectIssues(dump) {
  const issues = [];

  if (dump.meta.coverImage?.altEmpty)
    issues.push({ level: 'warn', path: 'course', message: 'Cover image has empty or missing alt text' });

  for (const lesson of dump.lessons) {
    const loc = `"${lesson.title}"`;

    if (!lesson.title?.trim())
      issues.push({ level: 'error', path: loc, message: 'Lesson has no title' });
    else if (lesson.title.length > 80)
      issues.push({ level: 'warn', path: loc, message: `Lesson title is ${lesson.title.length} chars (>80)` });

    if (lesson.type === 'section' && !lesson.blocks?.length)
      issues.push({ level: 'warn', path: loc, message: 'Section has no lessons beneath it' });

    for (const block of lesson.blocks ?? []) {
      const bloc = `${loc} › ${block.identity}`;

      if (block.backgroundImage?.altEmpty)
        issues.push({ level: 'error', path: bloc, message: 'Background image missing alt text' });

      // Unknown block fields
      for (const uf of block.unknownBlockFields ?? []) {
        issues.push({ level: 'unknown', path: bloc, message: `Unknown block-level field: "${uf.key}" (${uf.valueType})` });
      }

      for (const item of block.items ?? []) {
        // Use item title in path where available — helps identify which panel in an accordion/tab
        const itemLabel = item.title ? `"${stripHtml(toStr(item.title)).slice(0, 40)}"` : 'item';
        const iloc = `${bloc} › ${itemLabel}`;

        // Images
        if (item.image?.altEmpty)
          issues.push({ level: 'error', path: iloc, message: 'Image missing alt text' });

        // Empty image slot — media container present but no image placed.
        // Flag as warn: could be intentional, but easy for a designer to miss,
        // especially in accordion/tab panels that require navigating into the block.
        if (item.imageSlotEmpty)
          issues.push({ level: 'warn', path: iloc, message: 'Image slot is empty — verify whether an image was intentionally omitted' });

        if (item.heading !== undefined && !stripHtml(toStr(item.heading)).trim() && block.identity?.includes('heading'))
          issues.push({ level: 'error', path: iloc, message: 'Heading block is empty' });

        for (const link of item.links ?? []) {
          if (link.empty)                issues.push({ level: 'error', path: iloc, message: 'Link with empty href' });
          else if (link.missingProtocol) issues.push({ level: 'error', path: iloc, message: `Link missing protocol: "${link.href}"` });
        }

        if (item.destination) {
          if (item.destination.empty)                issues.push({ level: 'error', path: iloc, message: 'Button has no destination URL' });
          else if (item.destination.missingProtocol) issues.push({ level: 'error', path: iloc, message: `Button destination missing protocol: "${item.destination.value}"` });
        }

        // Knowledge check
        if (item.blockType === 'knowledgeCheck') {
          if (!item.hasCorrectAnswer)
            issues.push({ level: 'error', path: iloc, message: 'Knowledge check: no correct answer marked' });
          if (item.missingGeneralFeedback)
            issues.push({ level: 'error', path: iloc, message: 'Knowledge check: missing correct or incorrect feedback' });
          if (item.answersWithMissingChoiceFeedback?.length)
            issues.push({ level: 'warn', path: iloc, message: `Knowledge check: ${item.answersWithMissingChoiceFeedback.length} answer(s) missing per-choice feedback` });
        }

        // Flashcard
        if (item.blockType === 'flashcard') {
          if (item.front?.image?.noAltField) issues.push({ level: 'warn', path: iloc, message: 'Flashcard front image has no alt field in Rise data model — review manually' });
          if (item.back?.image?.noAltField)  issues.push({ level: 'warn', path: iloc, message: 'Flashcard back image has no alt field in Rise data model — review manually' });
        }

        // Scenario
        if (item.blockType === 'scenario') {
          for (const slide of item.slides ?? []) {
            if (slide.altEmpty)
              issues.push({ level: 'warn', path: `${iloc} › slide`, message: 'Scenario character image missing alt text' });
            for (const r of slide.responses ?? []) {
              if (r.altEmpty)
                issues.push({ level: 'warn', path: `${iloc} › response`, message: 'Scenario response image missing alt text' });
            }
          }
        }

        // Nested items (accordion panels, tab panels, button-stack entries, process steps, etc.)
        for (const child of item.items ?? []) {
          const childLabel = child.title ? `"${stripHtml(toStr(child.title)).slice(0, 40)}"` : 'nested';
          const cloc = `${iloc} › ${childLabel}`;

          if (child.image?.altEmpty)
            issues.push({ level: 'error', path: cloc, message: 'Nested item image missing alt text' });
          if (child.imageSlotEmpty)
            issues.push({ level: 'warn', path: cloc, message: 'Nested item image slot is empty — verify whether an image was intentionally omitted' });

          if (child.destination?.empty)                issues.push({ level: 'error', path: cloc, message: 'Nested button has no destination URL' });
          if (child.destination?.missingProtocol)      issues.push({ level: 'error', path: cloc, message: `Nested button destination missing protocol: "${child.destination.value}"` });

          for (const link of child.links ?? []) {
            if (link.empty)                issues.push({ level: 'error', path: cloc, message: 'Nested link with empty href' });
            else if (link.missingProtocol) issues.push({ level: 'error', path: cloc, message: `Nested link missing protocol: "${link.href}"` });
          }

          for (const uf of child.unknownFields ?? []) {
            issues.push({ level: 'unknown', path: cloc, message: `Unknown field: "${uf.key}" (${uf.valueType})` });
          }
        }

        // Unknown fields on this item
        for (const uf of item.unknownFields ?? []) {
          issues.push({ level: 'unknown', path: iloc, message: `Unknown field: "${uf.key}" (${uf.valueType})` });
        }
      }

      // Unknown block identity
      if (block.unknown) {
        issues.push({ level: 'unknown', path: bloc, message: `Unknown block type: "${block.identity}" — not in known block list, content may not be fully extracted` });
      }
    }
  }
  return issues;
}
