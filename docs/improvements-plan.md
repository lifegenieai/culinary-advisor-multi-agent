# Implementation Improvements Plan

**Date**: 2025-10-04
**Current Version**: 1.0.0 (Phase 1 Complete)
**Overall Code Quality**: 8.5/10 (Production-ready with minor improvements)

## Overview

This document outlines recommended improvements to elevate the codebase from "very good" to "production-grade" based on Node.js and TypeScript best practices. All recommendations are based on the [Node.js Best Practices Guide](https://github.com/goldbergyoni/nodebestpractices) and official TypeScript documentation.

---

## Priority Improvements

### 🔴 CRITICAL: Process-Level Error Handlers

**Priority**: Must implement before production
**Estimated Time**: 5 minutes
**Impact**: Prevents silent crashes and data loss

**Problem**: Currently, uncaught exceptions or unhandled promise rejections will crash the Node.js process without proper logging or cleanup.

**Solution**: Add global error handlers in `src/server.ts`

**Implementation**:

```typescript
// Add to src/server.ts (after app.listen, before the closing brace)

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('\n💥 UNCAUGHT EXCEPTION - Shutting down gracefully...');
  console.error('Error name:', error.name);
  console.error('Error message:', error.message);
  console.error('Stack trace:', error.stack);

  // Log to monitoring service (add when available)
  // errorMonitor.logCritical(error);

  // Exit process - let process manager (PM2, Docker, etc.) restart
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown, promise: Promise<any>) => {
  console.error('\n💥 UNHANDLED PROMISE REJECTION');
  console.error('Reason:', reason);
  console.error('Promise:', promise);

  // Throw to let uncaughtException handler deal with it
  throw reason;
});

// Optional: Handle graceful shutdown on SIGTERM (Docker, Kubernetes)
process.on('SIGTERM', () => {
  console.log('\n📴 SIGTERM signal received - Closing HTTP server');
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
});
```

**Files to Modify**:
- `src/server.ts`: Add after line 54 (after `app.listen()`)

**Testing**:
```typescript
// Test uncaught exception (temporarily add to test):
setTimeout(() => {
  throw new Error('Test uncaught exception');
}, 1000);

// Test unhandled rejection (temporarily add to test):
setTimeout(() => {
  Promise.reject(new Error('Test unhandled rejection'));
}, 2000);
```

---

### 🟠 HIGH: Custom AppError Class

**Priority**: High
**Estimated Time**: 15 minutes
**Impact**: Better error classification, monitoring, and debugging

**Problem**: Using generic `Error` class makes it difficult to distinguish between:
- **Operational errors** (expected, recoverable): API timeout, invalid user input
- **Programmer errors** (unexpected, bugs): null reference, syntax error

**Solution**: Create custom `AppError` class with operational flag

**Implementation**:

1. **Create new file**: `src/types/errors.ts`

```typescript
/**
 * Custom error class for application-specific errors.
 * Extends the built-in Error class with additional context.
 */
export class AppError extends Error {
  /** Whether this is an expected operational error (true) or a programmer bug (false) */
  public readonly isOperational: boolean;

  /** HTTP status code (if applicable) */
  public readonly httpCode?: number;

  /** Additional context for debugging */
  public readonly context?: Record<string, any>;

  /** Timestamp when error was created */
  public readonly timestamp: string;

  constructor(
    message: string,
    isOperational: boolean = true,
    httpCode?: number,
    context?: Record<string, any>
  ) {
    super(message);

    // Restore prototype chain (required for extending Error in TypeScript)
    Object.setPrototypeOf(this, new.target.prototype);

    this.name = this.constructor.name;
    this.isOperational = isOperational;
    this.httpCode = httpCode;
    this.context = context;
    this.timestamp = new Date().toISOString();

    // Capture stack trace (excludes constructor call from stack)
    Error.captureStackTrace(this);
  }
}

/**
 * Common error types for recipe generation
 */
export class LLMError extends AppError {
  constructor(agent: string, originalError: Error, context?: Record<string, any>) {
    super(
      `LLM agent '${agent}' failed: ${originalError.message}`,
      true, // operational - external API issue
      500,
      { agent, originalError: originalError.message, ...context }
    );
  }
}

export class ConfigurationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(
      message,
      false, // programmer error - config should be valid
      500,
      context
    );
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(
      message,
      true, // operational - user input issue
      400,
      context
    );
  }
}
```

2. **Update `src/types/index.ts`**:

```typescript
// Add to exports
export * from './errors';
```

3. **Replace Error usage in `src/llm/gemini-client.ts`**:

```typescript
// Line 1: Add import
import { LLMError, ConfigurationError } from '../types/errors';

// Line 12: Replace with ConfigurationError
if (!apiKey) {
  throw new ConfigurationError(
    'GOOGLE_AI_API_KEY environment variable is not set. Check your .env file.',
    { configPath: '.env' }
  );
}

// Line 20: Add error handling for config file
let agentConfig: any;
try {
  agentConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  throw new ConfigurationError(
    `Failed to load agent configuration: ${message}`,
    { configPath }
  );
}

// Line 43: Replace with LLMError
throw new LLMError(agent, error, { duration });
```

4. **Update `src/orchestrator/orchestrator.ts`**:

```typescript
// Line 1: Add import
import { AppError } from '../types/errors';

// Line 115: Replace error message
if (onePagers.length === 0) {
  throw new AppError(
    'All specialists failed. Cannot proceed to synthesis.',
    true, // operational - all external API calls failed
    500,
    { attemptedSpecialists: taskMap.specialists.map(s => s.name) }
  );
}
```

5. **Update `src/server.ts`**:

```typescript
// Line 3: Add import
import { AppError, ValidationError } from './types/errors';

// Line 23: Replace with ValidationError
if (!brief.title || !brief.scope || !brief.creativeFocus) {
  throw new ValidationError(
    'Invalid creative brief. Required fields: title, scope, creativeFocus',
    { received: Object.keys(req.body) }
  );
}

// Line 37: Improve error handling
} catch (error: unknown) {
  console.error('Recipe generation error:', error);

  // Determine status code
  const statusCode = error instanceof AppError && error.httpCode
    ? error.httpCode
    : 500;

  // Return error with execution log if available
  res.status(statusCode).json({
    error: error instanceof Error ? error.message : 'Unknown error',
    ...(error instanceof AppError && {
      isOperational: error.isOperational,
      context: error.context,
      timestamp: error.timestamp,
    }),
    executionLog: (error as any).executionLog || null,
  });
}
```

**Files to Modify**:
- NEW: `src/types/errors.ts`
- `src/types/index.ts`: Add export
- `src/llm/gemini-client.ts`: Lines 1, 12, 20, 43
- `src/orchestrator/orchestrator.ts`: Lines 1, 115
- `src/server.ts`: Lines 3, 23, 37
- `src/prompts/prompt-loader.ts`: Line 10 (add ConfigurationError)

---

### 🟡 MEDIUM: Type-Safe Error Handling

**Priority**: Medium
**Estimated Time**: 10 minutes
**Impact**: Better TypeScript type safety in catch blocks

**Problem**: Using `catch (error: any)` bypasses TypeScript's type checking

**Solution**: Use `catch (error: unknown)` and type guards

**Implementation**:

**Pattern to use**:
```typescript
// ❌ BAD (current)
catch (error: any) {
  console.error('Error:', error.message);
  throw new Error(`Failed: ${error.message}`);
}

// ✅ GOOD (recommended)
catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error('Error:', message);
  throw new AppError(`Failed: ${message}`, true);
}
```

**Files to Update**:

1. `src/llm/gemini-client.ts:40`
```typescript
} catch (error: unknown) {
  const duration = Date.now() - startTime;
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[${agent}] ✗ Error after ${duration}ms:`, message);
  throw new LLMError(agent, error instanceof Error ? error : new Error(String(error)), { duration });
}
```

2. `src/orchestrator/orchestrator.ts:75`
```typescript
} catch (error: unknown) {
  const duration = Date.now() - startTime;
  const message = error instanceof Error ? error.message : String(error);

  // Log failure but don't throw
  console.warn(`⚠️  ${spec.name} failed: ${message}`);

  const step: ExecutionStep = {
    agent: spec.name,
    action: 'specialist_contribution',
    timestamp: new Date().toISOString(),
    durationMs: duration,
    success: false,
    error: message,
  };

  return { onePager: null, step };
}
```

3. `src/orchestrator/orchestrator.ts:151`
```typescript
} catch (error: unknown) {
  // Log error and finalize
  log.endTime = new Date().toISOString();
  log.totalDurationMs = Date.now() - new Date(log.startTime).getTime();

  const message = error instanceof Error ? error.message : String(error);

  log.steps.push({
    agent: 'orchestrator',
    action: 'error',
    timestamp: new Date().toISOString(),
    durationMs: 0,
    success: false,
    error: message,
  });

  console.error(`\n❌ Recipe generation failed: ${message}\n`);

  // Attach log to error for debugging
  if (error instanceof Error) {
    (error as any).executionLog = log;
  }
  throw error;
}
```

4. `src/server.ts:37` - Already covered in AppError section above

**Files to Modify**:
- `src/llm/gemini-client.ts`: Line 40
- `src/orchestrator/orchestrator.ts`: Lines 75, 151
- `src/server.ts`: Line 37

---

### 🟡 MEDIUM: File I/O Error Handling

**Priority**: Medium
**Estimated Time**: 10 minutes
**Impact**: Graceful startup failures with helpful messages

**Problem**: Synchronous file operations can crash on startup without helpful context

**Implementation**:

1. **Update `src/llm/gemini-client.ts`**:

```typescript
// Lines 18-20: Replace with error handling
let agentConfig: any;
try {
  const configPath = path.join(process.cwd(), 'config', 'agents.json');
  const configContent = fs.readFileSync(configPath, 'utf-8');
  agentConfig = JSON.parse(configContent);
} catch (error: unknown) {
  if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
    throw new ConfigurationError(
      'Agent configuration file not found. Expected: config/agents.json',
      { configPath: path.join(process.cwd(), 'config', 'agents.json') }
    );
  }
  const message = error instanceof Error ? error.message : String(error);
  throw new ConfigurationError(
    `Failed to load agent configuration: ${message}`,
    { configPath: path.join(process.cwd(), 'config', 'agents.json') }
  );
}
```

2. **Update `src/prompts/prompt-loader.ts`**:

```typescript
// Line 1: Add import
import { ConfigurationError } from '../types/errors';

// Lines 4-13: Replace entire loadPrompt function
export function loadPrompt(name: string): string {
  const promptsDir = path.join(process.cwd(), 'src', 'prompts');
  const filePath = path.join(promptsDir, `${name}.txt`);

  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new ConfigurationError(
        `Prompt file not found: ${name}.txt`,
        {
          filePath,
          availablePrompts: fs.readdirSync(promptsDir).filter(f => f.endsWith('.txt'))
        }
      );
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new ConfigurationError(
      `Failed to load prompt file: ${message}`,
      { filePath }
    );
  }
}
```

**Files to Modify**:
- `src/llm/gemini-client.ts`: Lines 18-20
- `src/prompts/prompt-loader.ts`: Lines 1, 4-13

---

### 🟢 LOW: Input Validation with Zod

**Priority**: Low (nice to have)
**Estimated Time**: 30 minutes
**Impact**: Runtime type safety and better error messages

**Problem**: Only basic validation exists; runtime data could violate TypeScript types

**Solution**: Add Zod for schema validation

**Implementation**:

1. **Install Zod**:
```bash
npm install zod
```

2. **Create validation schemas**: `src/types/validation.ts`

```typescript
import { z } from 'zod';

// Schema for CreativeBrief
export const CreativeBriefSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  scope: z.enum(['single_recipe', 'menu'], {
    errorMap: () => ({ message: "Scope must be 'single_recipe' or 'menu'" })
  }),
  creativeFocus: z.enum(['traditional', 'modern', 'fusion'], {
    errorMap: () => ({ message: "Creative focus must be 'traditional', 'modern', or 'fusion'" })
  }),
  constraints: z.object({
    dietary: z.array(z.string()).optional(),
    equipment: z.array(z.string()).optional(),
    skill: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    time: z.string().optional(),
    servings: z.number().int().positive().optional(),
  }).optional(),
  additionalContext: z.string().max(2000, 'Additional context too long').optional(),
});

// Schema for TaskMap response
export const TaskMapSchema = z.object({
  specialists: z.array(z.object({
    name: z.string(),
    responsibilities: z.array(z.string()),
    priority: z.number().int(),
  })),
  estimatedComplexity: z.enum(['simple', 'moderate', 'complex']),
});

// Schema for SpecialistOnePager response
export const SpecialistOnePagerSchema = z.object({
  specialist: z.string(),
  section: z.string(),
  notes: z.string(),
});

// Schema for Recipe response (simplified - can expand)
export const RecipeSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.string(),
  servings: z.number().int().positive(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  prepTime: z.string(),
  cookTime: z.string(),
  totalTime: z.string(),
  introduction: z.string(),
  historicalContext: z.string().optional(),
  tips: z.array(z.string()),
  equipment: z.array(z.string()),
  ingredients: z.array(z.object({
    item: z.string(),
    amount: z.string(),
    unit: z.string(),
    category: z.string().optional(),
    notes: z.string().optional(),
  })),
  instructions: z.array(z.object({
    step: z.number().int().positive(),
    instruction: z.string(),
    timing: z.string().optional(),
    temperature: z.string().optional(),
  })),
  nutrition: z.object({
    calories: z.number().optional(),
    protein: z.string().optional(),
    carbohydrates: z.string().optional(),
    fat: z.string().optional(),
    fiber: z.string().optional(),
    sodium: z.string().optional(),
  }),
});

// Type inference helpers
export type CreativeBriefInput = z.input<typeof CreativeBriefSchema>;
export type CreativeBriefOutput = z.output<typeof CreativeBriefSchema>;
```

3. **Update `src/server.ts`**:

```typescript
// Line 3: Add imports
import { CreativeBriefSchema } from './types/validation';
import { ValidationError } from './types/errors';

// Lines 20-27: Replace validation
const parseResult = CreativeBriefSchema.safeParse(req.body);

if (!parseResult.success) {
  const errors = parseResult.error.errors.map(e => ({
    field: e.path.join('.'),
    message: e.message,
  }));

  throw new ValidationError(
    'Invalid creative brief',
    { errors }
  );
}

const brief = parseResult.data;
```

4. **Update `src/orchestrator/json-parser.ts`** to use Zod:

```typescript
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
    const parsed = JSON.parse(cleaned.trim());

    // Validate with schema if provided
    if (schema) {
      return schema.parse(parsed);
    }

    return parsed as T;
  } catch (e) {
    // If Zod validation error, provide better message
    if (e instanceof z.ZodError) {
      throw new Error(
        `JSON validation failed: ${e.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ')}`
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
```

5. **Update orchestrator calls** (optional but recommended):

```typescript
// src/orchestrator/orchestrator.ts

import { TaskMapSchema, SpecialistOnePagerSchema, RecipeSchema } from '../types/validation';

// Line 32:
const taskMap = extractJSON<TaskMap>(planningResponse, TaskMapSchema);

// Line 62:
const onePager = extractJSON<SpecialistOnePager>(response, SpecialistOnePagerSchema);

// Line 131:
const recipe = extractJSON<Recipe>(synthesisResponse, RecipeSchema);
```

**Files to Modify**:
- NEW: `src/types/validation.ts`
- `package.json`: Add zod dependency
- `src/server.ts`: Lines 3, 20-27
- `src/orchestrator/json-parser.ts`: Entire file
- `src/orchestrator/orchestrator.ts`: Lines 1, 32, 62, 131 (optional)

---

### 🟢 LOW: Request Timeout

**Priority**: Low
**Estimated Time**: 5 minutes
**Impact**: Prevent indefinite waiting on client side

**Implementation**:

```typescript
// src/server.ts - inside POST /api/generate-recipe handler

app.post('/api/generate-recipe', async (req, res) => {
  // Set timeout to 5 minutes (300000ms)
  const TIMEOUT_MS = 300000;

  const timeoutId = setTimeout(() => {
    if (!res.headersSent) {
      res.status(504).json({
        error: 'Recipe generation timed out. Try a simpler request or try again later.',
        timeout: TIMEOUT_MS,
      });
    }
  }, TIMEOUT_MS);

  try {
    // ... existing validation code ...

    console.log(`\n📨 Received request: "${brief.title}"`);

    // Generate recipe
    const result = await generateRecipe(brief);

    // Clear timeout on success
    clearTimeout(timeoutId);

    // Return result
    res.json(result);

  } catch (error: unknown) {
    // Clear timeout on error
    clearTimeout(timeoutId);

    // ... existing error handling ...
  }
});
```

**Files to Modify**:
- `src/server.ts`: Inside POST handler (after line 18)

---

## Testing Recommendations

### Unit Tests (Not Implemented)

Create test files using Jest or Vitest:

```typescript
// tests/json-parser.test.ts
describe('extractJSON', () => {
  it('should parse valid JSON', () => {
    const result = extractJSON<{ name: string }>('{"name": "test"}');
    expect(result.name).toBe('test');
  });

  it('should handle markdown code blocks', () => {
    const result = extractJSON<{ name: string }>('```json\n{"name": "test"}\n```');
    expect(result.name).toBe('test');
  });

  it('should throw on invalid JSON', () => {
    expect(() => extractJSON('{invalid}')).toThrow();
  });
});

// tests/orchestrator.test.ts (with mocked LLM)
describe('generateRecipe', () => {
  it('should handle specialist failures gracefully', async () => {
    // Mock callGemini to fail for some specialists
    // Verify that synthesis still proceeds with successful ones
  });
});
```

**Files to Create**:
- `tests/json-parser.test.ts`
- `tests/orchestrator.test.ts`
- `tests/gemini-client.test.ts`

---

## Implementation Checklist

### Phase 1: Critical & High Priority (30 min)
- [ ] Add process-level error handlers to `src/server.ts`
- [ ] Create `src/types/errors.ts` with AppError class
- [ ] Update all error throws to use AppError
- [ ] Update all catch blocks to use `unknown` instead of `any`

### Phase 2: Medium Priority (20 min)
- [ ] Add file I/O error handling in gemini-client
- [ ] Add file I/O error handling in prompt-loader
- [ ] Test startup with missing config/prompts files

### Phase 3: Low Priority (Optional, 35 min)
- [ ] Install and configure Zod
- [ ] Create validation schemas
- [ ] Update server.ts to use Zod validation
- [ ] Add request timeout to API endpoint

### Phase 4: Testing (Future)
- [ ] Set up Jest or Vitest
- [ ] Write unit tests for json-parser
- [ ] Write unit tests for orchestrator (with mocked LLM)
- [ ] Write integration tests for full workflow

---

## Files Summary

### New Files to Create
1. `src/types/errors.ts` - Custom error classes
2. `src/types/validation.ts` - Zod schemas (optional)
3. `tests/json-parser.test.ts` - Unit tests (future)
4. `tests/orchestrator.test.ts` - Unit tests (future)

### Files to Modify
1. `src/server.ts` - Error handlers, validation, timeout
2. `src/llm/gemini-client.ts` - Error handling, file I/O
3. `src/orchestrator/orchestrator.ts` - Error types, validation
4. `src/orchestrator/json-parser.ts` - Type safety, Zod
5. `src/prompts/prompt-loader.ts` - File I/O error handling
6. `src/types/index.ts` - Export errors
7. `package.json` - Add zod (optional)

---

## Before/After Comparison

### Error Handling (Before)
```typescript
} catch (error: any) {
  throw new Error(`${agent} failed: ${error.message}`);
}
```

### Error Handling (After)
```typescript
} catch (error: unknown) {
  const duration = Date.now() - startTime;
  throw new LLMError(
    agent,
    error instanceof Error ? error : new Error(String(error)),
    { duration }
  );
}
```

### Benefits
- ✅ Type-safe error handling
- ✅ Operational vs programmer error distinction
- ✅ Rich context for debugging
- ✅ Consistent error structure
- ✅ Better monitoring integration
- ✅ Graceful process shutdown

---

## Production Readiness Checklist

After implementing these improvements:

- [x] TypeScript strict mode enabled
- [x] Comprehensive type definitions
- [x] Async/await error handling
- [x] Resilient parallel execution
- [ ] **Process-level error handlers** (CRITICAL)
- [ ] **Custom error classes** (HIGH)
- [ ] **Type-safe catch blocks** (MEDIUM)
- [ ] **File I/O error handling** (MEDIUM)
- [ ] Input validation (LOW)
- [ ] Request timeouts (LOW)
- [ ] Unit tests (FUTURE)
- [ ] Integration tests (FUTURE)
- [ ] Logging/monitoring integration (FUTURE)
- [ ] Health check endpoint (DONE - /api/health)
- [ ] Environment variable validation (FUTURE)

---

## Resources

- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Zod Documentation](https://zod.dev/)
- [Error Handling in Node.js](https://www.joyent.com/node-js/production/design/errors)

---

**Generated**: 2025-10-04
**Review Status**: Ready for implementation
**Next Review**: After Phase 1-2 completion
