Create a standalone multi-agent recipe orchestration POC. This system simulates a 
French kitchen brigade using AI agents to generate recipes through a 3-phase workflow.

PROJECT STRUCTURE:
```
recipe-orchestrator-poc/
├── src/
│   ├── orchestrator/       # Core workflow logic
│   ├── llm/               # Simple Gemini wrapper
│   ├── prompts/           # Agent prompt templates (.txt files)
│   ├── types/             # TypeScript definitions
│   └── server.ts          # Express API server
├── config/
│   └── agents.json        # Model assignments
├── test-briefs/           # Sample recipe requests (JSON files)
├── public/
│   └── index.html         # Simple test UI
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

SETUP TASKS:

1. **Initialize Node.js Project**:
   - Create package.json with dependencies:
     * express, @types/express
     * @google/generative-ai
     * dotenv
     * typescript, @types/node
     * tsx (for development)
   - Set version to 1.0.0
   - Add scripts:
     * "dev": "tsx watch src/server.ts"
     * "start": "tsx src/server.ts"
     * "build": "tsc"

2. **TypeScript Configuration** (tsconfig.json):
   ```json
   {
     "compilerOptions": {
       "target": "ES2022",
       "module": "commonjs",
       "moduleResolution": "node",
       "esModuleInterop": true,
       "strict": true,
       "skipLibCheck": true,
       "outDir": "./dist",
       "rootDir": "./src",
       "resolveJsonModule": true
     },
     "include": ["src/**/*"],
     "exclude": ["node_modules", "dist"]
   }
   ```

3. **Environment Setup**:
   - Create .env.example with:
     ```
     GOOGLE_AI_API_KEY=your_google_ai_api_key_here
     ```
   - Create .gitignore with: node_modules, .env, dist, test-results

4. **Type Definitions** (src/types/index.ts) - CREATE COMPLETE INTERFACES:

   ```typescript
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
   ```

5. **Configuration** (config/agents.json):
   ```json
   {
     "defaultModel": "gemini-2.0-flash-exp",
     "agents": {
       "sous_chef_planning": "gemini-2.0-flash-exp",
       "sous_chef_synthesis": "gemini-2.0-flash-exp",
       "boulanger": "gemini-2.0-flash-exp",
       "rotisseur": "gemini-2.0-flash-exp",
       "garde_manger": "gemini-2.0-flash-exp",
       "patissier": "gemini-2.0-flash-exp",
       "asador": "gemini-2.0-flash-exp",
       "orientateur": "gemini-2.0-flash-exp",
       "epicier": "gemini-2.0-flash-exp"
     }
   }
   ```

6. **README.md** - Create comprehensive documentation:
   
   Include:
   - Project overview: "Multi-agent AI system that generates recipes by orchestrating 
     specialist chef agents (like a French kitchen brigade)"
   - Architecture: 3-phase workflow
     * Phase 1: Sous Chef analyzes request and assigns specialists
     * Phase 2: Specialists develop their sections in parallel
     * Phase 3: Sous Chef synthesizes into complete recipe
   - Available specialists:
     * Boulanger: Breads & fermentation
     * Rotisseur: Hot proteins & sauces
     * Garde-Manger: Cold kitchen & salads
     * Pâtissier: Desserts & pastry
     * Asador: Americas fire/smoke cooking
     * Orientateur: East/SE Asian cuisines
     * Épicier: Indian/Middle Eastern/African cuisines
   - Quick start:
     1. npm install
     2. Copy .env.example to .env and add Google AI API key
     3. npm run dev
     4. Open http://localhost:3000
   - API endpoint: POST /api/generate-recipe

7. **Create Directory Structure**:
   - src/orchestrator/ (empty for now)
   - src/llm/ (empty for now)
   - src/prompts/ (empty for now)
   - src/types/ (with index.ts)
   - config/ (with agents.json)
   - test-briefs/ (empty for now)
   - public/ (empty for now)

DO NOT implement any business logic yet. Just structure, types, and configuration.

VERIFICATION STEPS:
1. Run: npm install
2. Run: tsc --noEmit (should compile with no errors)
3. Verify all directories exist
4. Verify types/index.ts exports all interfaces
5. Verify config/agents.json is valid JSON

After completion, I will add my Google AI API key to .env and proceed to Phase 1.