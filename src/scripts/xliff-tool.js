// XLIFF processing functions

// Function to fix Unicode characters
export function fixUnicodeChars(text) {
    // Replace smart quotes with straight quotes
    text = text.replace(/[""]/g, '"');
    text = text.replace(/['']/g, "'");
    
    // Replace em-dash and en-dash with regular hyphen
    text = text.replace(/[—–]/g, '-');
    
    // Replace other common unicode substitutions
    text = text.replace(/…/g, '...');
    text = text.replace(/•/g, '*');
    
    return text;
}

// Function to escape special characters in XML
export function escapeSpecialChars(text) {
    // First, temporarily replace existing XML entities to protect them
    const placeholders = {
        '&lt;': '___LT___',
        '&gt;': '___GT___',
        '&amp;': '___AMP___',
        '&quot;': '___QUOT___',
        '&apos;': '___APOS___',
    };
    
    // Replace entities with placeholders
    for (const [entity, placeholder] of Object.entries(placeholders)) {
        text = text.replace(new RegExp(entity, 'g'), placeholder);
    }
    
    // Now escape the special characters
    text = text.replace(/&/g, '&amp;');  // Must be first
    text = text.replace(/</g, '&lt;');
    text = text.replace(/>/g, '&gt;');
    text = text.replace(/"/g, '&quot;');
    text = text.replace(/'/g, '&apos;');
    
    // Handle square brackets
    text = text.replace(/\[/g, '&#91;');
    text = text.replace(/\]/g, '&#93;');
    
    // Restore the original XML entities
    for (const [entity, placeholder] of Object.entries(placeholders)) {
        text = text.replace(new RegExp(placeholder, 'g'), entity);
    }
    
    return text;
}

// Function to process XLIFF content
export function processXliff(content, replacements) {
    // Fix unicode characters in the entire content first
    content = fixUnicodeChars(content);
    
    // Track replacement counts
    const replacementCounts = {};
    replacements.forEach(([original]) => {
        replacementCounts[original] = 0;
    });
    
    // Process source elements
    const sourcePattern = /(<source[^>]*>)(.*?)(<\/source>)/gs;
    let sourceMatches = 0;
    
    content = content.replace(sourcePattern, (match, sourceTag, sourceContent, closingTag) => {
        sourceMatches++;
        // Apply replacements to the content and count them
        let processedContent = sourceContent;
        
        replacements.forEach(([original, replacement]) => {
            // Escape special regex characters in the original string
            const escapedOriginal = original.replace(/[.*+?^${}()|[\]\\]/g, '\\// XLIFF processing functions

// Function to fix Unicode characters
export function fixUnicodeChars(text) {
    // Replace smart quotes with straight quotes
    text = text.replace(/[""]/g, '"');
    text = text.replace(/['']/g, "'");
    
    // Replace em-dash and en-dash with regular hyphen
    text = text.replace(/[—–]/g, '-');
    
    // Replace other common unicode substitutions
    text = text.replace(/…/g, '...');
    text = text.replace(/•/g, '*');
    
    return text;
}

// Function to escape special characters in XML
export function escapeSpecialChars(text) {
    // First, temporarily replace existing XML entities to protect them
    const placeholders = {
        '&lt;': '___LT___',
        '&gt;': '___GT___',
        '&amp;': '___AMP___',
        '&quot;': '___QUOT___',
        '&apos;': '___APOS___',
    };
    
    // Replace entities with placeholders
    for (const [entity, placeholder] of Object.entries(placeholders)) {
        text = text.replace(new RegExp(entity, 'g'), placeholder);
    }
    
    // Now escape the special characters
    text = text.replace(/&/g, '&amp;');  // Must be first
    text = text.replace(/</g, '&lt;');
    text = text.replace(/>/g, '&gt;');
    text = text.replace(/"/g, '&quot;');
    text = text.replace(/'/g, '&apos;');
    
    // Handle square brackets
    text = text.replace(/\[/g, '&#91;');
    text = text.replace(/\]/g, '&#93;');
    
    // Restore the original XML entities
    for (const [entity, placeholder] of Object.entries(placeholders)) {
        text = text.replace(new RegExp(placeholder, 'g'), entity);
    }
    
    return text;
}

// Function to process XLIFF content
export function processXliff(content, replacements) {
    // Fix unicode characters in the entire content first
    content = fixUnicodeChars(content);
    
    // Track replacement counts
    const replacementCounts = {};
    replacements.forEach(([original]) => {
        replacementCounts[original] = 0;
    });
    
    // Process source elements
    const sourcePattern = /(<source[^>]*>)(.*?)(<\/source>)/gs;
    let sourceMatches = 0;
    
    content = content.replace(sourcePattern, (match, sourceTag, sourceContent, closingTag) => {
        sourceMatches++;
        // Apply replacements to the content and count them
        let processedContent = sourceContent;
        
        replacements.forEach(([original, replacement]) => {
            // Escape special regex characters in the original string
            const escapedOriginal = original.replace(/[.*+?^${}()|[\]\\]/g, '\\// Function to process XLIFF content
export function processXliff(content, replacements) {
    // Fix unicode characters in the entire content first
    content = fixUnicodeChars(content);
    
    // Track replacement counts
    const replacementCounts = {};
    replacements.forEach(([original]) => {
        replacementCounts[original] = 0;
    });
    
    // Process source elements
    const sourcePattern = /(<source[^>]*>)(.*?)(<\/source>)/gs;
    
    content = content.replace(sourcePattern, (match, sourceTag, sourceContent, closingTag) => {
        // Apply replacements to the content and count them
        let processedContent = sourceContent;
        
        replacements.forEach(([original, replacement]) => {
            // Escape special regex characters in the original string
            const escapedOriginal = original.replace(/[.*+?^${}()|[\]\\]/g, '\\        replacements.forEach(([original, replacement]) => {
            // Count occurrences before replacement
            const count = (processedContent.match(new RegExp(original, 'g')) || []).length;
            replacementCounts[original] += count;
            
            // Perform the replacement
            processedContent = processedContent.replace(new RegExp(original, 'g'), replacement);
        });');
            
            // Count occurrences before replacement
            const regex = new RegExp(escapedOriginal, 'g');
            const count = (processedContent.match(regex) || []).length;
            replacementCounts[original] += count;
            
            // Perform the replacement
            processedContent = processedContent.replace(regex, replacement);
        });
        
        // Escape special characters in the processed content
        processedContent = escapeSpecialChars(processedContent);
        
        // Replace source with target
        const targetTag = sourceTag.replace('source', 'target');
        
        return targetTag + processedContent + closingTag.replace('source', 'target');
    });
    
    return { content, replacementCounts };');
            
            // Count occurrences in this specific source element
            const regex = new RegExp(escapedOriginal, 'g');
            const matches = processedContent.match(regex);
            const count = matches ? matches.length : 0;
            
            if (count > 0) {
                replacementCounts[original] += count;
                // Perform the replacement
                processedContent = processedContent.replace(regex, replacement);
            }
        });
        
        // Escape special characters in the processed content
        processedContent = escapeSpecialChars(processedContent);
        
        // Replace source with target
        const targetTag = sourceTag.replace('source', 'target');
        
        return targetTag + processedContent + closingTag.replace('source', 'target');
    });
    
    return { content, replacementCounts };
}');
            
            // Count occurrences in this specific source element
            const regex = new RegExp(escapedOriginal, 'g');
            const matches = processedContent.match(regex);
            const count = matches ? matches.length : 0;
            
            if (count > 0) {
                replacementCounts[original] += count;
                // Perform the replacement
                processedContent = processedContent.replace(regex, replacement);
            }
        });
        
        // Escape special characters in the processed content
        processedContent = escapeSpecialChars(processedContent);
        
        // Replace source with target
        const targetTag = sourceTag.replace('source', 'target');
        
        return targetTag + processedContent + closingTag.replace('source', 'target');
    });
    
    return { content, replacementCounts };
}