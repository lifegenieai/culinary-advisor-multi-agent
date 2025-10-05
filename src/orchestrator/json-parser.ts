import { z } from 'zod';

export function extractJSON<T>(text: string, schema?: z.ZodSchema<T>): T {
  // Remove markdown code blocks
  let cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');

  // Remove comments (sometimes LLMs add them)
  cleaned = cleaned.replace(/\/\/.*$/gm, '');
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');

  // Remove trailing commas (common LLM mistake)
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');

  // Try direct parse
  try {
    let parsed = JSON.parse(cleaned.trim());

    // Debug: log parsed type
    console.log('Parsed JSON type:', Array.isArray(parsed) ? 'array' : typeof parsed);

    // If parsed is an array with one element, unwrap it (common LLM mistake)
    if (Array.isArray(parsed) && parsed.length === 1) {
      console.warn('⚠️  LLM returned array instead of object, unwrapping...');
      parsed = parsed[0];
    }

    // If parsed is still an array, throw specific error
    if (Array.isArray(parsed)) {
      throw new Error(
        `JSON validation failed: expected object, received array with ${parsed.length} elements`
      );
    }

    // Validate with schema if provided
    if (schema) {
      return schema.parse(parsed);
    }

    return parsed as T;
  } catch (e) {
    // If Zod validation error, provide better message
    if (e instanceof z.ZodError) {
      throw new Error(
        `JSON validation failed: ${e.issues.map((err: any) => `${err.path.join('.')}: ${err.message}`).join(', ')}`
      );
    }

    // Try to find first complete JSON object
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (schema) {
          return schema.parse(parsed);
        }
        return parsed as T;
      } catch (e2) {
        if (e2 instanceof z.ZodError) {
          throw new Error(
            `JSON validation failed: ${e2.issues.map((err: any) => `${err.path.join('.')}: ${err.message}`).join(', ')}`
          );
        }
        throw new Error(
          `JSON extraction failed: ${e2}\n\nOriginal text:\n${text.substring(0, 500)}...`
        );
      }
    }
    throw new Error(
      `No valid JSON found in response:\n${text.substring(0, 500)}...`
    );
  }
}
