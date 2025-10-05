---
created: 2025-10-04
tags: [culinary-advisor, multi-agent, prd, ai-orchestration, llm-workflows]
type: project
status: in-progress
---

# **Product Requirements Document: Multi-Agent Recipe Generation System**

**Version:** 1.0  
**Date:** January 2025  
**Author:** Product/Architecture  
**Status:** Ready for Engineering Implementation

---

## **Executive Summary**

Build a multi-agent AI orchestration system that generates professional-grade culinary recipes by simulating a classical French kitchen brigade. The system takes a structured creative brief as input and produces a complete recipe with execution trace as output.

**Key Requirements:**

- Stateless service (JSON in → JSON out)
- Heterogeneous model selection (different LLMs per agent role)
- Cost transparency (token tracking per agent)
- Linear workflow with single parallel step
- Local development → Supabase Edge Function deployment path

---

## **1. System Overview**

### **1.1 Architecture Philosophy**

This system is designed as a **standalone, reusable service** with zero external dependencies beyond LLM APIs. It must be:

- **Stateless**: No database, no session management, no persistent state
- **Observable**: Full execution trace returned with every response
- **Composable**: Core orchestration logic works in any runtime (Node.js, Deno, Edge Functions)
- **Cost-conscious**: Token usage tracked and reported per agent

### **1.2 High-Level Data Flow**

```
User/System → Creative Brief (JSON)
               ↓
         [Orchestrator]
               ↓
    ┌──────────┼──────────┐
    ▼          ▼          ▼
  Planning  Specialists  Synthesis
    ↓          ↓          ↓
         [Orchestrator]
               ↓
    Recipe + Execution Trace (JSON)
               ↓
         User/System
```

### **1.3 Core Components**

1. **Orchestrator**: Main coordination logic, phase management
2. **Sous Chef Agent**: Planning (task mapping) and synthesis
3. **Specialist Agents**: Domain experts (9 roles)
4. **LLM Router**: Model selection and API abstraction
5. **Prompt Library**: Role-specific system prompts
6. **Execution Tracer**: Token tracking and performance logging

---

## **2. Workflow Specification**

### **2.1 Three-Phase Execution Model**

#### **Phase 1: Planning (Sous Chef)**

**Input:** Creative Brief  
**Process:** Sous Chef analyzes brief and creates a Task Map  
**Output:** Task Map specifying which specialists to call and their responsibilities

**Task Map Structure:**

```json
{
  "specialists": [
    {
      "name": "boulanger",
      "responsibilities": ["dough formula", "fermentation schedule"],
      "priority": 1
    }
  ],
  "historicalResearch": true,
  "estimatedComplexity": "moderate"
}
```

#### **Phase 2: Specialist Development (Parallel)**

**Input:** Brief + Task Map  
**Process:** Each assigned specialist develops their section independently (parallel execution)  
**Output:** Array of Specialist One-Pagers

**One-Pager Structure:**

```json
{
  "specialist": "boulanger",
  "section": "bread components",
  "formulaDelta": "Increased hydration to 75% for enriched dough",
  "methodNotes": "Use preferment for flavor development...",
  "risks": ["Over-proofing in warm environments"],
  "authenticityNotes": "Traditional method, modern hydration",
  "tokensUsed": 1200
}
```

#### **Phase 3: Synthesis (Sous Chef)**

**Input:** Brief + Task Map + All One-Pagers  
**Process:** Sous Chef applies QA rubric, reconciles conflicts, standardizes format  
**Output:** Complete Recipe (JSON) + markdown formatting

---

### **2.2 Agent Roles & Responsibilities**

|Role|Specialization|Example Triggers|
|---|---|---|
|**Executive Chef**|Vision, approval, presentation|(Handled by main chat app)|
|**Sous Chef**|Task planning, QA, synthesis|Every request|
|**Rotisseur**|Hot proteins, sauces, meat/fish|Steak, roast chicken, pan sauces|
|**Garde-Manger**|Cold kitchen, charcuterie, salads|Pâté, composed salads, terrines|
|**Pâtissier**|Pastry, desserts, confections|Tarts, mousses, plated desserts|
|**Boulanger**|Breads (global), fermentation|Baguettes, sourdough, naan, focaccia|
|**Asador**|Americas fire/smoke cooking|BBQ, asado, churrasco, smoked brisket|
|**Orientateur**|East/SE Asian cuisines|Stir-fry, ramen, pho, dim sum|
|**Épicier**|Indian/Middle Eastern/African|Curries, tagines, jollof rice, flatbreads|

---

## **3. Technical Requirements**

### **3.1 Model Selection Strategy**

**Requirement:** Each agent role must be independently configurable for:

- Model provider (OpenAI, Anthropic, Google, etc.)
- Specific model (GPT-4o, Claude Sonnet 4.5, Gemini 2.0 Flash)
- Model parameters (temperature, max_tokens, etc.)

**Configuration Format:**

```typescript
{
  "agents": {
    "sous_chef": {
      "planning": {
        "provider": "anthropic",
        "model": "claude-sonnet-4.5",
        "temperature": 0.3,
        "max_tokens": 2000
      },
      "synthesis": {
        "provider": "anthropic", 
        "model": "claude-sonnet-4.5",
        "temperature": 0.5,
        "max_tokens": 4000
      }
    },
    "specialists": {
      "default": {
        "provider": "google",
        "model": "gemini-2.0-flash-exp",
        "temperature": 0.6,
        "max_tokens": 2000
      },
      "boulanger": {
        "provider": "openai",
        "model": "gpt-4o",
        "temperature": 0.4,
        "max_tokens": 2000
      }
    }
  }
}
```

**Rationale:**

- **Sous Chef (Planning)**: Low temperature, high reasoning (Claude Sonnet 4.5 with extended thinking)
- **Specialists**: Cost-efficient, fast (Gemini Flash for most)
- **Specific specialists**: Override when domain expertise matters (e.g., Boulanger might need more reasoning)

### **3.2 LLM Abstraction Layer**

**Requirements:**

1. Unified interface across providers (OpenAI, Anthropic, Google, etc.)
2. Automatic retry logic with exponential backoff
3. Token usage tracking (input + output)
4. Cost calculation per request
5. Error handling with fallback models

**Interface:**

```typescript
async function callLLM(params: {
  agent: AgentType;
  action: string;
  prompt: string;
  config?: ModelConfig;
}): Promise<{
  content: string;
  tokensUsed: number;
  cost: number;
  model: string;
  duration: number;
}>
```

### **3.3 Token Cost Management**

**Requirements:**

- Track tokens per agent per invocation
- Return total cost estimate in execution trace
- Log warnings if single request exceeds threshold (e.g., 3000 tokens)
- Support cost analysis: "Which specialist is most expensive on average?"

**Target Costs (per recipe):**

- Simple recipe (pasta, salad): < 5,000 tokens (~$0.02)
- Moderate recipe (bread, entrée): 5,000-10,000 tokens (~$0.02-0.05)
- Complex recipe (multi-component, menu): 10,000-20,000 tokens (~$0.05-0.10)

---

## **4. Input/Output Specifications**

### **4.1 Input: Creative Brief**

```typescript
interface CreativeBrief {
  title: string;                    // "Brioche", "Thanksgiving Dinner Menu"
  scope: 'single_recipe' | 'menu';  // Single dish or full menu
  constraints: {
    dietary?: string[];             // ['vegetarian', 'gluten-free']
    equipment?: string[];           // ['no-oven', 'stovetop-only']
    skill?: 'beginner' | 'intermediate' | 'advanced';
    time?: string;                  // '30 minutes', '2 hours'
    servings?: number;              // Default: 4
  };
  creativeFocus: 'traditional' | 'modern' | 'fusion';
  additionalContext?: string;       // Free-form notes from user
}
```

### **4.2 Output: Recipe + Execution Trace**

```typescript
interface RecipeGenerationResult {
  recipe: Recipe;                   // Full structured recipe
  executionTrace: ExecutionTrace;   // Performance & cost data
  metadata: {
    version: string;                // System version
    generatedAt: string;            // ISO timestamp
  };
}

interface ExecutionTrace {
  totalDuration: number;            // Milliseconds
  totalTokens: number;              // Sum across all agents
  totalCost: string;                // USD estimate
  steps: ExecutionStep[];           // Detailed step log
}

interface ExecutionStep {
  agent: string;                    // 'sous_chef', 'boulanger', etc.
  action: string;                   // 'create_task_map', 'develop_section'
  duration: number;                 // Milliseconds
  tokensUsed: number;               // Tokens for this step
  model: string;                    // Actual model used
  success: boolean;
  error?: string;                   // If failed
  metadata?: Record<string, any>;   // Additional context
}
```

### **4.3 Recipe Structure**

```typescript
interface Recipe {
  id: string;                       // Unique identifier
  title: string;
  category: string;                 // 'Appetizers', 'Main Dishes', etc.
  servings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  prepTime: string;
  cookTime: string;
  totalTime: string;
  introduction: string;             // Elegant description
  historicalContext?: string;       // Heritage & background
  tips: string[];                   // Instructor-level guidance
  equipment: string[];              // Required tools
  advancedPreparation: string[];    // Make-ahead steps
  ingredients: Ingredient[];
  instructions: Instruction[];
  nutrition: NutritionInfo;
  nutritionNotes?: string;          // Explain N/A values
  createdAt: string;                // ISO timestamp
}
```

---

## **5. Observability & Debugging**

### **5.1 Logging Strategy**

**Development (Console):**

- Structured logs with agent name, action, timing
- Color-coded output (optional, for terminal visibility)
- Example: `[Boulanger] Starting work... (estimated 1200 tokens)`

**Production (Execution Trace):**

- All console logs also captured in ExecutionTrace
- Returned to caller for analysis
- No external logging service required initially

### **5.2 Execution Trace Requirements**

Must answer these questions:

1. Which specialists were called for this recipe?
2. How long did each phase take?
3. How many tokens did each agent consume?
4. What was the total cost?
5. Did any step fail or retry?
6. Which models were actually used?

### **5.3 Error Handling**

**Failure Modes:**

1. LLM API timeout/rate limit → Retry with exponential backoff (3 attempts)
2. Invalid response format → Log error, return partial trace, throw exception
3. Specialist failure → Continue with other specialists, note failure in trace
4. Synthesis failure → Cannot recover, return error with full trace

**Error Response:**

```typescript
{
  "error": {
    "message": "Synthesis failed: Invalid recipe format",
    "code": "SYNTHESIS_ERROR",
    "phase": "synthesis"
  },
  "partialTrace": ExecutionTrace  // Everything that succeeded
}
```

---

## **6. Development & Deployment Strategy**

### **6.1 Prototype Phase (Week 1-2)**

**Goal:** Validate orchestration logic locally

**Stack:**

- **Frontend:** Vite + React (minimal test harness)
- **Backend:** Express.js API server
- **Runtime:** Node.js (local development)

**Structure:**

```
recipe-orchestrator/
├── src/
│   ├── client/              # Throwaway test harness
│   ├── server/
│   │   ├── orchestrator/    # Core logic (portable)
│   │   ├── llm/             # LLM abstraction layer
│   │   └── index.ts         # Express server (temporary)
│   └── shared/              # Types (shared everywhere)
└── package.json
```

### **6.2 Production Deployment (Week 3+)**

**Target:** Supabase Edge Function

**Migration Path:**

1. Extract `orchestrator/` and `llm/` directories
2. Wrap in Supabase Edge Function handler:

```typescript
// supabase/functions/generate-recipe/index.ts
import { serve } from 'https://deno.land/std/http/server.ts';
import { orchestrator } from './orchestrator.ts';

serve(async (req) => {
  const brief = await req.json();
  const result = await orchestrator.generateRecipe(brief);
  return new Response(JSON.stringify(result));
});
```

3. Deploy: `supabase functions deploy generate-recipe`

**Deployment Checklist:**

- [ ] Environment variables for all LLM API keys
- [ ] CORS headers configured
- [ ] Timeout handling (Edge Functions: 15min limit)
- [ ] Cost monitoring alerts

---

## **7. Configuration Management**

### **7.1 Environment Variables**

```bash
# LLM Provider API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=AIza...

# Model Configuration (optional, can be hardcoded initially)
AGENT_CONFIG_PATH=./config/agents.json

# Observability
LOG_LEVEL=info  # debug | info | warn | error
ENABLE_TRACE=true
```

### **7.2 Agent Configuration File**

**Location:** `config/agents.json`  
**Purpose:** Single source of truth for model assignments

```json
{
  "version": "1.0",
  "agents": {
    "sous_chef": {
      "planning": {
        "provider": "anthropic",
        "model": "claude-sonnet-4.5-20250514",
        "temperature": 0.3,
        "max_tokens": 2000
      },
      "synthesis": {
        "provider": "anthropic",
        "model": "claude-sonnet-4.5-20250514",
        "temperature": 0.5,
        "max_tokens": 4000
      }
    },
    "specialists": {
      "default": {
        "provider": "google",
        "model": "gemini-2.0-flash-exp",
        "temperature": 0.6,
        "max_tokens": 2000
      }
    }
  },
  "retry": {
    "maxAttempts": 3,
    "backoffMs": 1000
  },
  "cost": {
    "warnThresholdTokens": 3000,
    "errorThresholdCost": 0.50
  }
}
```

---

## **8. Testing Strategy**

### **8.1 Unit Tests**

- **Orchestrator logic**: Mock LLM responses, test phase transitions
- **LLM router**: Test provider selection logic
- **Parsers**: Test recipe JSON extraction from LLM output
- **Cost calculator**: Verify token → USD conversions

### **8.2 Integration Tests**

- **Simple recipe**: Brioche (single specialist: Boulanger)
- **Moderate recipe**: Roast chicken (2-3 specialists: Rotisseur, Garde-Manger)
- **Complex recipe**: Multi-course menu (5+ specialists)

### **8.3 Performance Benchmarks**

Target execution times (with Gemini Flash for specialists):

- Simple recipe: 15-30 seconds
- Moderate recipe: 30-60 seconds
- Complex recipe: 60-120 seconds

---

## **9. Development Observability System** ✅ **IMPLEMENTED**

### **9.1 Event-Driven Architecture**

**Implementation:** Real-time event emission throughout orchestration lifecycle using Node.js EventEmitter pattern.

**Event Types:**
- `phase:start` / `phase:complete` - Phase transitions (planning, specialists, synthesis)
- `llm:request` / `llm:response` - LLM calls with prompts, responses, token usage
- `data:parsed` - Successful JSON extraction and validation
- `agent:error` - Agent-level failures with recovery information
- `recipe:complete` / `recipe:error` - Final outcomes

**Architecture:**
```typescript
// Orchestrator accepts optional EventEmitter
export async function generateRecipe(
  brief: CreativeBrief,
  debugEmitter?: EventEmitter
): Promise<RecipeResult>

// Debug endpoint creates emitter and passes to orchestrator
const debugEmitter = new EventEmitter();
generateRecipe(brief, debugEmitter);

// SSE endpoint streams events to client
emitter.on('debug', (event: DebugEvent) => {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
});
```

### **9.2 Debug Console UI**

**Location:** `http://localhost:3000/debug.html`

**Features:**
- Real-time event streaming via Server-Sent Events (SSE)
- Color-coded event types with VS Code-inspired theme
- Expandable prompts and responses (click to view full content)
- Token usage tracking per agent
- Parallel execution visualization with `[PARALLEL]` badges
- Timing data (elapsed time per phase, per agent)
- Three test scenarios: Brioche, Roast Chicken, Thanksgiving Menu

**Event Visualization:**
```
[14:23:45] (+0.34s) #1
🤖 sous_chef_planning [PARALLEL]
→ LLM Request (gemini-2.5-flash, temp=0.3)
→ Prompt preview: "You are the Sous Chef..."
▼ View full prompt

[14:23:47] (+2.12s) #2
✓ sous_chef_planning (1.78s)
→ Response preview: "{\"specialists\": [{\"name\": \"boulanger\"..."
→ Tokens: 856 in + 324 out = 1180 total
▼ View full response
```

### **9.3 SSE Streaming Endpoints**

**Debug Session Flow:**
1. `POST /api/generate-recipe-debug` - Initiates session, returns `requestId` and `debugUrl`
2. `GET /api/debug/stream/:requestId` - SSE endpoint for event streaming
3. Client connects with `EventSource` API
4. Events streamed in real-time as orchestration executes
5. Connection auto-closes on `recipe:complete` or `recipe:error`

**Session Management:**
- In-memory Map storage for active sessions
- 30-second cleanup after completion
- Heartbeat keepalive every 30 seconds
- Client disconnect handling

### **9.4 Temperature Tuning Strategy** ✅ **IMPLEMENTED**

**Rationale:** Temperature settings should reflect the cognitive demands of each culinary role.

**Configuration (`config/agents.json`):**

```json
{
  "temperatures": {
    "sous_chef_planning": 0.3,     // Low: Analytical reasoning
    "sous_chef_synthesis": 0.5,    // Medium: Balanced reconciliation
    "boulanger": 0.35,             // Low: Science-based (baker's percentages)
    "patissier": 0.4,              // Low: Precision (tempering, proofing)
    "rotisseur": 0.55,             // Medium: Classical technique
    "garde_manger": 0.6,           // Medium: Composition + technique
    "asador": 0.75,                // High: Creative fire/smoke intuition
    "orientateur": 0.7,            // High: Fusion possibilities
    "epicier": 0.7                 // High: Bold spice combinations
  },
  "temperatureRationale": {
    "precision_specialists": {
      "agents": ["boulanger", "patissier"],
      "temp_range": "0.35-0.4",
      "reason": "Science-based: precise percentages, fermentation chemistry, tempering techniques"
    },
    "technique_specialists": {
      "agents": ["rotisseur", "garde_manger"],
      "temp_range": "0.55-0.6",
      "reason": "Classical technique with some stylistic variation: roasting, sauces, composition"
    },
    "creative_specialists": {
      "agents": ["asador", "orientateur", "epicier"],
      "temp_range": "0.7-0.75",
      "reason": "Flavor-forward and creative: fire intuition, fusion possibilities, bold spice combinations"
    }
  }
}
```

**Performance Impact:** Temperature tuning improved output quality by matching LLM behavior to domain requirements (deterministic for science, creative for flavor innovation).

---

## **10. Future Enhancements (Post-MVP)**

### **10.1 Recipe Caching Strategy** 💡 **WISHLIST**

**Problem:** Every identical recipe request incurs full generation cost (~$0.015-0.02)

**Solution:** Database-first architecture with fingerprint-based lookup

**Implementation Plan:**

1. **Recipe Fingerprinting**
```typescript
interface RecipeFingerprint {
  briefHash: string;              // SHA-256 of normalized brief
  modelVersions: string[];        // Track model versions used
  generatedAt: string;
}

// Before generation, check cache
const fingerprint = hashBrief(brief);
const cachedRecipe = await db.recipes.findUnique({
  where: { fingerprint }
});

if (cachedRecipe) {
  return { recipe: cachedRecipe, fromCache: true, cost: 0 };
}
```

2. **Database Schema**
```sql
CREATE TABLE recipes (
  id UUID PRIMARY KEY,
  fingerprint TEXT UNIQUE NOT NULL,
  brief JSONB NOT NULL,
  recipe JSONB NOT NULL,
  execution_log JSONB,
  model_versions TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recipes_fingerprint ON recipes(fingerprint);
```

3. **Cost Savings Analysis**
- **First request:** Full generation (~$0.018)
- **Subsequent identical requests:** Database lookup (~$0.00001)
- **Savings at scale:** 95%+ cost reduction for repeat requests

**Invalidation Strategy:**
- Model version changes → New fingerprint required
- User requests "regenerate" → Bypass cache
- Time-based expiration → Optional (recipes don't expire, but model improvements do)

### **10.2 Recipe Modification Flow** 💡 **WISHLIST**

**Use Case:** User wants variation of existing recipe (e.g., "Brioche" → "Peach Rum Brioche")

**Workflow:**

1. **Base Recipe Retrieval** (from cache or generation)
   - User requests: "Brioche"
   - System returns cached recipe (cost: ~$0.00001)

2. **Executive Chef Suggests Twists**
   ```typescript
   // Lightweight LLM call to generate creative variations
   const prompt = `Given this base recipe: ${recipe.title}
   Suggest 3-5 creative variations (e.g., flavor additions, technique twists)`;

   const suggestions = await callLLM('executive_chef', prompt, {
     temperature: 0.8,  // High creativity
     max_tokens: 500    // Short response
   });
   // Cost: ~500 tokens × $2.50/1M = $0.00125
   ```

3. **User Selects Variation**
   - User picks: "Peach Rum Brioche"

4. **Executive Chef Modifies Recipe** (no full orchestrator)
   ```typescript
   const modificationPrompt = `
   Base Recipe: ${JSON.stringify(baseRecipe)}
   Requested Modification: ${userSelection}

   Apply this modification to the recipe. Adjust:
   - Ingredients (add peach, rum)
   - Instructions (incorporate new ingredients)
   - Timing (account for moisture changes)
   - Tips (address new challenges)

   Return complete modified recipe in same JSON format.
   `;

   const modifiedRecipe = await callLLM('executive_chef', modificationPrompt, {
     temperature: 0.6,
     max_tokens: 3000
   });
   // Cost: ~1200 in + 2500 out = 3700 tokens × $1.40/1M = $0.00518
   ```

5. **Store Modified Recipe**
   ```sql
   INSERT INTO recipes (fingerprint, brief, recipe, parent_recipe_id)
   VALUES ($fingerprint, $brief, $modifiedRecipe, $baseRecipeId);
   ```

**Cost Comparison:**
- **Full generation:** Planning (1180 tokens) + Specialist (2500 tokens) + Synthesis (4500 tokens) = 8180 tokens ≈ $0.0169
- **Modification flow:** Suggestions (500 tokens) + Modification (3700 tokens) = 4200 tokens ≈ $0.0045
- **Savings:** 73% cost reduction

**Database Enhancement:**
```sql
ALTER TABLE recipes ADD COLUMN parent_recipe_id UUID REFERENCES recipes(id);
CREATE INDEX idx_recipes_parent ON recipes(parent_recipe_id);
```

### **10.3 Streaming Progress Updates** 💡 **FUTURE**

- Extend debug SSE to production endpoint (optional query param: `?stream=true`)
- User sees: "Sous Chef planning... Boulanger working... Synthesizing..."
- UI shows real-time progress bar based on phase completion

### **10.4 Component-Level Caching** 💡 **FUTURE**

- Cache specialist one-pagers for common components (e.g., "how to make béchamel")
- Reuse cached one-pagers when similar component appears in different recipes
- Example: "Roast Chicken with Béchamel" reuses cached "béchamel" one-pager from "Lasagna"

### **10.5 Advanced QA** 💡 **FUTURE**

- Nutritional validation (call external API for accuracy)
- Technique validation (cross-reference against culinary database)
- Consistency checks (temperature units, measurement conversions)

### **10.6 Learning & Improvement** 💡 **FUTURE**

- Track which specialist combinations work best for recipe types
- Optimize model selection based on cost/quality trade-offs
- A/B test different synthesis strategies

---

## **11. Success Criteria**

### **11.1 Functional Requirements**

- [ ] Generates structurally complete recipes (all required fields present)
- [ ] Supports all 9 specialist roles
- [ ] Returns valid JSON for every successful request
- [ ] Execution trace includes token usage and timing
- [ ] Cost per recipe stays under $0.10 for 95% of requests

### **11.2 Performance Requirements**

- [ ] Average response time < 60 seconds for moderate recipes
- [ ] 95th percentile < 120 seconds
- [ ] Zero timeout failures for recipes under 90 seconds

### **11.3 Quality Requirements**

- [ ] Recipes are authentic to specified cuisine/style
- [ ] Instructions are clear and actionable
- [ ] Ingredient measurements are consistent
- [ ] No hallucinated techniques or ingredients

---

## **12. Open Questions for Engineering Team**

1. **Prompt engineering ownership**: Who owns prompt templates? Product or Engineering?
2. **Model fallback strategy**: If Claude times out, automatically retry with GPT-4o?
3. **Parallel execution limits**: Cap concurrent specialist calls to avoid rate limits?
4. **Response validation**: Strict schema validation or lenient parsing?
5. **Cost alerts**: Real-time alerts or daily reports?

---

## **13. Appendix: Reference Materials**

### **13.1 Existing System Context**

- **Main application**: cheffy-chat (Vite + React + Supabase)
- **Current chat endpoint**: Uses Gemini 2.5 Flash with single-agent system prompt
- **Auth & data**: Supabase (already integrated)

### **13.2 Prompt Engineering Baseline**

Current Executive Chef prompt (~8000 chars) includes:

- Recipe structure requirements (Markdown + JSON block)
- Nutritional information format
- Historical context expectations
- Tip quality standards

**Reuse:** Adapt this prompt for Sous Chef synthesis phase

---

## **End of PRD**

**Next Steps:**

1. Engineering team reviews and estimates implementation time
2. Identify technical unknowns and prototype solutions
3. Create implementation plan with milestones
4. Begin development with Phase 1 (local orchestration)

---

**Does this PRD capture everything you need to hand off to your engineering team? Any sections that need more detail or clarification?**