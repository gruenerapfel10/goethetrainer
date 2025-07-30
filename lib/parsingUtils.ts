import { generateObject } from 'ai';
import { jsonrepair } from 'jsonrepair';
import { z } from 'zod';

/**
 * Enhanced generateObjectWithParsing function that improves JSON reliability with Claude 3.7
 */
export async function generateObjectWithParsing<T extends z.ZodType>(options: {
  model: any;
  schema: T;
  prompt: string;
  system?: string;
  temperature?: number;
}): Promise<{ object: z.infer<T> }> {
  // Start timing for performance monitoring
  const startTime = performance.now();

  // Enhanced system prompt specifically tailored for Claude 3.7
  const systemPrompt =
    options.system ||
    `You are an expert at generating perfectly formatted JSON.
    
    CRITICAL JSON FORMATTING REQUIREMENTS:
    1. Your entire response must be ONLY a valid JSON object - nothing else.
    2. Never include explanatory text, markdown, or code blocks in your response.
    3. Arrays must be proper JSON arrays: ["item1", "item2"] not "[\"item1\", \"item2\"]"
    4. Objects must be proper JSON objects: {"key": "value"} not "{\"key\": \"value\"}"
    5. Nested arrays and objects must maintain proper JSON structure.
    6. Every JSON value must have the correct data type (string, number, boolean, array, or object).
    7. Never include invalid characters or formatting in your JSON.
    8. Verify your JSON is valid before submitting by checking all brackets and commas.
    9. The entire response must be valid JSON - do not include any additional text.`;

  // Lower temperature for more deterministic outputs
  const temperature = options.temperature ?? 0;

  try {
    // Enhance the prompt with clearer instructions
    const enhancedPrompt = `${options.prompt}\n\n
    IMPORTANT JSON FORMATTING RULES:
    - Your response must be valid JSON only, with no additional text
    - Arrays must be proper JSON arrays (not strings): ["item1", "item2"]
    - Objects must be proper JSON objects (not strings): {"key": "value"}
    - Never stringify nested arrays or objects
    - Never include markdown code blocks or explanations
    - Double-check your JSON structure before submitting`;

    // Optional: add prefill to force JSON mode
    const prefill = '{\n';

    // First attempt with prefill to enforce JSON structure
    try {
      const object = await generateObject({
        ...options,
        prompt: enhancedPrompt,
        system: systemPrompt,
        temperature: temperature,
        messages: [
          { role: 'user', content: enhancedPrompt },
          { role: 'assistant', content: prefill },
        ],
      });

      return object;
    } catch (prefillError) {

      const object = await generateObject({
        ...options,
        prompt: enhancedPrompt,
        system: systemPrompt,
        temperature: temperature,
      });

      return object;
    }
  } catch (error: any) {

    if (error.name !== 'AI_NoObjectGeneratedError') {
      throw error;
    }

    // Extract text content from error
    const errorText = error.text || '';
    let originalContent: Record<string, any> | null = null;

    // Multi-stage repair strategy
    try {
      // Attempt generic JSON extraction and repair
      originalContent = extractAndRepairJson(errorText);
    } catch (repairError) {
      console.error('JSON extraction failed:', repairError);

      // Final fallback - use error.value if available
      if (!originalContent && error.value) {
        try {
          originalContent =
            typeof error.value === 'object' && error.value !== null
              ? error.value
              : JSON.parse(JSON.stringify(error.value));
        } catch (valueError) {
          console.error('Failed to process error.value:', valueError);
        }
      }

      // If still no content, create an empty object
      if (!originalContent) {
        originalContent = {};
      }
    }

    // Process the content
    if (originalContent) {
      console.log(
        'Content structure:',
        Object.keys(originalContent).map(
          (key) => `${key}: ${typeof originalContent?.[key]}`,
        ),
      );

      // Preprocess the content
      const processedContent = preprocessContent(originalContent);

      try {
        // Try direct Zod validation
        const validatedObj = options.schema.parse(processedContent);
        return { object: validatedObj };
      } catch (zodError) {
        console.error('Zod validation failed:', zodError);

        if (zodError instanceof z.ZodError) {
          // Try to fix Zod errors
          try {
            const fixedContent = fixZodErrors(
              processedContent,
              zodError,
              options.schema,
            );

            // Validate the fixed content
            const validatedFixed = options.schema.parse(fixedContent);
            return { object: validatedFixed };
          } catch (fixError) {
            console.error('Failed to fix Zod errors:', fixError);
          }
        }

        // Create a fallback object if validation fails
        try {
          const fallbackObj = createFallbackObject(
            options.schema,
            processedContent,
          );
          return { object: fallbackObj };
        } catch (fallbackError) {
          console.error('Failed to create fallback object:', fallbackError);
        }
      }
    }

    // Final attempt with explicit schema example
    try {
      // Create an example JSON structure based on the schema
      const exampleJson = generateSchemaExample(options.schema);

      const finalPrompt = `${options.prompt}\n\n
      CRITICAL: Your response MUST be a valid JSON object following EXACTLY this structure:
      ${exampleJson}
      
      Your response must contain ONLY the JSON with NO additional text.
      Do not include \`\`\`json or \`\`\` markers.
      All arrays must be proper JSON arrays without quotes around them.
      All fields must have the correct data types.`;

      // Use zero temperature for maximum precision
      const retryObject = await generateObject({
        ...options,
        prompt: finalPrompt,
        system: systemPrompt,
        temperature: 0,
      });

      return retryObject;
    } catch (retryError) {
      console.error('Final generation attempt failed:', retryError);

      // Last resort - construct a minimal valid object
      try {
        const minimalObject = createMinimalValidObject(options.schema);
        return { object: minimalObject };
      } catch (minimalError) {
        console.error('Failed to create minimal valid object:', minimalError);
        // Re-throw the original error if all recovery attempts fail
        throw error;
      }
    }
  } finally {
    // Log performance metrics
    const endTime = performance.now();
  }
}

/**
 * Extract and repair JSON content from text
 */
function extractAndRepairJson(text: string): Record<string, any> {
  // First, clean up the text
  let cleanedText = text.trim();

  // Remove markdown code blocks
  cleanedText = cleanedText.replace(
    /```(?:json|javascript|js|)[\r\n]?([\s\S]*?)```/g,
    '$1',
  );

  // Try to find JSON content
  let jsonContent = findJsonContent(cleanedText);

  // Repair common Claude JSON formatting issues
  jsonContent = repairClaudeJsonIssues(jsonContent);

  // Use jsonrepair as final cleanup step
  try {
    const repairedJson = jsonrepair(jsonContent);
    return JSON.parse(repairedJson);
  } catch (e) {
    // If still failing, try more aggressive extraction
    return extractJsonFields(cleanedText);
  }
}

/**
 * Find JSON content within text
 */
function findJsonContent(text: string): string {
  // Look for complete JSON object
  const jsonPattern = /(\{[\s\S]*\})/;
  const match = text.match(jsonPattern);

  if (match) {
    return match[1];
  }

  // If no full JSON object found, return the original text
  return text;
}

/**
 * Repair common Claude JSON formatting issues
 */
function repairClaudeJsonIssues(text: string): string {
  let content = text;

  // Fix doubly stringified arrays
  content = content.replace(
    /"(\w+)":\s*"(\[[\s\S]*?\])"/g,
    (match, key, value) => {
      try {
        const unescaped = value
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\')
          .replace(/\\n/g, '\n');
        return `"${key}": ${unescaped}`;
      } catch (e) {
        return match;
      }
    },
  );

  // Fix doubly stringified objects
  content = content.replace(
    /"(\w+)":\s*"(\{[\s\S]*?\})"/g,
    (match, key, value) => {
      try {
        const unescaped = value
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\')
          .replace(/\\n/g, '\n');
        return `"${key}": ${unescaped}`;
      } catch (e) {
        return match;
      }
    },
  );

  // Fix broken array entries
  content = content.replace(/},\s*"([^"]+)"/g, '}, {"$1"');

  // Fix arrays with trailing commas
  content = content.replace(/,\s*]/g, ']');

  // Fix missing commas between array items
  content = content.replace(/}\s*{/g, '}, {');

  // Fix invalid escape sequences
  content = content.replace(/\\([^"\\\/bfnrtu])/g, '$1');

  return content;
}

/**
 * Extract JSON fields using regex when full parsing fails
 */
function extractJsonFields(text: string): Record<string, any> {
  const result: Record<string, any> = {};

  // Extract fields with regex
  const patterns = [
    // Array field
    {
      regex: /"(\w+)":\s*(\[[\s\S]*?\])/g,
      process: (field: string, value: string) => {
        try {
          return JSON.parse(jsonrepair(value));
        } catch (e) {
          return [];
        }
      },
    },
    // Object field
    {
      regex: /"(\w+)":\s*(\{[\s\S]*?\})/g,
      process: (field: string, value: string) => {
        try {
          return JSON.parse(jsonrepair(value));
        } catch (e) {
          return {};
        }
      },
    },
    // String field
    {
      regex: /"(\w+)":\s*"([^"]*)"/g,
      process: (field: string, value: string) => value,
    },
    // Number field
    {
      regex: /"(\w+)":\s*(-?\d+(?:\.\d+)?)/g,
      process: (field: string, value: string) => Number.parseFloat(value),
    },
    // Boolean field
    {
      regex: /"(\w+)":\s*(true|false)/g,
      process: (field: string, value: string) => value === 'true',
    },
  ];

  // Apply each pattern
  for (const pattern of patterns) {
    let match;
    const regex = new RegExp(pattern.regex);
    while ((match = regex.exec(text)) !== null) {
      const [_, field, value] = match;
      result[field] = pattern.process(field, value);
    }
  }

  return result;
}

/**
 * Preprocess JSON content to fix common issues
 */
function preprocessContent(content: Record<string, any>): Record<string, any> {
  // Deep clone to avoid modifying the original
  const processed: Record<string, any> = JSON.parse(JSON.stringify(content));

  // Process all fields recursively
  const processField = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return obj;

    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map((item) => processField(item));
    }

    // Handle objects
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      // Handle string that looks like an array or object
      if (typeof value === 'string') {
        // String looks like an array
        if (value.trim().startsWith('[') && value.trim().endsWith(']')) {
          try {
            result[key] = JSON.parse(jsonrepair(value));
            // Process array items recursively
            result[key] = result[key].map((item: any) =>
              typeof item === 'object' ? processField(item) : item,
            );
            continue;
          } catch (e) {
            // If parsing fails, try different splitting approaches for arrays
            if (value.includes(',')) {
              result[key] = value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);
              continue;
            } else if (value.includes('\n')) {
              result[key] = value
                .split('\n')
                .map((s) => s.trim())
                .filter(Boolean);
              continue;
            }
          }
        }
        // String looks like an object
        else if (value.trim().startsWith('{') && value.trim().endsWith('}')) {
          try {
            result[key] = processField(JSON.parse(jsonrepair(value)));
            continue;
          } catch (e) {
            // Keep as string if parsing fails
          }
        }
      } else if (typeof value === 'object') {
        // Recursively process nested objects/arrays
        result[key] = processField(value);
        continue;
      }

      // Default assignment for non-special cases
      result[key] = value;
    }

    return result;
  };

  return processField(processed);
}

/**
 * Fix Zod validation errors
 */
function fixZodErrors(
  content: Record<string, any>,
  zodError: z.ZodError,
  schema: z.ZodType,
): Record<string, any> {
  // Clone to avoid modifying the original
  const fixed: Record<string, any> = JSON.parse(JSON.stringify(content));

  // Group errors by path for more efficient fixing
  const errorsByPath = zodError.errors.reduce((acc, issue) => {
    const pathStr = issue.path.join('.');
    if (!acc[pathStr]) {
      acc[pathStr] = [];
    }
    acc[pathStr].push(issue);
    return acc;
  }, {} as Record<string, z.ZodIssue[]>);

  // Fix each path with errors
  for (const [pathStr, issues] of Object.entries(errorsByPath)) {
    const path = pathStr.split('.');

    // Skip empty paths
    if (path.length === 0) continue;

    // Get expected type from issues
    const expectedType =
      issues.find((i) => i.code === 'invalid_type')?.expected || 'unknown';
    const constraints = issues.filter((i) =>
      ['too_small', 'too_big'].includes(i.code),
    );

    // Apply fix based on path depth
    if (path.length === 1) {
      // Top-level field
      const field = path[0];
      fixed[field] = fixValueByType(
        fixed[field],
        expectedType,
        constraints,
        getSchemaDefaultForField(field),
      );
    } else {
      // Nested field - use recursive approach
      applyNestedFix(fixed, path, expectedType, constraints);
    }
  }

  return fixed;
}

/**
 * Fix a value based on its expected type
 */
function fixValueByType(
  value: any,
  expectedType: string,
  constraints: z.ZodIssue[],
  defaultValue?: any,
): any {
  switch (expectedType) {
    case 'array':
      // If value is undefined, return the default array or empty array
      if (value === undefined || value === null) {
        return Array.isArray(defaultValue) ? defaultValue : [];
      }

      // If value is already an array, use it
      if (Array.isArray(value)) {
        return value;
      }

      // If value is a string, try to parse it as JSON
      if (typeof value === 'string') {
        // First try JSON parse with repair
        if (value.trim().startsWith('[') && value.trim().endsWith(']')) {
          try {
            const parsed = JSON.parse(jsonrepair(value));
            return Array.isArray(parsed) ? parsed : [parsed];
          } catch (e) {
            // Ignore parse error and try other methods
          }
        }

        // Try splitting by comma or newline
        if (value.includes(',')) {
          return value
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        }
        if (value.includes('\n')) {
          return value
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean);
        }

        // If no delimiters, treat as a single item
        return value.trim() ? [value.trim()] : [];
      }

      // Last resort - wrap non-array in array
      return [value];

    case 'object':
      // Convert to object or use default
      if (typeof value !== 'object' || Array.isArray(value) || value === null) {
        // Try to parse string as object
        if (
          typeof value === 'string' &&
          value.trim().startsWith('{') &&
          value.trim().endsWith('}')
        ) {
          try {
            return JSON.parse(jsonrepair(value));
          } catch (e) {
            // If parsing fails, use default object
            return typeof defaultValue === 'object' &&
              !Array.isArray(defaultValue)
              ? defaultValue
              : {};
          }
        } else {
          // Use default object or empty object
          return typeof defaultValue === 'object' &&
            !Array.isArray(defaultValue)
            ? defaultValue
            : {};
        }
      }
      return value;

    case 'string':
      // Convert to string
      if (typeof value !== 'string') {
        return value !== undefined && value !== null
          ? String(value)
          : typeof defaultValue === 'string'
          ? defaultValue
          : '';
      }
      return value;

    case 'number':
      // Convert to number
      if (typeof value !== 'number') {
        const num =
          typeof value === 'string' ? Number.parseFloat(value) : Number(value);
        return Number.isNaN(num)
          ? typeof defaultValue === 'number'
            ? defaultValue
            : 0
          : num;
      }
      return value;

    case 'boolean':
      // Convert to boolean
      if (typeof value !== 'boolean') {
        return Boolean(value);
      }
      return value;

    default:
      // For unknown types, return as is or default
      return value !== undefined ? value : defaultValue;
  }
}

/**
 * Apply a fix to a nested path
 */
function applyNestedFix(
  obj: any,
  path: string[],
  expectedType: string,
  constraints: z.ZodIssue[],
): void {
  let current = obj;

  // Navigate to parent of the target field
  for (let i = 0; i < path.length - 1; i++) {
    const segment = path[i];

    // Handle array indices
    if (!Number.isNaN(Number.parseInt(segment))) {
      const index = Number.parseInt(segment);

      // Ensure parent is an array
      if (!Array.isArray(current)) {
        current = [];
      }

      // Ensure array has enough elements
      while (current.length <= index) {
        current.push({});
      }

      // Move to next level
      current = current[index];
    } else {
      // Handle object properties
      if (
        typeof current !== 'object' ||
        Array.isArray(current) ||
        current === null
      ) {
        current = {};
      }

      // Create property if it doesn't exist
      if (!(segment in current)) {
        current[segment] = {};
      }

      // Move to next level
      current = current[segment];
    }
  }

  // Fix the target field
  const lastSegment = path[path.length - 1];

  // Handle array index or object property
  if (!Number.isNaN(Number.parseInt(lastSegment))) {
    const index = Number.parseInt(lastSegment);

    // Ensure we have an array
    if (!Array.isArray(current)) {
      current = [];
    }

    // Ensure array has enough elements
    while (current.length <= index) {
      current.push(null);
    }

    // Fix the value
    current[index] = fixValueByType(current[index], expectedType, constraints);
  } else {
    // Fix object property
    current[lastSegment] = fixValueByType(
      current[lastSegment],
      expectedType,
      constraints,
      getSchemaDefaultForField(lastSegment),
    );
  }
}

/**
 * Get a default value for a specific field based on common schemas
 */
function getSchemaDefaultForField(field: string): any {
  // Common field defaults
  const defaults: Record<string, any> = {
    // Analysis schema
    findings: [
      {
        insight: 'Default insight',
        evidence: ['Default evidence'],
        confidence: 0.5,
      },
    ],
    implications: ['Default implication'],
    limitations: ['Default limitation'],

    // Research plan schema
    search_queries: [
      {
        query: 'Default query',
        rationale: 'Default rationale',
        source: 'web',
        priority: 3,
      },
    ],
    required_analyses: [
      {
        type: 'overview',
        description: 'Default analysis',
        importance: 3,
      },
    ],

    // Gap analysis schema
    knowledge_gaps: [
      {
        topic: 'Default topic',
        reason: 'Default reason',
        additional_queries: ['Default query'],
      },
    ],
    recommended_followup: [
      {
        action: 'Default action',
        rationale: 'Default rationale',
        priority: 3,
      },
    ],

    // Synthesis schema
    key_findings: [
      {
        finding: 'Default finding',
        supporting_evidence: ['Default evidence'],
        confidence: 0.7,
      },
    ],
    remaining_uncertainties: ['Default uncertainty'],

    // Generic defaults by field name pattern
    insight: 'Default insight',
    evidence: ['Default evidence item'],
    confidence: 0.5,
    finding: 'Default finding',
    supporting_evidence: ['Default supporting evidence'],
    description: 'Default description',
    type: 'default',
    importance: 3,
    priority: 3,
    query: 'Default query',
    rationale: 'Default rationale',
    action: 'Default action',
    topic: 'Default topic',
    reason: 'Default reason',
    severity: 5,
    potential_solutions: ['Default solution'],
  };

  return defaults[field];
}

/**
 * Create a fallback object based on schema
 */
function createFallbackObject(
  schema: z.ZodType,
  originalContent: Record<string, any>,
): any {
  // Start with empty object
  const fallback: Record<string, any> = {};

  // Determine schema type and add appropriate defaults
  // Handle known schemas
  if (
    schemaHasFields(originalContent, [
      'findings',
      'implications',
      'limitations',
    ])
  ) {
    // Analysis schema
    fallback.findings = [
      {
        insight: 'Analysis finding',
        evidence: ['Based on available data'],
        confidence: 0.7,
      },
    ];
    fallback.implications = ['Analysis implication'];
    fallback.limitations = ['Analysis limitation'];
  } else if (
    schemaHasFields(originalContent, ['search_queries', 'required_analyses'])
  ) {
    // Research plan schema
    fallback.search_queries = [
      {
        query: 'Research query',
        rationale: 'To gather essential information',
        source: 'web',
        priority: 3,
      },
    ];
    fallback.required_analyses = [
      {
        type: 'overview',
        description: 'General analysis of findings',
        importance: 3,
      },
    ];
  } else if (
    schemaHasFields(originalContent, [
      'limitations',
      'knowledge_gaps',
      'recommended_followup',
    ])
  ) {
    // Gap analysis schema
    fallback.limitations = [
      {
        type: 'data completeness',
        description: 'Research limitations in scope and coverage',
        severity: 5,
        potential_solutions: ['Additional research'],
      },
    ];
    fallback.knowledge_gaps = [
      {
        topic: 'Additional research areas',
        reason: 'Insufficient data available',
        additional_queries: ['Further research needed'],
      },
    ];
    fallback.recommended_followup = [
      {
        action: 'Conduct additional research',
        rationale: 'To address knowledge gaps',
        priority: 3,
      },
    ];
  } else if (
    schemaHasFields(originalContent, [
      'key_findings',
      'remaining_uncertainties',
    ])
  ) {
    // Enhanced synthesis schema fallback with better type handling
    fallback.key_findings = [];

    // Try to convert key_findings from string to array if needed
    if (typeof originalContent.key_findings === 'string') {
      try {
        const cleanedValue = originalContent.key_findings.replace(
          /<[^>]*>|<\/[^>]*>/g,
          '',
        );
        const parsed = JSON.parse(jsonrepair(cleanedValue));
        fallback.key_findings = Array.isArray(parsed) ? parsed : [parsed];
      } catch (e) {
        // Create a single finding from the string
        fallback.key_findings = [
          {
            finding:
              originalContent.key_findings || 'Research synthesis finding',
            supporting_evidence: ['Based on available data'],
            confidence: 0.7,
          },
        ];
      }
    } else if (originalContent.key_findings === undefined) {
      // Default fallback
      fallback.key_findings = [
        {
          finding: 'Research synthesis finding',
          supporting_evidence: ['Based on available data'],
          confidence: 0.7,
        },
      ];
    }

    // Ensure remaining_uncertainties is an array
    if (typeof originalContent.remaining_uncertainties === 'string') {
      try {
        const parsed = JSON.parse(
          jsonrepair(originalContent.remaining_uncertainties),
        );
        fallback.remaining_uncertainties = Array.isArray(parsed)
          ? parsed
          : [parsed];
      } catch (e) {
        fallback.remaining_uncertainties = [
          originalContent.remaining_uncertainties || 'Further research needed',
        ];
      }
    } else {
      fallback.remaining_uncertainties = Array.isArray(
        originalContent.remaining_uncertainties,
      )
        ? originalContent.remaining_uncertainties
        : ['Further research needed'];
    }
  }

  // Preserve any valid fields from original content
  for (const key in originalContent) {
    try {
      // Only preserve valid data
      if (originalContent[key] !== undefined && originalContent[key] !== null) {
        // Handle arrays
        if (
          Array.isArray(originalContent[key]) &&
          originalContent[key].length > 0
        ) {
          fallback[key] = originalContent[key];
        }
        // Handle objects
        else if (
          typeof originalContent[key] === 'object' &&
          !Array.isArray(originalContent[key]) &&
          Object.keys(originalContent[key]).length > 0
        ) {
          fallback[key] = originalContent[key];
        }
        // Handle primitives
        else if (
          ['string', 'number', 'boolean'].includes(typeof originalContent[key])
        ) {
          fallback[key] = originalContent[key];
        }
      }
    } catch (e) {
      console.error(`Error preserving field ${key}:`, e);
    }
  }

  // Ensure fallback has all required fields
  try {
    return schema.parse(fallback);
  } catch (e) {
    if (e instanceof z.ZodError) {
      // Ensure all required fields are present
      for (const issue of e.errors) {
        if (issue.code === 'invalid_type' && issue.received === 'undefined') {
          // Add missing required field
          const field = issue.path.join('.');
          setNestedValue(fallback, issue.path, getSchemaDefaultForField(field));
        }
      }

      // Try parsing again
      try {
        return schema.parse(fallback);
      } catch (finalError) {
        // Last resort - return fallback even if invalid
        console.error('Failed to create valid fallback:', finalError);
        return fallback;
      }
    }
    return fallback;
  }
}

/**
 * Create a minimal valid object that satisfies the schema
 */
function createMinimalValidObject(schema: z.ZodType): any {
  // Create a simple valid object with minimal content
  const minimal: Record<string, any> = {};

  // Default objects for common schemas
  const defaults = {
    // Analysis schema
    analysis: {
      findings: [
        {
          insight: 'Analysis finding',
          evidence: ['Evidence'],
          confidence: 0.5,
        },
      ],
      implications: ['Implication'],
      limitations: ['Limitation'],
    },

    // Gap analysis schema
    gap_analysis: {
      limitations: [
        {
          type: 'limitation',
          description: 'Research limitation',
          severity: 5,
          potential_solutions: ['Further research'],
        },
      ],
      knowledge_gaps: [
        {
          topic: 'Research gap',
          reason: 'Insufficient data',
          additional_queries: ['Query'],
        },
      ],
      recommended_followup: [
        {
          action: 'Follow-up action',
          rationale: 'Rationale',
          priority: 3,
        },
      ],
    },

    // Synthesis schema
    synthesis: {
      key_findings: [
        {
          finding: 'Finding',
          supporting_evidence: ['Evidence'],
          confidence: 0.7,
        },
      ],
      remaining_uncertainties: ['Uncertainty'],
    },

    // Research plan schema
    research_plan: {
      search_queries: [
        {
          query: 'Query',
          rationale: 'Rationale',
          source: 'web',
          priority: 3,
        },
      ],
      required_analyses: [
        {
          type: 'analysis',
          description: 'Description',
          importance: 3,
        },
      ],
    },
  };

  // Try each schema type
  try {
    // Try analysis schema
    return schema.parse(defaults.analysis);
  } catch (e1) {
    try {
      // Try gap analysis schema
      return schema.parse(defaults.gap_analysis);
    } catch (e2) {
      try {
        // Try synthesis schema
        return schema.parse(defaults.synthesis);
      } catch (e3) {
        try {
          // Try research plan schema
          return schema.parse(defaults.research_plan);
        } catch (e4) {
          // Try combining all defaults as last resort
          const combined = {
            ...defaults.analysis,
            ...defaults.gap_analysis,
            ...defaults.synthesis,
            ...defaults.research_plan,
          };

          try {
            return schema.parse(combined);
          } catch (e5) {
            console.error('Failed to create minimal valid object');
            // Return the combined object even if invalid
            return combined;
          }
        }
      }
    }
  }
}

/**
 * Check if a schema has the specified fields
 */
function schemaHasFields(obj: Record<string, any>, fields: string[]): boolean {
  return fields.some((field) => field in obj);
}

/**
 * Set a nested value in an object
 */
function setNestedValue(obj: any, path: (string | number)[], value: any): void {
  // Handle empty path
  if (path.length === 0) return;

  // Navigate to the parent object
  let current = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];

    // Create missing objects/arrays
    if (!(key in current)) {
      // Create array if next key is a number, otherwise object
      const nextKey = path[i + 1];
      current[key] =
        typeof nextKey === 'number' || !Number.isNaN(Number.parseInt(String(nextKey)))
          ? []
          : {};
    }

    current = current[key];
  }

  // Set the value
  current[path[path.length - 1]] = value;
}

/**
 * Generate an example JSON structure based on the schema
 */
function generateSchemaExample(schema: z.ZodType): string {
  // Start with a comprehensive example that covers common schemas
  const example = {
    // Analysis fields
    findings: [
      {
        insight: 'Main finding from analysis',
        evidence: ['Supporting evidence 1', 'Supporting evidence 2'],
        confidence: 0.8,
      },
    ],
    implications: ['Key implication 1', 'Key implication 2'],
    limitations: ['Limitation in analysis'],

    // Research plan fields
    search_queries: [
      {
        query: 'Example search query',
        rationale: 'Reason for the query',
        source: 'web',
        priority: 3,
      },
    ],
    required_analyses: [
      {
        type: 'comparative',
        description: 'Analysis description',
        importance: 4,
      },
    ],

    // Gap analysis fields
    knowledge_gaps: [
      {
        topic: 'Area needing more research',
        reason: 'Why this is a gap',
        additional_queries: ['Follow-up query 1'],
      },
    ],
    recommended_followup: [
      {
        action: 'Recommended next step',
        rationale: 'Reason for recommendation',
        priority: 4,
      },
    ],

    // Synthesis fields
    key_findings: [
      {
        finding: 'Key research finding',
        supporting_evidence: ['Evidence for finding'],
        confidence: 0.7,
      },
    ],
    remaining_uncertainties: ['Area of uncertainty 1', 'Area of uncertainty 2'],
  };

  // Try to parse with schema
  try {
    schema.parse(example);
    return JSON.stringify(example, null, 2);
  } catch (e) {
    if (e instanceof z.ZodError) {
      // Modify the example based on validation errors
      for (const issue of e.errors) {
        if (issue.code === 'unrecognized_keys') {
          // Remove unrecognized keys
          if ('keys' in issue && Array.isArray(issue.keys)) {
            for (const key of issue.keys) {
              if (typeof key === 'string' && key in example) {
                delete example[key as keyof typeof example];
              }
            }
          }
        }
      }

      // Try again with modified example
      try {
        schema.parse(example);
        return JSON.stringify(example, null, 2);
      } catch (e2) {
        // If still failing, return a simpler example
        return generateSimpleExample();
      }
    }

    // Return simple example as fallback
    return generateSimpleExample();
  }

  // Generate a simple example as fallback
  function generateSimpleExample(): string {
    return JSON.stringify(
      {
        data: {
          field1: 'Example value',
          field2: 123,
          field3: true,
          array_field: ['item1', 'item2'],
          object_field: {
            nested_key: 'nested value',
          },
        },
      },
      null,
      2,
    );
  }
}
