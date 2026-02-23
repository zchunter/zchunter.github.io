# Zach Hunter - Technical Tools

This repository contains tools for learning performance, instructional content operations, and accessibility quality.

## Available Tools

### [SmartAudit](smart-audit/docs/README.md)

A tool for analyzing Articulate Rise courses for accessibility, content structure, and quality issues.

- Scans Rise course content for accessibility issues
- Identifies potential inclusive language concerns
- Checks for missing alt text, captions, and transcripts
- Analyzes content structure and estimated completion time
- Detects passive voice usage and provides active voice suggestions
- Flags sentences exceeding recommended length for readability
- Analyzes reading level with industry-standard formulas and reliability indicators
- Provides audience-specific readability thresholds (General, Technical, Executive)

**Status**: Active development continues, but SmartAudit is currently separated from live site workflows (routing, default tests, and release validation) until the next implementation pass.

### [Rise Global Text Update](src/pages/tools/xliff-swapper.astro)

A deterministic rename and text-governance workflow for Articulate Rise exports. It was designed for high-volume rename cycles and also supports routine one-off text updates that are tedious and error-prone in manual review.

- Finds and replaces exact strings in exported XLIFF files
- Supports CSV import to apply many known rename pairs in one pass
- Updates course text and image alt text that can be slow to review manually
- Handles both high-volume rename campaigns and small single-word updates
- Exports replacement counts and report output for QA verification
- Preserves XML integrity with proper escaping and source-to-target conversion
- Includes targeted regression tests for CSV parsing, XML transformation, and xAPI payload validation

## Third-Party Libraries and Tools

### SmartAudit Dependencies

The SmartAudit tool leverages several open-source libraries to provide comprehensive analysis:

- **[alex.js](https://github.com/get-alex/alex)** - MIT License
  - Provides inclusive language checking functionality
  - Identifies potentially insensitive or inconsiderate language
  - Suggests alternative terms and phrases
  - Used for both course-wide and lesson-specific content analysis

- **Custom Passive Voice Detection** - Internal Implementation
  - Regex-based pattern matching for passive voice identification
  - Detects 13+ common passive voice constructions
  - Provides active voice suggestions with "by" clause restructuring
  - Analyzes text blocks, accordion content, and assessment questions
  - Client-side processing for privacy and performance

- **Custom Reading Level Analysis** - Internal Implementation
  - Multiple readability formulas: Flesch-Kincaid Grade Level/Ease, Gunning Fog, Automated Readability Index
  - Smart content filtering to exclude technical identifiers and navigation text
  - Audience-specific thresholds: General (8th grade), Technical (10th grade), Executive (12th grade)
  - Reliability indicators based on text sample size (100+ words, 30+ sentences)
  - Enhanced sentence boundary detection with abbreviation handling
  - Percentage-based validation with top 3 hardest sentences highlighted

### Other Dependencies

- **Astro** - MIT License - Static site generator and build tool
- **Vite** - MIT License - Frontend build tool and development server

## Documentation

For detailed documentation on specific tools:

- [SmartAudit Documentation](smart-audit/docs/README.md)
- [SmartAudit Checks Reference](docs/CHECKS.md)

## Privacy

All tools in this repository:

- Process files entirely in your browser
- Do not send your file content to external servers
- Work offline once loaded
- Collect minimal anonymous usage metrics via xAPI
  - Rise Global Text Update: Tracks number of replacements checked and applied
  - SmartAudit: Will track similar anonymous usage statistics

## Implementation Status

### ✅ Fully Implemented & Tested (11 checks)
- **Course-Wide**: Inclusive Language, Course Length, Global Links, Export Settings
- **Lesson-Specific**: Links, Alt Text, Heading Structure, Transcripts, Assessments, Sentence Length, Passive Voice, Reading Level

### 🔄 Partially Implemented (3 checks)
- Inclusive Language (lesson-specific), Link-to-Text Ratio, Header Length

### ⏳ Planned for Future Implementation
- Content Distribution, Lesson Count, Navigation Consistency, Menu Structure
- Course Title/Description/Keywords, Jargon Detection, Assessment Distribution
- Color Contrast, Keyboard Navigation, ARIA Labels, Focus Indicators
- Screen Reader Compatibility, Browser Compatibility, Mobile Responsiveness

## Testing & Quality Assurance

### Current Test Coverage
- **99 tests passing** with comprehensive coverage of all implemented checks
- **Functional Tests**: Individual check logic, data processing, and error handling
- **UX Regression Tests**: Prevents undefined values and layout issues
- **Layout Regression Tests**: Snapshot testing for HTML structure consistency
- **Component Tests**: Issue card rendering and lesson issues display
- **Live site default test flow**: intentionally scoped to `xliff-tool` and `send-xapi` while SmartAudit is paused from production workflows

### Regression Prevention Strategy
- **Jest-based UX testing**: Catches common UI regressions without complex test suites
- **Snapshot testing**: Prevents unexpected HTML structure changes
- **Error boundary testing**: Graceful handling of edge cases
- **Data structure validation**: Ensures consistent issue reporting

### Rise Global Text Update Regression Tests
- Run targeted regression tests for the XLIFF tool and xAPI function with:
  - `npm run test:xliff-regression`
- Coverage includes:
  - CSV parsing (quoted commas and escaped quotes)
  - XML transformation behavior (including no-op when replacement list is empty)
  - Netlify xAPI endpoint method and payload validation paths

### Future Testing Improvements
- Automate tests using Continuous Integration (e.g., GitHub Actions)
- Add pre-commit hooks to run tests before code commits
- Expand test suite to cover more edge cases and features
- Consider automating code linting and formatting as part of CI/CD pipeline
