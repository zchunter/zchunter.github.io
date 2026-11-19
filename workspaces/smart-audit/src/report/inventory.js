/**
 * Inventory of content the tool saw but does not examine in v1
 * (docs/SCOPE-V1.md, report section 4). Counting it is cheap and means the
 * "not checked" section names real content, not a generic disclaimer.
 */

import { walkItems, matchesIdentity } from './walk.js';

const STORYLINE_IDENTITY = '360/interactive/storyline';

function extensionOf(name) {
  const m = /\.([a-z0-9]{1,8})$/i.exec(String(name ?? ''));
  return m ? m[1].toLowerCase() : null;
}

/**
 * @param {Array} blocks entries from walkBlocks()
 * @returns {{ attachments: Array, embeds: Array, storyline: Array }}
 */
export function buildInventory(blocks) {
  const attachments = [];
  const embeds = [];
  const storyline = [];

  for (const entry of blocks) {
    if (matchesIdentity(STORYLINE_IDENTITY, entry.identity)) storyline.push({ location: entry.location });

    for (const { item, location } of walkItems(entry)) {
      const media = item?.media;
      if (media?.attachment) {
        const a = media.attachment;
        const filename = a.key ?? a.originalUrl ?? a.filename ?? null;
        attachments.push({ filename, extension: extensionOf(filename), mimeType: a.mimeType ?? null, location });
      }
      if (media?.embed) {
        embeds.push({ provider: media.embed.provider ?? null, location });
      }
    }
  }
  return { attachments, embeds, storyline };
}
