import { z } from 'zod';

// Schema for CreativeBrief
export const CreativeBriefSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  scope: z.enum(['single_recipe', 'menu']),
  creativeFocus: z.enum(['traditional', 'modern', 'fusion']),
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
  difficulty: z.string().transform((val) => {
    const lower = val.toLowerCase();
    if (lower === 'easy' || lower === 'beginner' || lower === 'simple') return 'easy';
    if (lower === 'hard' || lower === 'advanced' || lower === 'expert' || lower === 'difficult') return 'hard';
    return 'medium';
  }).pipe(z.enum(['easy', 'medium', 'hard'])),
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
    category: z.string().nullish(),
    notes: z.string().nullish(),
  })),
  instructions: z.array(z.object({
    step: z.number().int().positive(),
    instruction: z.string(),
    timing: z.string().nullish(),
    temperature: z.string().nullish(),
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
