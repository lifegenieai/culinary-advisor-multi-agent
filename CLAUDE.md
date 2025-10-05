# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Multi-agent AI orchestration system that generates professional-grade culinary recipes by simulating a classical French kitchen brigade. Takes structured JSON creative briefs as input and produces complete recipes with execution traces.

**Core Principles:**
- Stateless service (JSON in → JSON out)
- Heterogeneous model selection (different LLMs per agent role)
- Cost transparency (token tracking per agent)
- Observable execution (full trace returned with every response)

## Architecture

### Three-Phase Workflow

1. **Planning Phase**: Sous Chef analyzes creative brief → Task Map (which specialists to call)
2. **Specialist Phase**: Assigned specialists work in parallel → One-Pagers
3. **Synthesis Phase**: Sous Chef reconciles all inputs → Complete Recipe JSON

### Agent Roles

- **Sous Chef**: Task planning, QA, synthesis (used in phases 1 & 3)
- **Specialists** (9 roles): Rotisseur, Garde-Manger, Pâtissier, Boulanger, Asador, Orientateur, Épicier, etc.

Each specialist works independently during phase 2 (parallel execution is critical for performance).

### Core Components Structure

```
src/
├── orchestrator/        # Main coordination logic, phase management (PORTABLE)
├── llm/                 # LLM abstraction layer, model routing (PORTABLE)
├── shared/              # TypeScript interfaces (PORTABLE)
├── server/              # Express.js wrapper (TEMPORARY - for local dev)
└── client/              # Test harness (TEMPORARY - for local dev)
```

The `orchestrator/`, `llm/`, and `shared/` directories must be runtime-agnostic (work in Node.js, Deno, Edge Functions).

## Model Configuration

### Default Model Assignments

- **Sous Chef (Planning)**: Claude Sonnet 4.5, temp=0.3 (low temp for reasoning)
- **Sous Chef (Synthesis)**: Claude Sonnet 4.5, temp=0.5
- **Specialists (Default)**: Gemini 2.0 Flash, temp=0.6 (cost-efficient)
- **Per-specialist overrides**: Configurable in `config/agents.json`

### LLM Router Requirements

Must provide unified interface across OpenAI, Anthropic, Google APIs with:
- Automatic retry logic (3 attempts, exponential backoff)
- Token tracking (input + output)
- Cost calculation per request
- Error handling with fallback models

## Key Data Structures

### Creative Brief (Input)
```typescript
interface CreativeBrief {
  title: string;
  scope: 'single_recipe' | 'menu';
  constraints: { dietary?, equipment?, skill?, time?, servings? };
  creativeFocus: 'traditional' | 'modern' | 'fusion';
  additionalContext?: string;
}
```

### Recipe Generation Result (Output)
```typescript
interface RecipeGenerationResult {
  recipe: Recipe;                   // Full structured recipe
  executionTrace: ExecutionTrace;   // Performance & cost data
  metadata: { version, generatedAt };
}
```

### Execution Trace (Critical for Observability)
Must answer: Which specialists were called? How long did each phase take? Token usage per agent? Total cost? Which models used? Any failures/retries?

## Development Workflow

### Prototype Phase (Current)
- Local development with Express.js + Vite test harness
- Focus on validating orchestration logic
- Run: `npm run dev` (when implemented)

### Production Deployment (Future)
- Extract portable core (`orchestrator/`, `llm/`, `shared/`)
- Deploy as Supabase Edge Function
- Deploy: `supabase functions deploy generate-recipe`

## Configuration

### Environment Variables
```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=AIza...
AGENT_CONFIG_PATH=./config/agents.json  # Optional
LOG_LEVEL=info
ENABLE_TRACE=true
```

### Agent Configuration
Single source of truth: `config/agents.json`
- Model provider per agent
- Temperature, max_tokens per role
- Retry configuration
- Cost thresholds

## Cost & Performance Targets

### Token Budgets (per recipe)
- Simple recipe: < 5,000 tokens (~$0.02)
- Moderate recipe: 5,000-10,000 tokens (~$0.05)
- Complex recipe: 10,000-20,000 tokens (~$0.10)

### Execution Time Targets
- Simple: 15-30 seconds
- Moderate: 30-60 seconds
- Complex: 60-120 seconds

### Cost Warnings
- Log warning if single agent request exceeds 3,000 tokens
- Error threshold: $0.50 per recipe

## Error Handling Strategy

**Failure Modes:**
1. LLM API timeout/rate limit → Retry 3x with exponential backoff
2. Invalid response format → Log error, return partial trace, throw exception
3. Specialist failure → Continue with other specialists, note in trace
4. Synthesis failure → Cannot recover, return error with full trace

Always return execution trace, even on failure (for debugging).

## Testing Strategy

### Integration Test Cases
- Simple: Brioche (1 specialist: Boulanger)
- Moderate: Roast chicken (2-3 specialists)
- Complex: Multi-course menu (5+ specialists)

### Unit Test Focus
- Orchestrator phase transitions (with mocked LLM responses)
- LLM router provider selection
- Recipe JSON parsers
- Token → USD cost calculations

## Important Implementation Notes

### Parallel Execution
Phase 2 specialist calls MUST run in parallel (not sequential). This is critical for meeting performance targets.

### Statelessness
No database, no session management. All context passed in creative brief. All results returned in response.

### Portability
Core logic in `orchestrator/` and `llm/` must work in Node.js and Deno (for Edge Functions). Avoid runtime-specific APIs.

### Observability
Execution trace is the primary debugging tool. Capture: agent name, action, duration, tokens, model used, success/error state.

## Reference

Full requirements: `docs/culinary-advisor-multi-agent-prd.md`
