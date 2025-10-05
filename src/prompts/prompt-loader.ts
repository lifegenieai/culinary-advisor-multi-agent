import fs from 'fs';
import path from 'path';
import { ConfigurationError } from '../types/errors';

export function loadPrompt(name: string): string {
  const promptsDir = path.join(process.cwd(), 'src', 'prompts');

  // Try with the exact name first
  let filePath = path.join(promptsDir, `${name}.txt`);

  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // Try to find a matching file (case-insensitive, accent-insensitive)
      const availablePrompts = fs.readdirSync(promptsDir).filter(f => f.endsWith('.txt'));
      const normalizedName = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      const match = availablePrompts.find(f => {
        const baseName = f.replace('.txt', '');
        const normalizedFile = baseName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return normalizedFile === normalizedName;
      });

      if (match) {
        filePath = path.join(promptsDir, match);
        return fs.readFileSync(filePath, 'utf-8');
      }

      throw new ConfigurationError(
        `Prompt file not found: ${name}.txt`,
        {
          filePath,
          availablePrompts
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

export interface PromptParts {
  systemInstruction: string;
  taskPrompt: string;
}

/**
 * Extracts system instruction from prompt template.
 * System instruction is everything before "RECIPE REQUEST:" or "CREATIVE BRIEF:" or "TASK:"
 */
export function extractSystemInstruction(template: string): PromptParts {
  // Find the split point - where task-specific content starts
  const splitPatterns = [
    /\n(?=RECIPE REQUEST:)/,
    /\n(?=CREATIVE BRIEF:)/,
    /\n(?=AVAILABLE SPECIALISTS:)/,
  ];

  for (const pattern of splitPatterns) {
    const match = template.match(pattern);
    if (match && match.index) {
      return {
        systemInstruction: template.substring(0, match.index).trim(),
        taskPrompt: template.substring(match.index).trim(),
      };
    }
  }

  // If no split found, treat entire template as task prompt
  return {
    systemInstruction: '',
    taskPrompt: template.trim(),
  };
}

export function renderPrompt(
  template: string,
  variables: Record<string, any>
): string {
  let rendered = template;

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    const replacement = typeof value === 'string'
      ? value
      : JSON.stringify(value, null, 2);
    rendered = rendered.replace(new RegExp(placeholder, 'g'), replacement);
  }

  return rendered;
}
