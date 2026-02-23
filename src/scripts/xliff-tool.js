// Shared XLIFF processing utilities for Rise Global Text Update.

export function fixUnicodeChars(text) {
  return text
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u2014\u2013]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u2022/g, "*");
}

export function escapeSpecialChars(text) {
  const placeholders = {
    "&lt;": "___LT___",
    "&gt;": "___GT___",
    "&amp;": "___AMP___",
    "&quot;": "___QUOT___",
    "&apos;": "___APOS___",
  };

  for (const [entity, placeholder] of Object.entries(placeholders)) {
    text = text.replace(new RegExp(entity, "g"), placeholder);
  }

  text = text.replace(/&/g, "&amp;");
  text = text.replace(/</g, "&lt;");
  text = text.replace(/>/g, "&gt;");
  text = text.replace(/"/g, "&quot;");
  text = text.replace(/'/g, "&apos;");
  text = text.replace(/\[/g, "&#91;");
  text = text.replace(/\]/g, "&#93;");

  for (const [entity, placeholder] of Object.entries(placeholders)) {
    text = text.replace(new RegExp(placeholder, "g"), entity);
  }

  return text;
}

export function parseCSVLine(text) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

export function toCsvField(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export function processXliff(content, replacements) {
  const replacementCounts = {};

  replacements.forEach(([original]) => {
    replacementCounts[original] = 0;
  });

  if (!replacements.length) {
    return { content, replacementCounts };
  }

  let processed = fixUnicodeChars(content);
  const sourcePattern = /(<source[^>]*>)(.*?)(<\/source>)/gs;

  processed = processed.replace(
    sourcePattern,
    (match, sourceTag, sourceContent, closingTag) => {
      let processedContent = sourceContent;
      const tagPlaceholders = [];

      processedContent = processedContent.replace(/<[^>]+>/g, (tag) => {
        const placeholder = `__TAG_${tagPlaceholders.length}__`;
        tagPlaceholders.push(tag);
        return placeholder;
      });

      replacements.forEach(([original, replacement]) => {
        const escapedOriginal = original.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(escapedOriginal, "g");
        const matches = processedContent.match(regex);
        const count = matches ? matches.length : 0;

        if (count > 0) {
          replacementCounts[original] += count;
          processedContent = processedContent.replace(regex, replacement);
        }
      });

      processedContent = processedContent.replace(
        /(__TAG_\d+__)|([^_]+)/g,
        (part, placeholder, textPart) => {
          if (placeholder) return placeholder;
          if (textPart) return escapeSpecialChars(textPart);
          return part;
        }
      );

      processedContent = processedContent.replace(/__TAG_(\d+)__/g, (part, index) => {
        return tagPlaceholders[parseInt(index, 10)];
      });

      const targetTag = sourceTag.replace("source", "target");
      return targetTag + processedContent + closingTag.replace("source", "target");
    }
  );

  return { content: processed, replacementCounts };
}
