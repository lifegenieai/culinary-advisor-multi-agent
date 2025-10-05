import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { LLMError, ConfigurationError } from '../types/errors';

// Load environment variables
dotenv.config();

// Validate API key
const apiKey = process.env.GOOGLE_AI_API_KEY;
if (!apiKey) {
  throw new ConfigurationError(
    'GOOGLE_AI_API_KEY environment variable is not set. Check your .env file.',
    { configPath: '.env' }
  );
}

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(apiKey);

// Load agent configuration
let agentConfig: any;
try {
  const configPath = path.join(process.cwd(), 'config', 'agents.json');
  const configContent = fs.readFileSync(configPath, 'utf-8');
  agentConfig = JSON.parse(configContent);
} catch (error: unknown) {
  const configPath = path.join(process.cwd(), 'config', 'agents.json');
  if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
    throw new ConfigurationError(
      'Agent configuration file not found. Expected: config/agents.json',
      { configPath }
    );
  }
  const message = error instanceof Error ? error.message : String(error);
  throw new ConfigurationError(
    `Failed to load agent configuration: ${message}`,
    { configPath }
  );
}

export interface GeminiCallOptions {
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
  jsonMode?: boolean;
}

export interface GeminiResponse {
  text: string;
  tokenUsage: {
    promptTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

export async function callGemini(
  agent: string,
  prompt: string,
  options: GeminiCallOptions = {}
): Promise<GeminiResponse> {
  const maxRetries = 3;
  const baseDelay = 1000; // 1 second

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const startTime = Date.now();

    try {
      // Get model name and temperature from config
      const modelName = agentConfig.agents[agent] || agentConfig.defaultModel;
      const agentTemp = agentConfig.temperatures?.[agent];
      const temperature = options.temperature ?? agentTemp ?? 0.7;

      // Determine max output tokens based on agent role
      const maxOutputTokens = options.maxOutputTokens ?? getDefaultMaxTokens(agent);

      // Build generation config
      const generationConfig: any = {
        temperature,
        maxOutputTokens,
      };

      // Enable JSON mode if requested
      if (options.jsonMode) {
        generationConfig.responseMimeType = 'application/json';
      }

      // Initialize model with config
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig,
        ...(options.systemInstruction && {
          systemInstruction: options.systemInstruction,
        }),
      });

      const attemptSuffix = attempt > 1 ? ` (attempt ${attempt}/${maxRetries})` : '';
      console.log(`[${agent}] Calling ${modelName}...${attemptSuffix}`);

      const result = await model.generateContent(prompt);
      const response = await result.response;

      // Validate finish reason
      const candidate = response.candidates?.[0];
      if (!candidate) {
        throw new Error('No response candidate returned');
      }

      if (candidate.finishReason && candidate.finishReason !== 'STOP') {
        throw new Error(
          `Generation stopped with reason: ${candidate.finishReason}. ` +
          `This may indicate content policy violation or other issue.`
        );
      }

      const text = response.text();
      const duration = Date.now() - startTime;

      // Extract token usage metadata
      const usage = response.usageMetadata || {};
      const tokenUsage = {
        promptTokens: usage.promptTokenCount || 0,
        outputTokens: usage.candidatesTokenCount || 0,
        totalTokens: usage.totalTokenCount || 0,
      };

      console.log(`[${agent}] ✓ Complete (${duration}ms, ${tokenUsage.totalTokens} tokens)`);

      return { text, tokenUsage };
    } catch (error: unknown) {
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : String(error);

      // Check if error is retryable (rate limit, timeout, network)
      const isRetryable = isRetryableError(error);

      if (attempt < maxRetries && isRetryable) {
        const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
        console.warn(
          `[${agent}] ⚠️  Retryable error (${duration}ms): ${message}. Retrying in ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue; // Retry
      }

      // Non-retryable error or max retries exceeded
      console.error(`[${agent}] ✗ Error after ${duration}ms:`, message);
      throw new LLMError(agent, error instanceof Error ? error : new Error(String(error)), { duration });
    }
  }

  // Should never reach here, but TypeScript needs it
  throw new LLMError(agent, new Error('Max retries exceeded'), {});
}

function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();

  // Retry on rate limits, timeouts, and network errors
  return (
    message.includes('rate limit') ||
    message.includes('quota') ||
    message.includes('timeout') ||
    message.includes('econnreset') ||
    message.includes('enotfound') ||
    message.includes('503') ||
    message.includes('429')
  );
}

function getDefaultMaxTokens(agent: string): number {
  // Synthesis needs more tokens for combining multiple specialists
  if (agent.includes('synthesis')) return 16384;
  // Planning needs fewer tokens
  if (agent.includes('planning')) return 2048;
  // Specialists get standard allocation
  return 4096;
}
