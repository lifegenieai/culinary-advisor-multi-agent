# ADK Migration - POC Quick Start Guide

**Goal:** Validate Google ADK feasibility with minimal risk in 1-2 days

---

## Prerequisites

- Node.js 18+
- Current project running successfully
- Access to Google AI API key (already configured)

---

## Step 1: Install ADK (5 minutes)

```bash
# In project root
npm install @google/adk

# Verify installation
npm list @google/adk
# Should show: @google/adk@0.1.0 (or later)
```

---

## Step 2: Create POC Directory (2 minutes)

```bash
mkdir -p src/orchestrator-adk
```

---

## Step 3: Single Agent POC (30 minutes)

Create `src/orchestrator-adk/poc-single-agent.ts`:

```typescript
import { LlmAgent } from '@google/adk';
import { loadPrompt, extractSystemInstruction } from '../prompts/prompt-loader';
import { CreativeBrief } from '../types';

export async function testSingleAgent() {
  console.log('🧪 Testing Single ADK Agent (Boulanger)\n');

  // Load Boulanger prompt
  const template = loadPrompt('boulanger');
  const { systemInstruction } = extractSystemInstruction(template);

  // Create LlmAgent
  const boulangerAgent = new LlmAgent({
    name: 'boulanger',
    model: 'gemini-2.5-flash',
    temperature: 0.35,
    instruction: systemInstruction,
    outputKey: 'boulanger_result',
  });

  // Create test brief
  const brief: CreativeBrief = {
    title: 'Classic French Brioche',
    scope: 'single_recipe',
    constraints: {
      skill: 'intermediate',
      time: '3 hours',
      servings: 8,
    },
    creativeFocus: 'traditional',
  };

  // Run agent
  const initialState = { creative_brief: brief };
  const startTime = Date.now();

  try {
    const result = await boulangerAgent.run(initialState);
    const duration = Date.now() - startTime;

    console.log(`✅ Success in ${duration}ms`);
    console.log(`\n📊 Session State:`, result.state);
    console.log(`\n🧑‍🍳 Boulanger Result:`, result.state['boulanger_result']);

    return result;
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  testSingleAgent()
    .then(() => console.log('\n✅ POC Complete'))
    .catch((err) => console.error('\n❌ POC Failed:', err));
}
```

**Run the test:**

```bash
npx tsx src/orchestrator-adk/poc-single-agent.ts
```

**Expected Output:**
- Agent executes successfully
- Session state contains `boulanger_result`
- Output is valid JSON with specialist one-pager structure
- Execution time ~5-10 seconds

**Success Criteria:**
- ✅ No errors
- ✅ Result appears in session state
- ✅ Output structure looks correct
- ✅ Timing is reasonable

---

## Step 4: Parallel Agent POC (1 hour)

Create `src/orchestrator-adk/poc-parallel.ts`:

```typescript
import { LlmAgent, ParallelAgent } from '@google/adk';
import { loadPrompt, extractSystemInstruction } from '../prompts/prompt-loader';
import { CreativeBrief } from '../types';

function createSpecialistAgent(name: string, temp: number): LlmAgent {
  const template = loadPrompt(name);
  const { systemInstruction } = extractSystemInstruction(template);

  return new LlmAgent({
    name,
    model: 'gemini-2.5-flash',
    temperature: temp,
    instruction: systemInstruction,
    outputKey: `specialist_${name}`,
  });
}

export async function testParallelAgents() {
  console.log('🧪 Testing Parallel ADK Agents\n');

  // Create 2 specialists
  const boulanger = createSpecialistAgent('boulanger', 0.35);
  const rotisseur = createSpecialistAgent('rotisseur', 0.55);

  // Wrap in ParallelAgent
  const parallelSpecialists = new ParallelAgent({
    name: 'parallel_specialists',
    subAgents: [boulanger, rotisseur],
  });

  // Create test brief (requires both specialists)
  const brief: CreativeBrief = {
    title: 'Roast Chicken with Bread Stuffing',
    scope: 'single_recipe',
    constraints: {
      skill: 'intermediate',
      time: '2 hours',
      servings: 4,
    },
    creativeFocus: 'traditional',
  };

  // Run parallel workflow
  const initialState = { creative_brief: brief };
  const startTime = Date.now();

  try {
    console.log('⏱️  Starting parallel execution...\n');

    const result = await parallelSpecialists.run(initialState);
    const duration = Date.now() - startTime;

    console.log(`✅ Parallel execution complete in ${duration}ms\n`);

    // Check that both results are in state
    const boulangerResult = result.state['specialist_boulanger'];
    const rotisseurResult = result.state['specialist_rotisseur'];

    console.log('📊 Results:');
    console.log(`  - Boulanger: ${boulangerResult ? '✅' : '❌'}`);
    console.log(`  - Rotisseur: ${rotisseurResult ? '✅' : '❌'}`);

    if (boulangerResult && rotisseurResult) {
      console.log('\n✅ Both agents completed successfully!');
    }

    return result;
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  testParallelAgents()
    .then(() => console.log('\n✅ Parallel POC Complete'))
    .catch((err) => console.error('\n❌ Parallel POC Failed:', err));
}
```

**Run the test:**

```bash
npx tsx src/orchestrator-adk/poc-parallel.ts
```

**Expected Output:**
- Both agents execute concurrently
- Execution time ~8-12 seconds (NOT 16-20s sequential)
- Both results appear in session state
- No errors or failures

**Success Criteria:**
- ✅ Execution time indicates parallelism (roughly single agent time, not 2x)
- ✅ Both results present in state
- ✅ State keys are distinct (`specialist_boulanger`, `specialist_rotisseur`)

---

## Step 5: Full Sequential POC (1-2 hours)

Create `src/orchestrator-adk/poc-sequential.ts`:

```typescript
import { LlmAgent, ParallelAgent, SequentialAgent } from '@google/adk';
import { loadPrompt, extractSystemInstruction } from '../prompts/prompt-loader';
import { CreativeBrief, Recipe } from '../types';

function createPlanningAgent(): LlmAgent {
  const template = loadPrompt('sous-chef-planning');
  const { systemInstruction } = extractSystemInstruction(template);

  return new LlmAgent({
    name: 'sous_chef_planning',
    model: 'gemini-2.5-flash',
    temperature: 0.3,
    instruction: systemInstruction,
    outputKey: 'task_map',
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
    outputKey: `specialist_${name}`,
  });
}

function createSynthesisAgent(): LlmAgent {
  const template = loadPrompt('sous-chef-synthesis');
  const { systemInstruction } = extractSystemInstruction(template);

  return new LlmAgent({
    name: 'sous_chef_synthesis',
    model: 'gemini-2.5-flash',
    temperature: 0.5,
    instruction: systemInstruction + '\n\nRead specialist results from session state.',
    outputKey: 'final_recipe',
  });
}

export async function testFullWorkflow() {
  console.log('🧪 Testing Full 3-Phase ADK Workflow\n');

  // Phase 1: Planning
  const planningAgent = createPlanningAgent();

  // Phase 2: Parallel Specialists (just 2 for POC)
  const specialists = [
    createSpecialistAgent('boulanger', 0.35),
    createSpecialistAgent('rotisseur', 0.55),
  ];
  const parallelSpecialists = new ParallelAgent({
    name: 'parallel_specialists',
    subAgents: specialists,
  });

  // Phase 3: Synthesis
  const synthesisAgent = createSynthesisAgent();

  // Root Sequential Agent
  const rootAgent = new SequentialAgent({
    name: 'recipe_orchestrator',
    subAgents: [
      planningAgent,
      parallelSpecialists,
      synthesisAgent,
    ],
  });

  // Test brief
  const brief: CreativeBrief = {
    title: 'Roast Chicken with Bread Stuffing',
    scope: 'single_recipe',
    constraints: {
      skill: 'intermediate',
      time: '2 hours',
      servings: 4,
    },
    creativeFocus: 'traditional',
  };

  // Run full workflow
  const initialState = { creative_brief: brief };
  const startTime = Date.now();

  try {
    console.log('⏱️  Phase 1: Planning...');
    console.log('⏱️  Phase 2: Parallel Specialists...');
    console.log('⏱️  Phase 3: Synthesis...\n');

    const result = await rootAgent.run(initialState);
    const duration = Date.now() - startTime;

    console.log(`✅ Full workflow complete in ${(duration / 1000).toFixed(1)}s\n`);

    // Check results
    const taskMap = result.state['task_map'];
    const boulangerResult = result.state['specialist_boulanger'];
    const rotisseurResult = result.state['specialist_rotisseur'];
    const finalRecipe = result.state['final_recipe'];

    console.log('📊 Phase Results:');
    console.log(`  - Planning (Task Map): ${taskMap ? '✅' : '❌'}`);
    console.log(`  - Boulanger: ${boulangerResult ? '✅' : '❌'}`);
    console.log(`  - Rotisseur: ${rotisseurResult ? '✅' : '❌'}`);
    console.log(`  - Synthesis (Recipe): ${finalRecipe ? '✅' : '❌'}`);

    if (finalRecipe) {
      const recipe = finalRecipe as Recipe;
      console.log(`\n📖 Recipe: "${recipe.title}"`);
      console.log(`   - Ingredients: ${recipe.ingredients.length}`);
      console.log(`   - Instructions: ${recipe.instructions.length}`);
      console.log(`   - Total Time: ${recipe.totalTime}`);
    }

    return { recipe: finalRecipe, sessionState: result.state };
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  testFullWorkflow()
    .then(() => console.log('\n✅ Full Sequential POC Complete!'))
    .catch((err) => console.error('\n❌ Full Sequential POC Failed:', err));
}
```

**Run the test:**

```bash
npx tsx src/orchestrator-adk/poc-sequential.ts
```

**Expected Output:**
- All 3 phases execute in sequence
- Planning completes first (~3-5s)
- Specialists run in parallel (~8-12s)
- Synthesis completes last (~5-8s)
- Total time ~20-25 seconds
- Final recipe is valid JSON

**Success Criteria:**
- ✅ All phases complete without errors
- ✅ Task Map produced by planning
- ✅ Specialist results in session state
- ✅ Final recipe matches Recipe type
- ✅ Total time comparable to current implementation

---

## Step 6: Validation Checklist

After running all 3 POCs, verify:

### Technical Validation

- [ ] Single agent POC succeeded
- [ ] Parallel agent POC showed true parallelism (not sequential)
- [ ] Sequential agent POC produced valid recipe
- [ ] Session state management works correctly
- [ ] Output structure matches our TypeScript types
- [ ] Error messages are clear and actionable

### Performance Validation

- [ ] Single agent: ~5-10 seconds
- [ ] Parallel (2 agents): ~8-12 seconds (not 2x single)
- [ ] Full workflow: ~20-25 seconds (comparable to current)
- [ ] No unexpected timeouts or delays

### Quality Validation

- [ ] Recipe output is well-structured
- [ ] All required fields present (ingredients, instructions, etc.)
- [ ] Specialist contributions are coherent
- [ ] No obvious quality regressions vs. current implementation

---

## Step 7: Go/No-Go Decision

### ✅ GO Criteria (Proceed to Full Migration)

All of the following must be true:
- POCs run successfully without critical errors
- Performance is within 20% of current implementation
- Output quality is acceptable
- Session state management is intuitive
- No major API limitations discovered
- Team comfortable with ADK concepts

### ❌ NO-GO Criteria (Stay with Current)

Any of the following:
- POCs consistently fail or error
- Performance is 30%+ slower than current
- Output quality significantly degraded
- ADK API too complex or poorly documented
- Major missing features (e.g., no token tracking)
- Team strongly prefers current approach

---

## Step 8: Document Findings

Create `docs/ADK_POC_RESULTS.md` with:

```markdown
# ADK POC Results

**Date:** [DATE]
**Tester:** [NAME]

## Summary

[Brief 2-3 sentence summary of POC outcome]

## Test Results

### Single Agent POC
- Status: ✅ / ❌
- Duration: [X]s
- Notes: [Any observations]

### Parallel Agent POC
- Status: ✅ / ❌
- Duration: [X]s (vs [X]s expected if sequential)
- Notes: [Any observations]

### Full Sequential POC
- Status: ✅ / ❌
- Duration: [X]s
- Recipe Quality: [Good / Acceptable / Poor]
- Notes: [Any observations]

## Performance Comparison

| Metric | Current | ADK POC | Difference |
|--------|---------|---------|------------|
| Single Agent | Xs | Xs | +X% |
| Parallel (2) | Xs | Xs | +X% |
| Full Workflow | Xs | Xs | +X% |

## Issues Encountered

1. [Issue 1]
   - Severity: High / Medium / Low
   - Workaround: [If found]

2. [Issue 2]
   - ...

## Recommendation

**Decision:** ✅ GO / ❌ NO-GO

**Rationale:** [2-3 sentences]

**Next Steps:** [If GO, list Phase 1 tasks]
```

---

## Troubleshooting

### Issue: "Cannot find module '@google/adk'"

**Solution:**
```bash
npm install @google/adk
# Restart TypeScript server in your editor
```

### Issue: "LlmAgent is not a constructor"

**Solution:** Check import syntax:
```typescript
// Correct
import { LlmAgent } from '@google/adk';

// Incorrect
import LlmAgent from '@google/adk';
```

### Issue: Agent hangs or times out

**Solution:**
- Check your `GOOGLE_AI_API_KEY` is valid
- Verify prompt is well-formed
- Try with a simpler test case first

### Issue: Session state is empty

**Solution:**
- Ensure `outputKey` is set on each agent
- Check agent actually completed (no errors)
- Inspect `result.state` with console.log

### Issue: Output doesn't match our types

**Solution:**
- ADK agents return raw LLM output
- You may need to parse JSON from state values
- Add Zod validation after extracting from state

---

## Next Steps After POC

### If ✅ GO Decision:

1. **Schedule Phase 1 kickoff meeting** (team alignment)
2. **Create migration branch:** `git checkout -b feature/adk-migration`
3. **Start Phase 1 tasks** (see full proposal)
4. **Daily standup check-ins** (track progress/blockers)

### If ❌ NO-GO Decision:

1. **Document reasons in ADK_POC_RESULTS.md**
2. **Archive POC code** (keep for future reference)
3. **Update migration proposal** with "Not Recommended" status
4. **Consider alternatives** (LangGraph, custom improvements, etc.)

---

## Time Investment Summary

- **Setup:** 10 minutes
- **Single Agent POC:** 30 minutes
- **Parallel Agent POC:** 1 hour
- **Full Sequential POC:** 1-2 hours
- **Documentation:** 30 minutes

**Total: 3-4 hours** to validate ADK feasibility

**ROI:** Low risk way to validate a 2-3 week migration that could save 40-60% code maintenance.

---

## Questions or Issues?

- Check official ADK docs: https://google.github.io/adk-docs/
- Review full migration proposal: `docs/ADK_MIGRATION_PROPOSAL.md`
- Create GitHub issue in `google/adk-docs` if ADK bug found

---

**Good luck with the POC! 🚀**
