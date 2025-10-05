// ============= INPUT TYPES =============

export interface CreativeBrief {
  title: string;
  scope: 'single_recipe' | 'menu';
  constraints?: {
    dietary?: string[];
    equipment?: string[];
    skill?: 'beginner' | 'intermediate' | 'advanced';
    time?: string;
    servings?: number;
  };
  creativeFocus: 'traditional' | 'modern' | 'fusion';
  additionalContext?: string;
}

// ============= OUTPUT TYPES =============

export interface Ingredient {
  item: string;
  amount: string;
  unit: string;
  category?: string;
  notes?: string;
}

export interface Instruction {
  step: number;
  instruction: string;
  timing?: string;
  temperature?: string;
}

export interface NutritionInfo {
  calories?: number;
  protein?: string;
  carbohydrates?: string;
  fat?: string;
  fiber?: string;
  sodium?: string;
}

export interface Recipe {
  id: string;
  title: string;
  category: string;
  servings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  prepTime: string;
  cookTime: string;
  totalTime: string;
  introduction: string;
  historicalContext?: string;
  tips: string[];
  equipment: string[];
  ingredients: Ingredient[];
  instructions: Instruction[];
  nutrition: NutritionInfo;
}

// ============= INTERNAL WORKFLOW TYPES =============

export interface TaskMap {
  specialists: Array<{
    name: string;
    responsibilities: string[];
    priority: number;
  }>;
  estimatedComplexity: 'simple' | 'moderate' | 'complex';
}

export interface SpecialistOnePager {
  specialist: string;
  section: string;
  notes: string;
}

// ============= OBSERVABILITY TYPES =============

export interface ExecutionStep {
  agent: string;
  action: string;
  timestamp: string;
  durationMs: number;
  success: boolean;
  error?: string;
  tokenUsage?: {
    promptTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

export interface ExecutionLog {
  steps: ExecutionStep[];
  startTime: string;
  endTime?: string;
  totalDurationMs?: number;
}

export interface RecipeResult {
  recipe: Recipe;
  log: ExecutionLog;
}

// ============= ERROR TYPES =============

export * from './errors';
