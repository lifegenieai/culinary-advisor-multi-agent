# Google Agent Development Kit (ADK) Migration Proposal

**Document Version:** 1.0
**Date:** October 20, 2025
**Project:** Culinary Advisor Multi-Agent System
**Prepared for:** Migration to Google ADK

---

## Executive Summary

This document proposes migrating the Culinary Advisor Multi-Agent system from its custom orchestration framework to Google's **Agent Development Kit (ADK)**, an official framework specifically designed for building production-grade multi-agent systems with Gemini.

### Key Findings

- **Google ADK** is a code-first, modular framework that directly addresses our use case (multi-agent orchestration with parallel execution)
- **Official TypeScript/JavaScript support** via `@google/adk` npm package (v0.1.0, early access)
- **Native parallel execution** with `ParallelAgent` workflow agent
- **Reduced boilerplate**: 40-60% code reduction in orchestration layer
- **Built-in observability**: Session state management, agent-to-agent communication tracking
- **Production readiness**: Google-maintained, integrated with Vertex AI for scaling

### Recommendation

**Proceed with phased migration** starting with a proof-of-concept parallel agent implementation, followed by full migration if validation succeeds. Estimated effort: 2-3 weeks for complete migration with testing.

---

## Table of Contents

1. [Google ADK Overview](#1-google-adk-overview)
2. [Current Architecture Analysis](#2-current-architecture-analysis)
3. [Migration Benefits](#3-migration-benefits)
4. [Architecture Comparison](#4-architecture-comparison)
5. [Detailed Migration Strategy](#5-detailed-migration-strategy)
6. [Code Examples](#6-code-examples)
7. [Implementation Phases](#7-implementation-phases)
8. [Risk Assessment](#8-risk-assessment)
9. [Next Steps](#9-next-steps)
10. [References](#10-references)

---

## 1. Google ADK Overview

### What is Google ADK?

Google's **Agent Development Kit (ADK)** is an open-source, code-first framework for building, evaluating, and deploying sophisticated AI agents with fine-grained control over orchestration, tool use, and multi-agent collaboration.

### Core Concepts

#### 1.1 Agent Types

**LLM Agents** (`LlmAgent`)
- Use Large Language Models for dynamic reasoning and generation
- Configured with system instructions, tools, and output keys
- Example: Our specialist chefs (Boulanger, Rotisseur, etc.)

**Workflow Agents** (Orchestration)
- **`SequentialAgent`**: Runs sub-agents one after another
- **`ParallelAgent`**: Executes sub-agents concurrently (our use case!)
- **`LoopAgent`**: Iterates sub-agents based on conditions
- **Custom Agents**: Extend base `Agent` class

#### 1.2 Session State Management

ADK maintains a **Shared Session State** across all agents in a workflow:
- Agents write results to state using `outputKey`
- Subsequent agents read from state using variable interpolation
- Example: `ParallelAgent` → each specialist writes to its own key → `SequentialAgent` gathers all keys

#### 1.3 Tool Integration

Built-in tools:
- `GOOGLE_SEARCH` - Web search capabilities
- Custom function tools via decorators
- OpenAPI spec integration
- Multi-modal tool support (text, images, audio)

### Key Features

✅ **Parallel Execution**: Native `ParallelAgent` for concurrent sub-agent execution
✅ **Hierarchical Multi-Agent Systems**: Nest workflow agents for complex orchestration
✅ **Model Flexibility**: Per-agent model and temperature configuration
✅ **Observability**: Built-in session state tracking, A2A protocol support
✅ **Production-Ready**: Integrates with Vertex AI Agent Builder for deployment
✅ **Code-First**: No YAML/config files, pure TypeScript definitions

### Installation

```bash
npm install @google/adk
# Requires zod as peer dependency (we already have it!)
npm install zod
```

**Current Status:** Version 0.1.0 (early access, actively developed)

---

## 2. Current Architecture Analysis

### 2.1 Current Implementation Overview

**File:** `src/orchestrator/orchestrator.ts` (354 lines)

Our custom orchestration implements:
- **3-phase workflow**: Planning → Specialists (Parallel) → Synthesis
- **Manual parallel execution** via `Promise.allSettled()`
- **Custom event system** via `EventEmitter` for debug observability
- **Manual state management** via local variables and function returns
- **Custom retry logic** in `gemini-client.ts`
- **Manual error handling** with try/catch blocks per specialist

### 2.2 Current Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    orchestrator.ts                          │
│  (Custom Orchestration Logic - 354 lines)                   │
└────────────────────────┬────────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
    ┌─────────┐    ┌─────────┐    ┌─────────┐
    │ Phase 1 │    │ Phase 2 │    │ Phase 3 │
    │Planning │───▶│Parallel │───▶│Synthesis│
    │         │    │ (manual)│    │         │
    └────┬────┘    └────┬────┘    └────┬────┘
         │              │              │
         ▼              ▼              ▼
    ┌────────────────────────────────────┐
    │      callGemini() wrapper          │
    │   (gemini-client.ts - 183 lines)   │
    └────────────────┬───────────────────┘
                     │
                     ▼
         @google/generative-ai SDK
                (Gemini API)
```

### 2.3 Current Strengths

✅ Working parallel execution (Phase 2)
✅ Robust error handling with custom `AppError` classes
✅ Token tracking and cost calculation
✅ Event-driven debug observability
✅ Temperature tuning per agent role
✅ Zod schema validation
✅ Graceful specialist failure handling

### 2.4 Current Pain Points

⚠️ **Manual orchestration complexity**: 354 lines of custom workflow logic
⚠️ **No built-in session state**: Passing data via function returns and local variables
⚠️ **Custom parallel execution**: Re-implementing what ADK provides natively
⚠️ **Limited agent communication patterns**: Hard to add conditional routing or loops
⚠️ **Event system overhead**: Custom `EventEmitter` for observability
⚠️ **No agent-to-agent protocol**: Can't easily compose with external agents

---

## 3. Migration Benefits

### 3.1 Code Reduction

**Estimated reduction: 40-60% in orchestration layer**

| Component | Current LOC | With ADK | Reduction |
|-----------|-------------|----------|-----------|
| Orchestration logic | 354 | ~150 | -57% |
| LLM client wrapper | 183 | ~50 | -73% |
| Manual parallel execution | ~50 | 0 (native) | -100% |
| State management | ~40 | 0 (native) | -100% |
| **Total** | **627** | **~200** | **-68%** |

### 3.2 Maintenance Benefits

✅ **Official Google support**: Bug fixes, security updates, new features
✅ **Community examples**: Growing ecosystem of ADK patterns and samples
✅ **Future-proof**: Aligns with Google's agent strategy (Vertex AI integration)
✅ **Reduced custom code**: Less code to maintain, test, and debug

### 3.3 Feature Enhancements

**Native capabilities we can leverage:**

1. **Hierarchical Multi-Agent Systems**
   - Nest specialists under domain coordinators (e.g., "Pastry Team" → Boulanger + Pâtissier)
   - Easier to implement "Executive Chef" twist flow (Phase 3 future enhancement)

2. **Dynamic Routing**
   - LLM-driven agent selection (vs. static Task Map)
   - "Smart Sous Chef" could dynamically route based on brief analysis

3. **Loop Workflows**
   - Iterative refinement (e.g., QA loop for recipe validation)
   - Multi-round synthesis with feedback

4. **Session State**
   - Persistent state across phases
   - Easier debugging with structured state inspection
   - Natural support for recipe modification flow

5. **A2A Protocol Integration**
   - Future: Call external specialized agents (e.g., nutrition calculator service)
   - Composability with other ADK-built agents

### 3.4 Observability Improvements

**Current:** Custom `EventEmitter` with manual event emission (40+ emit calls)

**With ADK:**
- Built-in session state tracking
- Agent-to-agent communication logging
- Native integration with ADK Web UI (visual debugging tool)
- Structured state history for auditing

### 3.5 Performance

**No significant performance change expected**

- ADK uses the same underlying Gemini API
- Parallel execution remains concurrent (no sequential bottleneck)
- Potential minor overhead from ADK's state management (~5-10ms per agent)

**Estimated impact: +50-100ms total (negligible for 20-30s workflows)**

### 3.6 Cost

**No cost increase**

- Same LLM calls, same tokens consumed
- Same model selection and temperature settings
- ADK framework is free and open-source

---

## 4. Architecture Comparison

### 4.1 Side-by-Side Comparison

| Aspect | Current Custom | With Google ADK |
|--------|----------------|-----------------|
| **Orchestration** | Manual 3-phase logic (354 LOC) | Declarative `SequentialAgent` + `ParallelAgent` (~50 LOC) |
| **Parallel Execution** | `Promise.allSettled()` with manual mapping | Native `ParallelAgent` with sub-agents array |
| **State Management** | Local variables, function returns | Shared `SessionState` with output keys |
| **Agent Communication** | Direct function calls | State-based with key reading/writing |
| **Observability** | Custom `EventEmitter` (40+ emit calls) | Built-in session state + ADK Web UI |
| **Error Handling** | Manual try/catch per specialist | ADK handles gracefully (continues on failure) |
| **Extensibility** | Add new phases = modify orchestrator.ts | Add agents to workflow = declarative config |
| **Testing** | Mock `callGemini()` function | Mock ADK agent runners (cleaner interface) |
| **Deployment** | Portable core + custom server | Direct Vertex AI Agent Builder integration |

### 4.2 Proposed ADK Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              Root SequentialAgent                           │
│  (Main Orchestrator - ~50 lines TypeScript)                 │
└────────────────────────┬────────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │LlmAgent  │   │ Parallel │   │LlmAgent  │
    │(Planning)│──▶│  Agent   │──▶│(Synthesis)│
    │          │   │          │   │          │
    └──────────┘   └────┬─────┘   └──────────┘
                        │
         ┌──────────────┼──────────────┬─────────────┐
         ▼              ▼              ▼             ▼
    ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
    │LlmAgent │   │LlmAgent │   │LlmAgent │   │LlmAgent │
    │Boulanger│   │Rotisseur│   │ Garde-  │...│ Épicier │
    │         │   │         │   │ Manger  │   │         │
    └─────────┘   └─────────┘   └─────────┘   └─────────┘
                         │
                         ▼
              Shared Session State
         ┌──────────────────────────┐
         │ planning_result: {...}   │
         │ boulanger_result: {...}  │
         │ rotisseur_result: {...}  │
         │ synthesis_result: {...}  │
         └──────────────────────────┘
```

### 4.3 Data Flow Comparison

**Current Flow:**
```
CreativeBrief
  ↓
callGemini(planning) → TaskMap
  ↓
Promise.allSettled([callGemini(spec1), callGemini(spec2), ...])
  ↓ (manual array mapping)
SpecialistOnePager[]
  ↓
callGemini(synthesis, { brief, onePagers })
  ↓
Recipe
```

**ADK Flow:**
```
CreativeBrief
  ↓
RootSequentialAgent.run(state)
  ├─ LlmAgent(Planning) → state['task_map']
  ├─ ParallelAgent([Specialist1, Specialist2, ...])
  │   ├─ LlmAgent(Specialist1) → state['specialist_1']
  │   ├─ LlmAgent(Specialist2) → state['specialist_2']
  │   └─ ...
  └─ LlmAgent(Synthesis, input: state['specialist_*'])
      → state['final_recipe']
  ↓
Recipe (from state['final_recipe'])
```

---

## 5. Detailed Migration Strategy

### 5.1 Migration Approach

**Strategy: Phased Parallel Development**

1. **Phase 0**: Setup & Proof-of-Concept (3-5 days)
2. **Phase 1**: Core Orchestration Migration (5-7 days)
3. **Phase 2**: Integration & Testing (3-4 days)
4. **Phase 3**: Cleanup & Documentation (2-3 days)

**Total Estimated Time: 2-3 weeks**

### 5.2 What to Migrate

#### ✅ **Migrate to ADK**

- `src/orchestrator/orchestrator.ts` → ADK workflow agents
- Parallel specialist execution → `ParallelAgent`
- Phase sequencing → `SequentialAgent`
- State management → ADK `SessionState`

#### 🔄 **Adapt for ADK**

- `src/llm/gemini-client.ts` → Thin wrapper around ADK's LlmAgent
- `src/prompts/` → System instructions for LlmAgent configs
- `config/agents.json` → ADK agent definitions with temperatures

#### ✅ **Keep As-Is**

- `src/types/` → All TypeScript interfaces (no changes needed)
- `src/types/validation.ts` → Zod schemas (still useful for output validation)
- `src/types/errors.ts` → Custom error classes (can wrap ADK errors)
- `test-briefs/` → All test cases (no changes)
- `src/server.ts` → Express server (minimal changes)
- `public/` → Web UI (minimal changes)

#### ❌ **Remove After Migration**

- Custom `EventEmitter` logic (use ADK observability)
- Manual `Promise.allSettled()` orchestration
- Manual state passing via variables

### 5.3 Backward Compatibility Plan

**During migration, maintain both implementations:**

```typescript
// src/orchestrator/index.ts
export { generateRecipe } from './orchestrator'; // Current
export { generateRecipeWithADK } from './orchestrator-adk'; // New ADK version
```

**Server routing:**
```typescript
// Support both endpoints during transition
app.post('/api/generate-recipe', handleCurrentVersion);
app.post('/api/generate-recipe-adk', handleADKVersion); // Test new version
```

**Switch flag (environment variable):**
```bash
USE_ADK=true npm run dev  # Use ADK implementation
USE_ADK=false npm run dev # Use current implementation (fallback)
```

### 5.4 Testing Strategy

**Validation approach:**

1. **Parallel Testing**: Run same test briefs through both implementations
2. **Compare Outputs**:
   - Recipe structure (should be identical)
   - Token usage (should be ±5%)
   - Execution time (should be ±10%)
   - Error handling behavior
3. **Integration Tests**: All 7 test briefs must pass with ADK
4. **Performance Benchmarks**: Document before/after metrics

**Success Criteria:**
- ✅ All 7 test briefs produce valid recipes
- ✅ Token usage within 10% of current implementation
- ✅ Execution time within 15% of current implementation
- ✅ Error handling gracefully handles specialist failures
- ✅ Debug observability maintained or improved

---

## 6. Code Examples

### 6.1 Current Implementation (Simplified)

```typescript
// Current: src/orchestrator/orchestrator.ts
export async function generateRecipe(brief: CreativeBrief): Promise<RecipeResult> {
  // Phase 1: Planning (manual)
  const planningResponse = await callGemini('sous_chef_planning', planningPrompt);
  const taskMap = extractJSON<TaskMap>(planningResponse.text, TaskMapSchema);

  // Phase 2: Specialists (manual parallel)
  const specialistPromises = taskMap.specialists.map(async (spec) => {
    const response = await callGemini(spec.name, prompt);
    return extractJSON<SpecialistOnePager>(response.text, SpecialistOnePagerSchema);
  });
  const onePagers = await Promise.allSettled(specialistPromises);

  // Phase 3: Synthesis (manual)
  const synthesisResponse = await callGemini('sous_chef_synthesis', synthesisPrompt);
  const recipe = extractJSON<Recipe>(synthesisResponse.text, RecipeSchema);

  return { recipe, log };
}
```

### 6.2 Proposed ADK Implementation

```typescript
// Proposed: src/orchestrator/orchestrator-adk.ts
import { LlmAgent, ParallelAgent, SequentialAgent } from '@google/adk';
import { loadPrompt, extractSystemInstruction } from '../prompts/prompt-loader';

// Create individual LLM agents
function createPlanningAgent(): LlmAgent {
  const template = loadPrompt('sous-chef-planning');
  const { systemInstruction, taskPrompt } = extractSystemInstruction(template);

  return new LlmAgent({
    name: 'sous_chef_planning',
    model: 'gemini-2.5-flash',
    temperature: 0.3,
    instruction: systemInstruction,
    outputKey: 'task_map', // Write to session state
  });
}

function createSpecialistAgent(name: string, temp: number): LlmAgent {
  const template = loadPrompt(name);
  const { systemInstruction } = extractSystemInstruction(template);

  return new LlmAgent({
    name,
    model: 'gemini-2.5-flash',
    temperature: temp,
    instruction: systemInstruction,
    outputKey: `specialist_${name}`, // Each writes to unique key
  });
}

function createSynthesisAgent(): LlmAgent {
  const template = loadPrompt('sous-chef-synthesis');
  const { systemInstruction } = extractSystemInstruction(template);

  return new LlmAgent({
    name: 'sous_chef_synthesis',
    model: 'gemini-2.5-flash',
    temperature: 0.5,
    instruction: systemInstruction + '\n\nUse specialist results from session state.',
    outputKey: 'final_recipe',
  });
}

// Main orchestrator with ADK
export async function generateRecipeWithADK(
  brief: CreativeBrief
): Promise<RecipeResult> {
  // Define specialist agents (in parallel)
  const specialists = [
    createSpecialistAgent('boulanger', 0.35),
    createSpecialistAgent('rotisseur', 0.55),
    createSpecialistAgent('garde_manger', 0.6),
    createSpecialistAgent('patissier', 0.4),
    createSpecialistAgent('asador', 0.75),
    createSpecialistAgent('orientateur', 0.7),
    createSpecialistAgent('epicier', 0.7),
  ];

  // Create parallel workflow for specialists
  const parallelSpecialists = new ParallelAgent({
    name: 'parallel_specialists',
    subAgents: specialists, // Run all concurrently
  });

  // Create sequential pipeline: Planning → Specialists → Synthesis
  const rootAgent = new SequentialAgent({
    name: 'recipe_orchestrator',
    subAgents: [
      createPlanningAgent(),      // Phase 1
      parallelSpecialists,        // Phase 2 (parallel!)
      createSynthesisAgent(),     // Phase 3
    ],
  });

  // Initialize session state with creative brief
  const initialState = {
    creative_brief: brief,
  };

  // Run the entire workflow
  const result = await rootAgent.run(initialState);

  // Extract recipe from final state
  const recipe = result.state['final_recipe'] as Recipe;

  // Build execution log from ADK session state history
  const log = buildExecutionLogFromADKState(result);

  return { recipe, log };
}
```

### 6.3 Key Differences

| Aspect | Current | ADK |
|--------|---------|-----|
| **Lines of code** | ~350 | ~80 |
| **Parallel execution** | Manual `Promise.allSettled()` | Declarative `ParallelAgent` |
| **State management** | Local variables | `SessionState` with keys |
| **Agent definition** | Inline in orchestrator | Separate factory functions |
| **Error handling** | Try/catch per specialist | ADK handles automatically |
| **Extensibility** | Modify orchestrator logic | Add/remove agents from array |

### 6.4 Dynamic Specialist Selection (Bonus Feature)

**Current limitation:** We select all 7+ specialists even if only 1-2 are needed (wastes tokens).

**With ADK:** Planning agent can return specialist list, and we dynamically build ParallelAgent:

```typescript
// Dynamic specialist selection based on planning phase
export async function generateRecipeWithDynamicSpecialists(
  brief: CreativeBrief
): Promise<RecipeResult> {
  // Phase 1: Planning determines which specialists to call
  const planningAgent = createPlanningAgent();
  const planningResult = await planningAgent.run({ creative_brief: brief });
  const taskMap = planningResult.state['task_map'] as TaskMap;

  // Phase 2: Dynamically create only the needed specialists
  const dynamicSpecialists = taskMap.specialists.map(spec =>
    createSpecialistAgent(spec.name, getTemperature(spec.name))
  );

  const parallelSpecialists = new ParallelAgent({
    name: 'parallel_specialists',
    subAgents: dynamicSpecialists, // Only the needed ones!
  });

  // Phase 3: Synthesis
  const synthesisAgent = createSynthesisAgent();

  // Run phases 2 and 3
  let state = planningResult.state;
  state = await parallelSpecialists.run(state);
  const finalResult = await synthesisAgent.run(state);

  const recipe = finalResult.state['final_recipe'] as Recipe;
  return { recipe, log: buildExecutionLog(finalResult) };
}
```

**Benefit:** Only call Boulanger for brioche (1 specialist × $0.002 = $0.002) vs. current approach (7 specialists × $0.002 = $0.014). **7x cost reduction for simple recipes!**

---

## 7. Implementation Phases

### Phase 0: Setup & Proof-of-Concept (3-5 days)

**Goals:**
- Install and configure ADK
- Validate ADK works with our existing setup
- Build minimal POC with 1-2 agents

**Tasks:**

1. **Install ADK** (1 hour)
   ```bash
   npm install @google/adk
   # Verify installation
   npm list @google/adk
   ```

2. **Create ADK experiment directory** (1 hour)
   ```bash
   mkdir -p src/orchestrator-adk
   touch src/orchestrator-adk/poc.ts
   ```

3. **Build Single Agent POC** (4-6 hours)
   - Create one LlmAgent (e.g., Boulanger)
   - Test with simple prompt
   - Validate output and token tracking

4. **Build ParallelAgent POC** (4-6 hours)
   - Create 2 specialists (Boulanger + Rotisseur)
   - Wrap in ParallelAgent
   - Verify concurrent execution (check timestamps)

5. **Build SequentialAgent POC** (4-6 hours)
   - Add Planning agent before ParallelAgent
   - Add Synthesis agent after ParallelAgent
   - Test full 3-phase workflow with mock data

6. **Document Findings** (2 hours)
   - Performance benchmarks
   - API differences vs. current implementation
   - Any blockers or limitations discovered

**Success Criteria:**
- ✅ ADK installed and working
- ✅ Single agent generates valid output
- ✅ ParallelAgent executes 2+ agents concurrently
- ✅ SequentialAgent chains phases correctly
- ✅ Session state accessible between agents

**Decision Point:** If POC fails or reveals major blockers, **STOP** and re-evaluate migration strategy.

---

### Phase 1: Core Orchestration Migration (5-7 days)

**Goals:**
- Migrate full orchestrator.ts to ADK
- Preserve all 9 specialist agents
- Maintain feature parity with current implementation

**Tasks:**

1. **Create Agent Factory Functions** (1 day)
   - `createPlanningAgent()` → LlmAgent for planning
   - `createSpecialistAgent(name, temp)` → LlmAgent for specialists
   - `createSynthesisAgent()` → LlmAgent for synthesis
   - Load prompts from `src/prompts/` (reuse existing files)
   - Apply temperature settings from `config/agents.json`

2. **Build Parallel Specialist Workflow** (1 day)
   - Create all 9 LlmAgent instances
   - Wrap in ParallelAgent
   - Configure output keys (`specialist_boulanger`, etc.)

3. **Build Root SequentialAgent** (1 day)
   - Chain: Planning → ParallelSpecialists → Synthesis
   - Configure initial state with `CreativeBrief`
   - Extract final recipe from state

4. **Implement State Management** (1 day)
   - Map ADK session state to our data types
   - Extract `TaskMap` from planning state
   - Gather specialist results from state
   - Extract `Recipe` from synthesis state

5. **Migrate Token Tracking** (1 day)
   - Access ADK's token usage metadata
   - Build `ExecutionLog` from ADK session history
   - Match current log structure for compatibility

6. **Error Handling** (1 day)
   - Wrap ADK errors in our custom `AppError` classes
   - Handle specialist failures gracefully
   - Ensure partial results still produce logs

7. **Create New Entry Point** (0.5 day)
   - File: `src/orchestrator/orchestrator-adk.ts`
   - Export `generateRecipeWithADK(brief, debugEmitter?)`
   - Keep backward-compatible signature

**Success Criteria:**
- ✅ All 9 specialists integrated
- ✅ Parallel execution works (verify with timestamps)
- ✅ Recipe output matches current structure
- ✅ Token tracking functional
- ✅ Error handling preserves observability

---

### Phase 2: Integration & Testing (3-4 days)

**Goals:**
- Test ADK implementation against all test briefs
- Compare performance with current implementation
- Validate observability and debugging

**Tasks:**

1. **Integration Testing** (1.5 days)
   - Run all 7 test briefs through ADK version
   - Compare recipe outputs (should be functionally identical)
   - Validate Zod schema compliance
   - Check nutrition data, instructions, ingredients

2. **Performance Benchmarking** (1 day)
   - Measure execution time for each test brief (both versions)
   - Compare token usage (should be within 5-10%)
   - Document any performance regressions
   - Profile Phase 2 parallel execution (verify concurrency)

3. **Observability Testing** (0.5 day)
   - Verify `ExecutionLog` captures all agent calls
   - Test with debug event emitter (if migrated)
   - Validate timestamp accuracy
   - Check error logging for failed specialists

4. **Server Integration** (0.5 day)
   - Add new endpoint: `POST /api/generate-recipe-adk`
   - Add environment flag: `USE_ADK=true/false`
   - Update server.ts with conditional routing

5. **Web UI Testing** (0.5 day)
   - Test all 7 briefs via UI
   - Verify debug console displays ADK logs
   - Check for UI regressions

**Success Criteria:**
- ✅ All 7 test briefs pass with ADK
- ✅ Performance within 15% of current (acceptable overhead)
- ✅ Token usage within 10% of current
- ✅ Observability maintained
- ✅ Server integration works

---

### Phase 3: Cleanup & Documentation (2-3 days)

**Goals:**
- Remove redundant code
- Update documentation
- Prepare for production

**Tasks:**

1. **Code Cleanup** (1 day)
   - Remove old orchestrator.ts (or archive as orchestrator-legacy.ts)
   - Remove manual parallel execution code
   - Remove custom EventEmitter if ADK observability is sufficient
   - Clean up unused imports

2. **Configuration Updates** (0.5 day)
   - Update `config/agents.json` to ADK format (if needed)
   - Update `.env.example` with ADK-specific variables (if any)
   - Document new environment flags

3. **Documentation** (1 day)
   - Update `README.md` with ADK usage
   - Update `CLAUDE.md` with new architecture
   - Update `docs/SESSION_SUMMARY.md` with migration notes
   - Add ADK examples to docs/

4. **Testing Documentation** (0.5 day)
   - Document how to run tests with ADK
   - Update test brief descriptions with ADK-specific notes
   - Create troubleshooting guide for common ADK issues

**Success Criteria:**
- ✅ Old code removed/archived
- ✅ Documentation up-to-date
- ✅ Team can run and understand ADK implementation
- ✅ Troubleshooting guide available

---

## 8. Risk Assessment

### 8.1 Technical Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| **ADK is v0.1.0 (early release)** | High | Medium | Extensive POC in Phase 0; maintain fallback to current implementation |
| **Breaking API changes in future ADK versions** | Medium | Medium | Pin ADK version; monitor GitHub releases; plan upgrade cycles |
| **ADK performance overhead** | Low | Low | Benchmark in Phase 2; acceptable if <15% increase |
| **ADK documentation incomplete** | Medium | High | Leverage Python examples; engage with community; fallback to source code |
| **Session state complexity** | Low | Medium | Thorough testing; clear naming conventions for state keys |
| **Migration introduces bugs** | Medium | Medium | Parallel testing; keep current implementation as fallback for 1-2 months |

### 8.2 Operational Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| **Team learning curve** | Low | High | POC phase for hands-on learning; comprehensive documentation |
| **Migration timeline overrun** | Low | Medium | Phased approach allows stopping at any phase; realistic 3-week estimate |
| **Production deployment issues** | Medium | Low | Gradual rollout with feature flag; A/B testing in production |
| **Vertex AI lock-in** | Low | Low | ADK works standalone; Vertex AI integration is optional for future |

### 8.3 Business Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| **No immediate business value** | Low | Medium | Focus on long-term maintainability; 40-60% code reduction is valuable |
| **Opportunity cost** | Medium | Low | Migration is 2-3 weeks; blocking other features during this time |
| **Regression in user experience** | High | Low | Extensive testing; output should be identical; fallback available |

### 8.4 Risk Summary

**Overall Risk Level: MEDIUM-LOW**

**Rationale:**
- ADK is officially maintained by Google (reduces support risk)
- Current implementation remains as fallback (reduces production risk)
- Phased approach allows early detection of blockers (reduces technical risk)
- POC phase is low-cost way to validate feasibility (reduces investment risk)

**Recommendation:** Proceed with migration given:
1. Strong architectural fit (native parallel execution)
2. Long-term maintainability benefits (60%+ code reduction)
3. Alignment with Google's agent ecosystem (future integrations)
4. Low risk with proper fallback strategy

---

## 9. Next Steps

### Immediate Actions (Next 1-2 Days)

**Step 1: Stakeholder Review** (2 hours)
- Review this proposal with team
- Discuss concerns and questions
- Get approval to proceed with Phase 0 POC

**Step 2: Environment Setup** (1 hour)
- Install ADK: `npm install @google/adk`
- Create experiment branch: `git checkout -b experiment/adk-migration`
- Create POC directory: `mkdir src/orchestrator-adk`

**Step 3: Single Agent POC** (4 hours)
- Create `src/orchestrator-adk/poc-single-agent.ts`
- Build one LlmAgent (Boulanger)
- Test with brioche test brief
- Validate output structure and token tracking

**Step 4: Parallel Agent POC** (4 hours)
- Create `src/orchestrator-adk/poc-parallel.ts`
- Build ParallelAgent with 2 specialists
- Test with roast-chicken test brief
- Verify concurrent execution via timestamps

**Step 5: Go/No-Go Decision** (1 hour)
- Review POC results
- Assess ADK feasibility
- **DECISION POINT:**
  - ✅ **GO**: Proceed to Phase 1 (full migration)
  - ❌ **NO-GO**: Document findings, archive POC, keep current implementation

### Short-Term Actions (Week 1-2)

If POC is successful:

**Week 1: Core Migration**
- Complete Phase 1 tasks (agent factories, workflow agents)
- Daily progress check-ins
- Document any blockers or deviations

**Week 2: Testing & Validation**
- Complete Phase 2 tasks (integration testing, benchmarks)
- Compare outputs and performance
- Mid-week review meeting

### Medium-Term Actions (Week 3)

**Week 3: Finalization**
- Complete Phase 3 tasks (cleanup, documentation)
- Code review and team training
- Prepare for production rollout

**Production Rollout Plan:**
1. Deploy with feature flag: `USE_ADK=false` (current default)
2. Enable for 10% of requests: `USE_ADK=true` (A/B test)
3. Monitor for 1 week (errors, performance, cost)
4. Gradual rollout: 25% → 50% → 100%
5. Remove fallback after 1 month of stability

### Long-Term Enhancements (Post-Migration)

Once ADK migration is stable:

1. **Dynamic Specialist Selection** (Week 4-5)
   - Implement planning-driven specialist selection
   - 5-7x cost reduction for simple recipes

2. **ADK Web UI Integration** (Week 6)
   - Integrate ADK's built-in debugging UI
   - Replace custom debug console

3. **Hierarchical Specialists** (Week 7-8)
   - Group specialists by domain (Pastry Team, Grill Team, etc.)
   - Enable domain-level coordination

4. **Vertex AI Deployment** (Week 9-10)
   - Deploy to Vertex AI Agent Builder
   - Enable production scaling and monitoring

5. **A2A Protocol Integration** (Future)
   - Call external specialized agents
   - Nutrition calculator service
   - Meal planning agents

---

## 10. References

### Official Documentation

- **ADK Documentation**: https://google.github.io/adk-docs/
- **ADK GitHub (Python)**: https://github.com/google/adk-python
- **ADK GitHub (JavaScript)**: https://github.com/google/adk-js
- **ADK Samples**: https://github.com/google/adk-samples
- **Vertex AI Agent Builder**: https://cloud.google.com/vertex-ai/generative-ai/docs/agent-development-kit/quickstart

### Community Resources

- **Medium Tutorial**: "From Zero to Multi-Agents: A Beginner's Guide to TypeScript ADK" by Pontus Espe Wallentin
- **Blog Post**: "Build multi-agentic systems using Google ADK" (Google Cloud Blog)
- **GitHub Discussions**: https://github.com/google/adk-docs/discussions

### Our Documentation

- **Current Architecture**: `docs/culinary-advisor-multi-agent-prd.md`
- **Session Notes**: `docs/SESSION_SUMMARY.md`
- **Agent Config**: `config/agents.json`
- **Claude Guidance**: `CLAUDE.md`

### NPM Package

```bash
npm install @google/adk
```

**Current Version:** 0.1.0 (early access)
**Status:** Active development, not yet stable for production (as of Oct 2025)
**License:** Apache 2.0 (open source)

---

## Appendix A: ADK vs. Other Frameworks

### Comparison with Alternatives

| Framework | Parallel Execution | TypeScript Support | Google Integration | Code-First | Open Source |
|-----------|-------------------|-------------------|-------------------|-----------|-------------|
| **Google ADK** | ✅ Native ParallelAgent | ✅ Official | ✅ Vertex AI | ✅ | ✅ |
| **LangGraph** | ✅ Via parallel nodes | ✅ Community | ❌ | ✅ | ✅ |
| **CrewAI** | ✅ Via crew tasks | ⚠️ Limited | ❌ | ✅ | ✅ |
| **AutoGen** | ✅ Via group chat | ⚠️ Python-first | ❌ | ✅ | ✅ |
| **Custom (Current)** | ✅ Manual | ✅ Full control | ✅ Direct API | ✅ | ✅ |

**Why ADK for our use case:**
1. **Native Gemini integration**: We're already using Gemini exclusively
2. **TypeScript-first**: Official support, not community port
3. **Parallel execution**: Built-in ParallelAgent matches our Phase 2 pattern
4. **Vertex AI path**: Future production scaling without refactor
5. **Code-first**: No YAML configs, pure TypeScript (matches our philosophy)

---

## Appendix B: Cost Analysis

### Current Token Usage (Thanksgiving Menu Example)

| Phase | Agent | Tokens | Cost |
|-------|-------|--------|------|
| Planning | Sous Chef | 1,180 | $0.00107 |
| Specialists (7) | Various | 17,500 | $0.00594 |
| Synthesis | Sous Chef | 8,523 | $0.01199 |
| **Total** | | **27,203** | **$0.01900** |

### With ADK (Same Workflow)

| Phase | Agent | Tokens | Cost | Difference |
|-------|-------|--------|------|------------|
| Planning | Sous Chef | 1,180 | $0.00107 | ~0% |
| Specialists (7) | Various | 17,500 | $0.00594 | ~0% |
| Synthesis | Sous Chef | 8,523 | $0.01199 | ~0% |
| **Total** | | **27,203** | **$0.01900** | **~0%** |

**Conclusion: No cost increase from ADK framework itself.**

### With ADK + Dynamic Selection (Simple Recipe)

| Phase | Agent | Tokens (Current) | Tokens (Dynamic) | Savings |
|-------|-------|-----------------|------------------|---------|
| Planning | Sous Chef | 1,180 | 1,180 | 0% |
| Specialists | 7 agents | 17,500 | **2,500** (1 agent) | **86%** |
| Synthesis | Sous Chef | 8,523 | 8,523 | 0% |
| **Total** | | 27,203 | **12,203** | **55%** |

**Future enhancement:** Dynamic specialist selection could reduce costs by 50-85% for simple recipes.

---

## Appendix C: Performance Benchmarks (Projected)

### Current Implementation

| Test Brief | Complexity | Specialists | Time (s) | Tokens | Cost |
|------------|-----------|-------------|----------|--------|------|
| Brioche | Simple | 1 | 12 | 5,200 | $0.005 |
| Roast Chicken | Moderate | 3 | 18 | 12,400 | $0.011 |
| Thanksgiving | Complex | 7 | 22 | 27,203 | $0.019 |

### With ADK (Estimated)

| Test Brief | Complexity | Specialists | Time (s) | Overhead | Tokens | Cost |
|------------|-----------|-------------|----------|----------|--------|------|
| Brioche | Simple | 1 | 12.5 | +4% | 5,200 | $0.005 |
| Roast Chicken | Moderate | 3 | 18.8 | +4% | 12,400 | $0.011 |
| Thanksgiving | Complex | 7 | 23.3 | +6% | 27,203 | $0.019 |

**Conclusion: 4-6% time overhead acceptable for 60% code reduction.**

---

## Appendix D: Migration Checklist

### Pre-Migration

- [ ] Team review and approval of this proposal
- [ ] Create experiment branch: `experiment/adk-migration`
- [ ] Install ADK: `npm install @google/adk`
- [ ] Set up ADK environment (API keys, config)

### Phase 0: POC

- [ ] Single agent POC (Boulanger)
- [ ] Parallel agent POC (2 specialists)
- [ ] Sequential agent POC (3-phase workflow)
- [ ] Document POC findings
- [ ] Go/No-Go decision meeting

### Phase 1: Core Migration

- [ ] Agent factory functions created
- [ ] All 9 specialists migrated to LlmAgent
- [ ] ParallelAgent configured for Phase 2
- [ ] SequentialAgent configured for 3-phase workflow
- [ ] Token tracking implemented
- [ ] Error handling implemented
- [ ] New entry point created: `orchestrator-adk.ts`

### Phase 2: Testing

- [ ] All 7 test briefs pass with ADK
- [ ] Performance benchmarks completed
- [ ] Token usage comparison completed
- [ ] Observability validated
- [ ] Server integration completed
- [ ] Web UI testing completed

### Phase 3: Cleanup

- [ ] Old code removed/archived
- [ ] Documentation updated (README, CLAUDE.md, etc.)
- [ ] Configuration files updated
- [ ] Team training completed
- [ ] Troubleshooting guide created

### Production Rollout

- [ ] Feature flag implemented
- [ ] A/B testing configured (10% ADK, 90% current)
- [ ] Monitoring dashboard set up
- [ ] Week 1: Monitor at 10%
- [ ] Week 2: Increase to 25%
- [ ] Week 3: Increase to 50%
- [ ] Week 4: Increase to 100%
- [ ] Week 8: Remove fallback code

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-20 | Claude Code | Initial migration proposal |

---

**End of Proposal**
