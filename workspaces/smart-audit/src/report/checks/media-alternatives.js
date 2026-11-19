/**
 * Check 4: media captions and alternatives (WCAG SC 1.2.1, 1.2.2, 1.2.3, 1.2.5).
 *
 *   FAIL    a self-hosted video with no captions file attached (1.2.2). The
 *           finding states its limits: silent video and burned-in captions
 *           are not failures, and the export cannot show either.
 *   REVIEW  an embedded video (YouTube, Vimeo...). Its captions live on
 *           another site and cannot be known from the export.
 *   REVIEW  per lesson, a standing note that audio description (1.2.3, 1.2.5)
 *           cannot be verified for any video.
 *
 * Audio blocks are not handled here: no export examined so far contains one,
 * so their identity and fields are unverified and are never guessed. An audio
 * block therefore appears in the report under "block types no check read".
 */

import { walkItems } from '../walk.js';

const VIDEO = 'multimedia/multimedia/video';
const EMBED = 'multimedia/multimedia/embed';

const hasCaptions = (video) => Array.isArray(video?.captions) && video.captions.length > 0;

export const mediaAlternatives = {
  id: 'media-alternatives',
  title: 'Video captions and alternatives',
  sc: ['1.2.2'],
  inspects: [VIDEO, EMBED],

  run({ blocks }) {
    const results = [];
    const perLesson = new Map(); // lessonIndex -> { count, location }

    const noteVideo = (location) => {
      const slot = perLesson.get(location.lessonIndex) ?? {
        count: 0,
        location: { scope: 'lesson', lessonIndex: location.lessonIndex, lessonId: location.lessonId, lessonTitle: location.lessonTitle, lessonType: location.lessonType },
      };
      slot.count += 1;
      perLesson.set(location.lessonIndex, slot);
    };

    for (const entry of blocks) {
      if (entry.identity !== VIDEO && entry.identity !== EMBED) continue;

      for (const { item, location, itemPath } of walkItems(entry)) {
        const video = item?.media?.video;
        const embed = item?.media?.embed;

        if (entry.identity === VIDEO && video) {
          noteVideo(location);
          if (!hasCaptions(video)) {
            results.push({
              severity: 'FAIL',
              sc: ['1.2.2'],
              location: { ...location, itemPath: `${itemPath}.media.video` },
              message:
                'This video has no captions file attached. That fails WCAG 1.2.2 unless the video has no spoken or meaningful sound, or its captions are burned into the picture; the export cannot show either.',
              remediation: 'Add a captions file to the video, or confirm that it has no meaningful audio or has open captions.',
            });
          }
        }

        if (entry.identity === EMBED && embed?.embedType === 'video') {
          noteVideo(location);
          const where = embed.provider ? `${embed.provider} ` : '';
          results.push({
            severity: 'REVIEW',
            sc: ['1.2.2'],
            location: { ...location, itemPath: `${itemPath}.media.embed` },
            message: `This ${where}video is hosted on another site, so the export cannot show whether it has captions.`,
            remediation: 'Play the video with captions switched on and confirm they are present and accurate.',
          });
        }
      }
    }

    for (const { count, location } of perLesson.values()) {
      results.push({
        severity: 'REVIEW',
        sc: ['1.2.3', '1.2.5'],
        location,
        message: `${count} video${count === 1 ? '' : 's'} in this lesson: whether an audio description or a text alternative exists cannot be verified from the export.`,
        remediation: 'If important visual information is not in the audio or the nearby text, add an audio description or a text alternative.',
      });
    }
    return results;
  },
};
