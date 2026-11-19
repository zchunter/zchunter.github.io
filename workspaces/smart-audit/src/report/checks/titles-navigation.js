/**
 * Check 6: page titles and navigation (WCAG SC 2.4.2 Level A, 2.4.5 Level AA).
 *
 * The Rise player builds each page title from the lesson title and the course
 * title (observed in a rendered course), so the author's part is whether
 * lesson titles exist and differ. SC 2.4.5 asks for more than one way to find
 * pages; Rise offers a menu and search, and an author can turn both off.
 *
 * Every result is REVIEW: the export cannot show how a title is judged
 * "descriptive", or whether Continue buttons count as a way.
 */

import { walkLessons, courseLocation } from '../walk.js';

export const titlesNavigation = {
  id: 'titles-navigation',
  title: 'Page titles and navigation',
  sc: ['2.4.2', '2.4.5'],
  inspects: [],

  run({ courseData, course }) {
    const results = [];
    const seen = new Map(); // normalized title -> [{ lessonIndex, location }]

    for (const { lesson, lessonIndex, location } of walkLessons(courseData)) {
      const title = typeof lesson?.title === 'string' ? lesson.title.trim() : '';
      if (title === '') {
        results.push({
          severity: 'REVIEW',
          sc: ['2.4.2'],
          location,
          message: 'This lesson has no title, so its page title is only the course name.',
          remediation: 'Give the lesson a title that says what it covers.',
        });
        continue;
      }
      if (lesson.type === 'section') continue; // dividers are not pages
      const key = title.toLowerCase().replace(/\s+/g, ' ');
      const list = seen.get(key) ?? [];
      list.push({ lessonIndex, title, location });
      seen.set(key, list);
    }

    for (const list of seen.values()) {
      if (list.length < 2) continue;
      const positions = list.map((l) => l.lessonIndex + 1).join(', ');
      results.push({
        severity: 'REVIEW',
        basis: 'best-practice',
        sc: ['2.4.2'],
        location: list[0].location,
        message: `The lesson title "${list[0].title}" is used ${list.length} times (outline items ${positions}), so learners cannot tell those pages apart by title.`,
        remediation: 'Make each lesson title specific, for example by adding the topic it covers.',
      });
    }

    const navigationOff = course?.theme?.navigation === false;
    const searchOff = course?.allowSearch === false || course?.theme?.allowSearch === false;
    if (navigationOff && searchOff) {
      results.push({
        severity: 'REVIEW',
        sc: ['2.4.5'],
        location: courseLocation(),
        message: 'Both the navigation menu and search are turned off, so learners can reach pages only with the Continue buttons. WCAG asks for more than one way to find pages.',
        remediation: 'Turn on the navigation menu or search in the course settings.',
      });
    }
    return results;
  },
};
