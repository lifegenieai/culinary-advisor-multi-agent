PHASE 2 - TEST HARNESS & INTEGRATION:

Create Express server and test infrastructure to validate the orchestration system.

1. **Express Server** (src/server.ts):

   ```typescript
   import express from 'express';
   import dotenv from 'dotenv';
   import { generateRecipe } from './orchestrator/orchestrator';
   import type { CreativeBrief } from './types';
   
   // Load environment variables
   dotenv.config();
   
   const app = express();
   app.use(express.json());
   app.use(express.static('public'));
   
   app.post('/api/generate-recipe', async (req, res) => {
     try {
       const brief: CreativeBrief = req.body;
       
       // Validate required fields
       if (!brief.title || !brief.scope || !brief.creativeFocus) {
         return res.status(400).json({ 
           error: 'Missing required fields: title, scope, and creativeFocus are required' 
         });
       }
       
       console.log('\n🍳 New recipe request:', brief.title);
       
       const result = await generateRecipe(brief);
       
       res.json(result);
     } catch (error: any) {
       console.error('❌ Generation error:', error.message);
       res.status(500).json({ 
         error: error.message,
         stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
       });
     }
   });
   
   app.get('/api/health', (req, res) => {
     res.json({ status: 'ok', timestamp: new Date().toISOString() });
   });
   
   const PORT = process.env.PORT || 3000;
   app.listen(PORT, () => {
     console.log('═══════════════════════════════════════');
     console.log('🚀 Recipe Orchestrator Server');
     console.log(`📡 Server running at http://localhost:${PORT}`);
     console.log('═══════════════════════════════════════\n');
   });
   ```

2. **Test UI** (public/index.html):

   Create a clean, functional single-page interface:
   
   Features:
   - Dropdown to select from predefined test briefs
   - JSON editor (textarea) to view/edit the brief
   - "Generate Recipe" button
   - Loading indicator while generating
   - Two display sections:
     * Recipe output (pretty-printed JSON, collapsible sections)
     * Execution log (formatted steps with timing)
   - "Copy Recipe JSON" button
   - Error display if generation fails
   
   Style:
   - Clean, minimal CSS (no framework needed)
   - Monospace font for JSON
   - Color coding: success (green), error (red), info (blue)
   - Responsive layout
   
   JavaScript:
   - Use fetch API to call /api/generate-recipe
   - Pretty-print JSON with syntax highlighting (simple color coding)
   - Show loading state during generation
   - Display errors clearly with error message and partial log if available

3. **Sample Test Briefs** - Create these complete JSON files in test-briefs/:

   **simple-brioche.json**:
   ```json
   {
     "title": "Classic Brioche",
     "scope": "single_recipe",
     "constraints": {
       "dietary": [],
       "skill": "intermediate",
       "time": "4 hours",
       "servings": 8
     },
     "creativeFocus": "traditional",
     "additionalContext": ""
   }
   ```

   **moderate-chicken.json**:
   ```json
   {
     "title": "Roast Chicken Dinner",
     "scope": "single_recipe",
     "constraints": {
       "skill": "intermediate",
       "servings": 4
     },
     "creativeFocus": "traditional",
     "additionalContext": "Include a simple side salad with vinaigrette"
   }
   ```

   **complex-menu.json**:
   ```json
   {
     "title": "Thanksgiving Dinner Menu",
     "scope": "menu",
     "constraints": {
       "skill": "advanced",
       "servings": 8
     },
     "creativeFocus": "traditional",
     "additionalContext": "Roast turkey, stuffing, cranberry sauce, sides, and pumpkin pie"
   }
   ```

   **fusion-ramen.json**:
   ```json
   {
     "title": "Tonkotsu Ramen",
     "scope": "single_recipe",
     "constraints": {
       "skill": "advanced",
       "time": "8 hours",
       "servings": 4
     },
     "creativeFocus": "traditional",
     "additionalContext": "Rich pork bone broth with fresh noodles"
   }
   ```

   **bbq-brisket.json**:
   ```json
   {
     "title": "Texas-Style Smoked Brisket",
     "scope": "single_recipe",
     "constraints": {
       "skill": "advanced",
       "time": "12 hours",
       "servings": 8,
       "equipment": ["smoker"]
     },
     "creativeFocus": "traditional",
     "additionalContext": "Low and slow Texas BBQ style"
   }
   ```

   **curry.json**:
   ```json
   {
     "title": "Chicken Tikka Masala",
     "scope": "single_recipe",
     "constraints": {
       "skill": "intermediate",
       "servings": 4
     },
     "creativeFocus": "traditional",
     "additionalContext": "Serve with basmati rice and naan"
   }
   ```

   **pad-thai.json**:
   ```json
   {
     "title": "Authentic Pad Thai",
     "scope": "single_recipe",
     "constraints": {
       "skill": "intermediate",
       "servings": 2
     },
     "creativeFocus": "traditional",
     "additionalContext": "Street food style with tamarind sauce"
   }
   ```

4. **Testing Process**:

   After implementation:
   a. Start server: npm run dev
   b. Open http://localhost:3000
   c. Test each brief in this order:
      1. simple-brioche.json (tests Boulanger specialist)
      2. moderate-chicken.json (tests Rotisseur + Garde-Manger parallel)
      3. fusion-ramen.json (tests Orientateur specialist)
      4. curry.json (tests Épicier specialist)
      5. bbq-brisket.json (tests Asador specialist)
      6. complex-menu.json (tests 4+ specialists in parallel)
   
   For each test, verify:
   - ✓ Correct specialists are assigned in Phase 1
   - ✓ Specialists run in parallel (check timestamps overlap)
   - ✓ Recipe has all required fields
   - ✓ Ingredients have amounts and units
   - ✓ Instructions are sequential with step numbers
   - ✓ No JSON parsing errors
   - ✓ Execution log shows all phases with timing

5. **Quality Validation**:

   For each generated recipe, check:
   - Structure: All Recipe interface fields present
   - Ingredients: Precise amounts (not "some" or "a bit")
   - Instructions: Specific guidance with temps/timing
   - Tips: Professional and actionable (not generic)
   - Consistency: No contradictions between sections
   
   If issues found:
   - Note the pattern (e.g., "Rotisseur gives vague temps")
   - Identify which prompt needs refinement
   - Update prompt to be more explicit
   - Re-test to confirm improvement

6. **Documentation**:

   Update README.md with:
   - Performance data: "Typical generation time: 10-30 seconds"
   - Test results: "Tested with 7 different cuisines/specialists"
   - Example output: Include one complete recipe JSON
   - Known limitations: "Nutritional info is estimated"
   - Troubleshooting:
     * "API key not set" → check .env file
     * "JSON parsing errors" → prompts may need refinement
     * "Specialist not found" → check prompt file exists

SUCCESS CRITERIA:
- Server runs without crashes
- UI successfully displays all test briefs
- At least 5 of 7 test briefs generate complete, valid recipes
- All 7 specialists can be called successfully
- Parallel execution works (overlapping timestamps in log)
- Generated recipes are structurally complete JSON
- Execution logs provide useful debugging information
- Console output is clean and informative

Continue testing and iterating on prompts until quality is consistently good.
```

---

## Validation Checklist (Add to Guide)

### After Phase 0:
- [ ] `npm install` completes without errors
- [ ] `npm run build` compiles successfully
- [ ] All directories exist: src/{orchestrator,llm,prompts,types}, config, test-briefs, public
- [ ] .env file exists with GOOGLE_AI_API_KEY set
- [ ] src/types/index.ts exports all interfaces (CreativeBrief, Recipe, Ingredient, Instruction, NutritionInfo, RecipeResult, TaskMap, SpecialistOnePager, ExecutionLog, ExecutionStep)
- [ ] config/agents.json is valid JSON with all 9 agents

### After Phase 1:
- [ ] All 9 prompt files exist: sous-chef-planning.txt, sous-chef-synthesis.txt, boulanger.txt, rotisseur.txt, garde_manger.txt, patissier.txt, asador.txt, orientateur.txt, epicier.txt
- [ ] `npm run build` compiles with no errors
- [ ] Can import: `import { generateRecipe } from './src/orchestrator/orchestrator'`
- [ ] Gemini client validates API key on import (throws error if missing)
- [ ] Prompt loader can load a prompt: `loadPrompt('sous-chef-planning')`
- [ ] JSON parser handles code blocks: `extractJSON('```json\n{"test":1}\n```')`

### After Phase 2:
- [ ] Server starts on port 3000: `npm run dev`
- [ ] Can access http://localhost:3000 in browser
- [ ] UI displays 7 test briefs in dropdown
- [ ] simple-brioche generates valid recipe (calls Boulanger)
- [ ] moderate-chicken generates valid recipe (calls Rotisseur + Garde-Manger)
- [ ] fusion-ramen generates valid recipe (calls Orientateur)
- [ ] curry generates valid recipe (calls Épicier)
- [ ] bbq-brisket generates valid recipe (calls Asador)
- [ ] At least 5 of 7 briefs produce complete recipes
- [ ] No server crashes during generation
- [ ] Execution logs show all 3 phases with timing

---

## Summary of Fixes Applied

### High Priority Issues Fixed:

1. ✅ **PRD Dependency Removed**: All prompts are now self-contained with complete instructions
2. ✅ **Complete Type Definitions**: Added all missing interfaces (Ingredient, Instruction, NutritionInfo, RecipeResult)
3. ✅ **Detailed Specialist Prompts**: Provided complete, production-ready prompt templates for all 7 specialists with specific examples and formatting requirements
4. ✅ **All 7 Specialists Included**: Created complete prompts for boulanger, rotisseur, garde_manger, patissier, asador, orientateur, epicier
5. ✅ **Path Resolution Fixed**: Explicit path handling using process.cwd() and proper path.join()
6. ✅ **Complete Test Briefs**: All 7 test briefs have complete JSON with all required fields
7. ✅ **Environment Validation**: API key validation on Gemini client load
8. ✅ **Resilient Parallel Execution**: Using Promise.allSettled instead of Promise.all
9. ✅ **Enhanced JSON Parser**: Handles markdown, comments, trailing commas
10. ✅ **Explicit TypeScript Config**: Complete tsconfig.json with proper module resolution

