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
