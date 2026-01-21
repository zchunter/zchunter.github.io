# SmartAudit Checks Reference

This document provides detailed information about all the checks performed by the SmartAudit tool.

## Implementation Status

✅ **Implemented and Tested** - Fully functional with Jest test coverage  
🔄 **In Progress** - Partially implemented or being refined  
⏳ **Planned** - Not yet implemented, planned for future development

## Implementation Status Overview

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

## Recently Completed Checks

The following checks have been recently implemented with comprehensive testing and industry best practices:

- **Sentence Length** ✅ - Flags sentences exceeding 25 words for improved readability
- **Passive Voice** ✅ - Identifies excessive passive voice usage (>15% threshold) with active voice suggestions  
- **Reading Level** ✅ - Multi-formula readability analysis with audience-specific thresholds and reliability indicators

## Course-Wide Checks

### Course Structure

| Check | Description | Result |
|-------|-------------|--------|
| Content Distribution | Analyzes whether content is evenly distributed across lessons | Consider Revising |
| Lesson Count | Checks if the course has an appropriate number of lessons | Information |

### Navigation

| Check | Description | Result |
|-------|-------------|--------|
| Global Navigation | Identifies global navigation links outside of lessons | Information |
| Navigation Consistency | Checks if navigation patterns are consistent throughout the course | Consider Revising |
| Menu Structure | Analyzes the course menu structure for clarity and organization | Consider Revising |

### Metadata

| Check | Description | Result |
|-------|-------------|--------|
| Course Title | Checks if the course title is appropriate length and descriptive | Consider Revising |
| Course Description | Verifies that the course has a complete description | Consider Revising |
| Keywords | Checks if appropriate keywords are defined | Information |

## Lesson-Specific Checks

### Language

| Check | Description | Result |
|-------|-------------|--------|
| Inclusive Language | Identifies potentially non-inclusive terms using Alex.js | Consider Revising |
| Sentence Length | Flags sentences exceeding 25 words | Information | ✅
| Passive Voice | Identifies excessive use of passive voice (>15% threshold) with active voice suggestions | Consider Revising | ✅
| Reading Level | Analyzes text against selected course level with audience-specific thresholds using multiple readability formulas | Information | ✅
| Jargon | Identifies industry-specific terms that may need explanation | Consider Revising |

### Links

| Check | Description | Result |
|-------|-------------|--------|
| Broken Links | Identifies links that return error codes | Action Needed |
| External Links | Flags links to external websites | Information |
| Link Text | Checks if link text is descriptive (avoids "click here") | Consider Revising |
| Link Targets | Verifies that external links open in new windows | Consider Revising |

### Images

| Check | Description | Result |
|-------|-------------|--------|
| Missing Alt Text | Identifies images without alternative text | Action Needed |
| Generic Alt Text | Flags images with non-descriptive alt text (e.g., "image") | Consider Revising |
| Image Size | Checks if images are appropriately sized for web delivery | Consider Revising |
| Decorative Images | Identifies images that should be marked as decorative | Information |

### Video

| Check | Description | Result |
|-------|-------------|--------|
| Missing Transcript | Identifies videos without transcripts | Action Needed |
| Missing Captions | Checks if videos have closed captions | Action Needed |
| Video Duration | Flags videos exceeding recommended length (>6 minutes) | Consider Revising |
| Video Quality | Analyzes video resolution and playback quality | Information |

### Headings

| Check | Description | Result |
|-------|-------------|--------|
| Empty Headings | Identifies headings with no content | Action Needed |
| Heading Structure | Checks if heading levels are used in correct order (H1 → H2 → H3) | Consider Revising |
| Heading Length | Flags excessively long headings | Consider Revising |
| Duplicate Headings | Identifies duplicate heading text within a lesson | Consider Revising |

### Assessment

| Check | Description | Result |
|-------|-------------|--------|
| Missing Feedback | Identifies questions without feedback for incorrect answers | Consider Revising |
| Question Clarity | Analyzes question text for clarity | Consider Revising |
| Answer Options | Checks if multiple-choice questions have appropriate number of options | Information |
| Correct Answers | Verifies that all questions have defined correct answers | Action Needed |
| Assessment Distribution | Analyzes if assessments are appropriately distributed in the course | Information |

## Accessibility Checks

| Check | Description | Result |
|-------|-------------|--------|
| Color Contrast | Analyzes text/background contrast ratios | Action Needed |
| Keyboard Navigation | Checks if all interactive elements are keyboard accessible | Action Needed |
| ARIA Labels | Verifies proper use of ARIA attributes | Consider Revising |
| Focus Indicators | Checks if focus states are visible for interactive elements | Consider Revising |
| Screen Reader Compatibility | Analyzes content for screen reader compatibility | Action Needed |

## Technical Checks

| Check | Description | Result |
|-------|-------------|--------|
| Export Format | Identifies the export format (TinCan, SCORM, etc.) | Information |
| File Size | Analyzes total course size for potential delivery issues | Consider Revising |
| Browser Compatibility | Checks for features that may not work in all browsers | Consider Revising |
| Mobile Responsiveness | Analyzes content for mobile compatibility | Consider Revising |

## How Checks Are Performed

### Text Analysis
- **Inclusive Language**: Uses Alex.js to identify non-inclusive terms
- **Readability**: Multi-formula analysis (Flesch-Kincaid, Gunning Fog, ARI) with audience-specific thresholds
- **Sentence Length**: Counts words per sentence, flags sentences exceeding 25 words
- **Passive Voice**: Regex-based detection of 13+ passive voice patterns with active voice suggestions

### Link Validation
- **Broken Links**: Attempts to fetch URLs to verify status
- **Link Text**: Analyzes link text against common patterns

### Image Analysis
- **Alt Text**: Examines image tags for alt attributes
- **Image Size**: Analyzes image dimensions and file size

### Structure Analysis
- **Heading Structure**: Maps document outline to verify proper nesting
- **Navigation**: Analyzes menu structure and navigation patterns

### Assessment Analysis
- **Feedback**: Examines question objects for feedback properties
- **Correct Answers**: Verifies answer definitions in question objects

## User Interface Features

### Course Configuration
- **Course Level Selection**: Choose between Beginner, Intermediate, or Advanced levels
  - Affects estimated reading time calculation (WPM assumptions)
  - Beginner: 200 WPM, Intermediate: 230 WPM, Advanced: 250 WPM
- **Target Audience Selection**: Choose between General, Technical, or Executive audiences
  - Affects reading level check thresholds
  - General: 8th grade max, Technical: 10th grade max, Executive: 12th grade max

### Analysis Results Display
- **Expandable Issue Cards**: Click to see detailed information and suggestions
- **Context-Aware Filtering**: Smart filtering excludes technical identifiers and navigation text
- **Reliability Indicators**: Shows confidence level of analysis based on text sample size
- **Percentage-Based Validation**: Reports issues as percentages rather than individual flags
- **Top 3 Hardest Sentences**: Highlights most complex sentences for focused revision