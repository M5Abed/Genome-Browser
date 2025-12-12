/**
 * GFF3 Parser - Robust parser for General Feature Format version 3 files
 * 
 * Parses GFF3 files and builds a hierarchical structure of genomic features
 * with proper parent-child relationships based on ID and Parent attributes.
 */

/**
 * Parse a single attribute string (column 9) into a structured object
 * Format: "key1=value1;key2=value2;..."
 * 
 * @param {string} attributeString - The raw attribute string from column 9
 * @returns {Object} Parsed attributes as key-value pairs
 */
function parseAttributes(attributeString) {
    if (!attributeString || attributeString === '.') {
        return {};
    }

    const attributes = {};
    const pairs = attributeString.split(';');

    for (const pair of pairs) {
        const trimmedPair = pair.trim();
        if (!trimmedPair) continue;

        const equalIndex = trimmedPair.indexOf('=');
        if (equalIndex === -1) continue;

        const key = trimmedPair.substring(0, equalIndex).trim();
        const value = trimmedPair.substring(equalIndex + 1).trim();

        // Handle URL-encoded values
        attributes[key] = decodeURIComponent(value);
    }

    return attributes;
}

/**
 * Parse a single GFF3 line into a feature object
 * 
 * @param {string} line - A single line from the GFF3 file
 * @param {number} lineNumber - Line number for error reporting
 * @returns {Object|null} Parsed feature object or null if invalid
 */
function parseGFF3Line(line, lineNumber) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) {
        return null;
    }

    const columns = trimmed.split('\t');

    // GFF3 requires exactly 9 tab-separated columns
    if (columns.length !== 9) {
        throw new Error(
            `Line ${lineNumber}: Invalid GFF3 format. Expected 9 columns, got ${columns.length}`
        );
    }

    const [seqid, source, type, start, end, score, strand, phase, attributeString] = columns;

    // Parse numeric values
    const startPos = parseInt(start, 10);
    const endPos = parseInt(end, 10);

    // Validate coordinates
    if (isNaN(startPos) || isNaN(endPos)) {
        throw new Error(
            `Line ${lineNumber}: Invalid coordinates. Start and end must be integers.`
        );
    }

    if (startPos > endPos) {
        throw new Error(
            `Line ${lineNumber}: Invalid coordinates. Start (${startPos}) cannot be greater than end (${endPos}).`
        );
    }

    // Validate strand
    if (strand !== '+' && strand !== '-' && strand !== '.' && strand !== '?') {
        throw new Error(
            `Line ${lineNumber}: Invalid strand value '${strand}'. Must be +, -, ., or ?`
        );
    }

    const attributes = parseAttributes(attributeString);

    return {
        seqid,
        source,
        type,
        start: startPos,
        end: endPos,
        score: score === '.' ? null : parseFloat(score),
        strand,
        phase: phase === '.' ? null : parseInt(phase, 10),
        attributes,
        children: [], // Will be populated during hierarchy building
        parent: null, // Will be set during hierarchy building
        lineNumber
    };
}

/**
 * Build parent-child relationships between features
 * Links features based on ID and Parent attributes
 * 
 * @param {Array} features - Array of parsed feature objects
 * @returns {Object} Object containing features by ID and root features
 */
function buildHierarchy(features) {
    const featureById = new Map();
    const rootFeatures = [];

    // First pass: Index all features by their ID
    for (const feature of features) {
        if (feature.attributes.ID) {
            featureById.set(feature.attributes.ID, feature);
        }
    }

    // Second pass: Build parent-child relationships
    for (const feature of features) {
        const parentId = feature.attributes.Parent;

        if (parentId) {
            // This feature has a parent
            const parent = featureById.get(parentId);

            if (parent) {
                // Link child to parent
                feature.parent = parent;
                parent.children.push(feature);
            } else {
                // Parent not found - treat as root but log warning
                console.warn(
                    `Line ${feature.lineNumber}: Parent '${parentId}' not found for feature '${feature.attributes.ID || 'unnamed'}'`
                );
                rootFeatures.push(feature);
            }
        } else {
            // No parent - this is a root feature
            rootFeatures.push(feature);
        }
    }

    return {
        featureById,
        rootFeatures,
        allFeatures: features
    };
}

/**
 * Main parser function - Parse a complete GFF3 file
 * 
 * @param {string} fileContent - The complete GFF3 file content as a string
 * @returns {Object} Parsed and structured genomic data
 * @throws {Error} If the file format is invalid
 */
export function parseGFF3(fileContent) {
    if (!fileContent || typeof fileContent !== 'string') {
        throw new Error('Invalid input: File content must be a non-empty string');
    }

    const lines = fileContent.split(/\r?\n/);
    const features = [];
    const errors = [];

    // Parse each line
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNumber = i + 1;

        try {
            const feature = parseGFF3Line(line, lineNumber);
            if (feature) {
                features.push(feature);
            }
        } catch (error) {
            errors.push({
                lineNumber,
                message: error.message,
                line: line.substring(0, 100) // Truncate long lines
            });
        }
    }

    // If there are too many errors, the file is likely malformed
    if (errors.length > 0 && errors.length / lines.length > 0.1) {
        throw new Error(
            `File appears to be malformed. ${errors.length} errors found:\n` +
            errors.slice(0, 5).map(e => `  Line ${e.lineNumber}: ${e.message}`).join('\n') +
            (errors.length > 5 ? `\n  ... and ${errors.length - 5} more errors` : '')
        );
    }

    // Build hierarchy
    const hierarchy = buildHierarchy(features);

    // Calculate genomic extent
    let minStart = Infinity;
    let maxEnd = -Infinity;
    const sequences = new Set();
    const featureTypes = new Set();

    for (const feature of features) {
        minStart = Math.min(minStart, feature.start);
        maxEnd = Math.max(maxEnd, feature.end);
        sequences.add(feature.seqid);
        featureTypes.add(feature.type);
    }

    return {
        features: hierarchy.allFeatures,
        rootFeatures: hierarchy.rootFeatures,
        featureById: hierarchy.featureById,
        extent: {
            start: minStart === Infinity ? 0 : minStart,
            end: maxEnd === -Infinity ? 0 : maxEnd
        },
        sequences: Array.from(sequences),
        featureTypes: Array.from(featureTypes),
        stats: {
            totalFeatures: features.length,
            rootFeatures: hierarchy.rootFeatures.length,
            errors: errors.length
        },
        errors
    };
}

/**
 * Helper function to get all descendants of a feature
 * 
 * @param {Object} feature - The parent feature
 * @returns {Array} Array of all descendant features
 */
export function getDescendants(feature) {
    const descendants = [];

    function traverse(node) {
        for (const child of node.children) {
            descendants.push(child);
            traverse(child);
        }
    }

    traverse(feature);
    return descendants;
}

/**
 * Helper function to filter features by type
 * 
 * @param {Array} features - Array of features
 * @param {string|Array} types - Feature type(s) to filter by
 * @returns {Array} Filtered features
 */
export function filterByType(features, types) {
    const typeSet = new Set(Array.isArray(types) ? types : [types]);
    return features.filter(f => typeSet.has(f.type));
}
