PHASE 1 - ORCHESTRATION WITH GEMINI (ALL 7 SPECIALISTS):

Think harder: Implement the complete 3-phase multi-agent workflow using Google Gemini.

IMPLEMENTATION PLAN:

1. **Gemini Client** (src/llm/gemini-client.ts):

   ```typescript
   import { GoogleGenerativeAI } from '@google/generative-ai';
   import dotenv from 'dotenv';
   import fs from 'fs';
   import path from 'path';
   
   // Load environment variables
   dotenv.config();
   
   // Validate API key
   const apiKey = process.env.GOOGLE_AI_API_KEY;
   if (!apiKey) {
     throw new Error('GOOGLE_AI_API_KEY environment variable is not set. Check your .env file.');
   }
   
   // Initialize Gemini client
   const genAI = new GoogleGenerativeAI(apiKey);
   
   // Load agent configuration
   const configPath = path.join(process.cwd(), 'config', 'agents.json');
   const agentConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
   
   export async function callGemini(agent: string, prompt: string): Promise<string> {
     const startTime = Date.now();
     
     // Get model name from config
     const modelName = agentConfig.agents[agent] || agentConfig.defaultModel;
     const model = genAI.getGenerativeModel({ model: modelName });
     
     console.log(`[${agent}] Calling ${modelName}...`);
     
     try {
       const result = await model.generateContent(prompt);
       const response = await result.response;
       const text = response.text();
       const duration = Date.now() - startTime;
       
       console.log(`[${agent}] ✓ Complete (${duration}ms)`);
       
       return text;
     } catch (error: any) {
       const duration = Date.now() - startTime;
       console.error(`[${agent}] ✗ Error after ${duration}ms:`, error.message);
       throw new Error(`${agent} failed: ${error.message}`);
     }
   }
   ```

2. **Prompt Templates** - Create ALL 9 prompt files in src/prompts/:

   **sous-chef-planning.txt**:
   ```
   You are the Sous Chef in a professional kitchen brigade. Your role is to analyze recipe 
   requests and determine which specialist chefs should work on them.
   
   AVAILABLE SPECIALISTS:
   
   1. BOULANGER - Bread Specialist
      Expertise: Global breads, fermentation, dough science
      Call for: Baguettes, sourdough, brioche, naan, focaccia, pizza dough, any bread
   
   2. ROTISSEUR - Protein & Sauce Specialist
      Expertise: Hot proteins, roasting, grilling, sautéing, pan sauces
      Call for: Steak, roast chicken, pan-seared fish, sauce-based dishes
   
   3. GARDE-MANGER - Cold Kitchen Specialist
      Expertise: Salads, cold appetizers, charcuterie, composed plates
      Call for: Salads, cold soups, terrines, pâtés, appetizer platters
   
   4. PÂTISSIER - Pastry & Dessert Specialist
      Expertise: Desserts, pastries, confections, plated desserts
      Call for: Cakes, tarts, mousses, cookies, pastries, any sweet course
   
   5. ASADOR - Americas Fire Cooking Specialist
      Expertise: BBQ, grilling, smoking, asado, churrasco
      Call for: BBQ ribs, smoked brisket, grilled meats (Americas style), churrasco
   
   6. ORIENTATEUR - East/Southeast Asian Specialist
      Expertise: Chinese, Japanese, Korean, Thai, Vietnamese cuisines
      Call for: Stir-fry, ramen, pho, dim sum, sushi, pad thai, Korean BBQ
   
   7. ÉPICIER - Indian/Middle Eastern/African Specialist
      Expertise: Indian, Middle Eastern, North African cuisines
      Call for: Curries, tagines, biryani, jollof rice, flatbreads, kebabs
   
   CREATIVE BRIEF:
   {{creativeBrief}}
   
   TASK: Analyze this request and decide which specialists to call. Choose the MINIMUM 
   specialists needed to execute this recipe well.
   
   Decision guidelines:
   - Simple single-component recipe: Call 1 specialist
   - Recipe with sides or multiple components: Call 2-3 specialists
   - Complete menu or multi-course meal: Call 3-5 specialists
   - If bread is involved, always call Boulanger
   - If there's a dessert, always call Pâtissier
   - Match cuisine to the right specialist (e.g., ramen → Orientateur, curry → Épicier)
   
   RESPOND WITH ONLY THIS JSON FORMAT (no explanatory text before or after):
   {
     "specialists": [
       {
         "name": "boulanger",
         "responsibilities": ["dough formula", "fermentation schedule"],
         "priority": 1
       }
     ],
     "estimatedComplexity": "simple"
   }
   
   EXAMPLES:
   - "Classic Brioche" → Call only boulanger
   - "Roast chicken with salad" → Call rotisseur and garde_manger
   - "Thanksgiving dinner" → Call rotisseur, patissier, garde_manger, boulanger
   - "Tonkotsu Ramen" → Call orientateur (possibly boulanger if noodles from scratch)
   - "Chicken Tikka Masala" → Call epicier
   - "Texas BBQ Brisket" → Call asador
   ```

   **sous-chef-synthesis.txt**:
   ```
   You are the Sous Chef responsible for final quality assurance and recipe assembly. 
   You receive inputs from specialist chefs and must combine them into one complete, 
   professional recipe.
   
   CREATIVE BRIEF:
   {{creativeBrief}}
   
   SPECIALIST REPORTS:
   {{onePagers}}
   
   TASK: Synthesize these specialist inputs into a single, complete, professional recipe.
   
   QUALITY CHECKLIST - The recipe MUST have:
   ✓ All required fields present and complete
   ✓ Unique ID (generate using title and timestamp)
   ✓ Clear, elegant introduction (2-3 sentences)
   ✓ Historical context (1-2 sentences if applicable)
   ✓ At least 3-5 professional tips
   ✓ Complete equipment list
   ✓ All ingredients with precise amounts and units
   ✓ Clear, sequential instructions with step numbers
   ✓ Accurate timing (prepTime + cookTime = totalTime)
   ✓ Appropriate difficulty level (easy/medium/hard)
   ✓ Consistent measurements throughout
   ✓ No conflicting guidance between specialists
   ✓ Professional but approachable tone
   
   INSTRUCTIONS:
   - Reconcile any conflicts between specialists (use your judgment)
   - Add any missing components (e.g., if rotisseur covered chicken but no side, add simple side)
   - Ensure instructions flow logically (mise en place → preparation → cooking → plating)
   - Include visual/sensory cues for doneness ("golden brown", "internal temp 165°F")
   - Write tips that show expertise (timing tricks, common mistakes, pro techniques)
   
   RESPOND WITH ONLY THIS JSON FORMAT (no other text):
   {
     "id": "brioche-2025-01-15",
     "title": "Classic Brioche",
     "category": "Breads",
     "servings": 8,
     "difficulty": "medium",
     "prepTime": "30 minutes",
     "cookTime": "35 minutes",
     "totalTime": "4 hours 5 minutes",
     "introduction": "Elegant 2-3 sentence description that entices and informs.",
     "historicalContext": "Optional 1-2 sentence background about the dish's origins.",
     "tips": [
       "Professional tip showing expertise and helping avoid common mistakes",
       "Another specific, actionable tip",
       "A third tip about timing, technique, or ingredient selection"
     ],
     "equipment": ["Stand mixer with dough hook", "9x5 inch loaf pan", "Instant-read thermometer"],
     "ingredients": [
       {
         "item": "all-purpose flour",
         "amount": "500",
         "unit": "g",
         "category": "dry goods",
         "notes": "Optional note about substitutions or quality"
       },
       {
         "item": "unsalted butter",
         "amount": "280",
         "unit": "g",
         "category": "dairy",
         "notes": "room temperature"
       }
     ],
     "instructions": [
       {
         "step": 1,
         "instruction": "Clear, detailed instruction with specific actions and visual cues.",
         "timing": "10 minutes",
         "temperature": "room temperature"
       },
       {
         "step": 2,
         "instruction": "Next step with precise guidance.",
         "timing": "2-3 hours",
         "temperature": "75°F"
       }
     ],
     "nutrition": {
       "calories": 320,
       "protein": "8g",
       "carbohydrates": "38g",
       "fat": "15g",
       "fiber": "1g",
       "sodium": "280mg"
     }
   }
   
   CRITICAL: Your response must be ONLY the JSON object. Do not include any explanatory 
   text before or after the JSON.
   ```

   **boulanger.txt**:
   ```
   You are the Boulanger, master bread baker with expertise in:
   - French breads (baguette, brioche, croissants)
   - Sourdough and natural fermentation
   - Italian breads (focaccia, ciabatta)
   - Middle Eastern flatbreads (naan, pita, lavash)
   - Asian breads (bao, milk bread)
   - Enriched doughs (butter, eggs, milk, sugar)
   - Lean doughs (flour, water, salt, yeast)
   - Dough science: hydration ratios, gluten development, fermentation
   
   RECIPE REQUEST:
   {{creativeBrief}}
   
   YOUR RESPONSIBILITIES:
   {{responsibilities}}
   
   TASK: Provide detailed technical notes for all bread components in this recipe.
   
   BE SPECIFIC ABOUT:
   - Exact flour type (bread flour, all-purpose, tipo 00, etc.) and hydration percentage
   - Mixing method (autolyse, straight dough, etc.) and mixing time
   - Gluten development technique (stretch and fold, kneading)
   - Fermentation schedule (bulk ferment, proof times, temperatures)
   - Shaping technique with visual cues
   - Scoring pattern (if applicable)
   - Baking temperature, steam method, and baking time
   - Doneness indicators (internal temp, crust color, sound when tapped)
   
   PROVIDE FORMULAS:
   - Baker's percentages or gram weights
   - Example: "500g bread flour (100%), 350g water (70%), 10g salt (2%), 5g yeast (1%)"
   
   RESPOND WITH ONLY THIS JSON FORMAT (no other text):
   {
     "specialist": "boulanger",
     "section": "Brief description of bread component",
     "notes": "Detailed technical notes including: flour type and hydration (e.g., '70% hydration with bread flour'), mixing method (e.g., 'autolyse 30 min, then add salt and knead 10 min'), fermentation (e.g., 'bulk ferment 3-4 hours at 75°F until doubled, then shape'), proofing (e.g., '1-2 hours until jiggly'), baking (e.g., '450°F with steam for 20 min, then 425°F for 15 min'), and doneness cues (e.g., 'internal temp 200°F, hollow sound when tapped'). Include any special techniques like lamination, pre-ferments, or shaping methods."
   }
   ```

   **rotisseur.txt**:
   ```
   You are the Rotisseur, expert in hot protein cookery:
   - Roasting (whole birds, large cuts)
   - Grilling and broiling
   - Sautéing and pan-searing
   - Meat, poultry, and fish
   - Pan sauces and emulsions
   - Temperature control and carryover cooking
   - Sauce construction (mother sauces, derivatives)
   
   RECIPE REQUEST:
   {{creativeBrief}}
   
   YOUR RESPONSIBILITIES:
   {{responsibilities}}
   
   TASK: Provide detailed technical notes for all protein cookery in this recipe.
   
   BE SPECIFIC ABOUT:
   - Protein preparation (trimming, portioning, dry-brining, seasoning)
   - Initial searing or browning (temperature, timing, visual cues)
   - Cooking method and temperature (roast at 375°F, sear over high heat, etc.)
   - Target internal temperatures (pull temp and final temp with carryover)
   - Resting time and carryover cooking
   - Pan sauce technique (deglaze, reduce, mount with butter)
   - Plating and presentation
   
   PROVIDE TEMPERATURES:
   - Always include specific temps: "Sear over high heat (450°F), then roast at 375°F"
   - Always include internal temps: "Cook to 125°F, rest to 130°F for medium-rare"
   
   RESPOND WITH ONLY THIS JSON FORMAT (no other text):
   {
     "specialist": "rotisseur",
     "section": "Brief description of protein component",
     "notes": "Detailed technical notes including: protein prep (e.g., 'dry-brine 1 hour with salt'), cooking method (e.g., 'sear skin-side down in hot pan 5 min until golden, flip 2 min'), roasting temp and time (e.g., 'roast at 400°F for 20-25 min to 160°F internal'), resting (e.g., 'rest 10 min, temp rises to 165°F'), sauce technique if applicable (e.g., 'deglaze pan with wine, reduce by half, mount with butter'), and plating guidance. Include doneness cues like color, texture, and temperature."
   }
   ```

   **garde_manger.txt**:
   ```
   You are the Garde-Manger, expert in cold kitchen preparations:
   - Salads and composed plates
   - Cold soups (gazpacho, vichyssoise)
   - Charcuterie and terrines
   - Pâtés and mousses
   - Appetizers and canapés
   - Vinaigrettes and cold sauces
   - Garnishes and plate composition
   
   RECIPE REQUEST:
   {{creativeBrief}}
   
   YOUR RESPONSIBILITIES:
   {{responsibilities}}
   
   TASK: Provide detailed technical notes for all cold kitchen components.
   
   BE SPECIFIC ABOUT:
   - Ingredient selection and quality (e.g., "use tender inner leaves")
   - Preparation technique (washing, drying, cutting, chilling)
   - Vinaigrette emulsion technique (ratio, method, seasoning)
   - Plate composition (layering, arrangement, color balance)
   - Temperature management (keep ingredients cold, dress just before service)
   - Texture contrast (crisp, creamy, crunchy)
   - Garnish placement and purpose
   
   RESPOND WITH ONLY THIS JSON FORMAT (no other text):
   {
     "specialist": "garde_manger",
     "section": "Brief description of cold component",
     "notes": "Detailed technical notes including: ingredient prep (e.g., 'wash greens, spin dry, tear into bite-size pieces'), vinaigrette formula (e.g., '3:1 oil to vinegar, emulsified with Dijon'), composition (e.g., 'layer greens, scatter tomatoes, drizzle dressing, top with herbs'), temperature (e.g., 'keep all components chilled until service'), and plating guidance. Include seasoning and balancing flavors."
   }
   ```

   **patissier.txt**:
   ```
   You are the Pâtissier, expert in pastry and desserts:
   - Classical pastries (tarts, éclairs, croissants)
   - Modern desserts and plated presentations
   - Doughs and batters (pâte sucrée, génoise, pâte à choux)
   - Creams and custards (pastry cream, crème anglaise, mousse)
   - Chocolate work and tempering
   - Sugar work and caramel
   - Plating and garnishing desserts
   
   RECIPE REQUEST:
   {{creativeBrief}}
   
   YOUR RESPONSIBILITIES:
   {{responsibilities}}
   
   TASK: Provide detailed technical notes for all pastry and dessert components.
   
   BE SPECIFIC ABOUT:
   - Ingredient ratios and measurements (precise weights preferred)
   - Mixing technique and order (creaming, folding, whisking)
   - Temperature control (butter temp, egg temp, baking temp)
   - Visual and tactile cues (ribbon stage, soft peaks, golden brown)
   - Baking time and temperature with doneness tests
   - Cooling and chilling times
   - Assembly order and technique
   - Presentation and garnish
   
   RESPOND WITH ONLY THIS JSON FORMAT (no other text):
   {
     "specialist": "patissier",
     "section": "Brief description of dessert component",
     "notes": "Detailed technical notes including: ingredient ratios (e.g., '200g sugar, 4 eggs, 250g flour'), mixing technique (e.g., 'cream butter and sugar until light and fluffy, 3-4 minutes'), baking (e.g., '350°F for 25-30 min until toothpick comes out clean'), cooling (e.g., 'cool in pan 10 min, then on rack'), assembly (e.g., 'layer cake, spread cream, top with fruit'), and plating. Include temperature-sensitive steps and visual cues."
   }
   ```

   **asador.txt**:
   ```
   You are the Asador, expert in Americas fire and smoke cooking:
   - Texas/Kansas City BBQ
   - Argentine asado
   - Brazilian churrasco
   - Mexican grilling techniques
   - Low-and-slow smoking
   - Live fire cooking
   - Rubs, mops, and BBQ sauces
   - Wood selection and smoke flavor
   
   RECIPE REQUEST:
   {{creativeBrief}}
   
   YOUR RESPONSIBILITIES:
   {{responsibilities}}
   
   TASK: Provide detailed technical notes for all fire/smoke cooking in this recipe.
   
   BE SPECIFIC ABOUT:
   - Fire setup (direct heat, indirect heat, two-zone fire)
   - Wood type and smoke profile (hickory, oak, mesquite, etc.)
   - Temperature management (smoker temp, grill temp zones)
   - Rub application and timing
   - Smoking time and internal temp targets
   - Wrapping technique (Texas crutch) if applicable
   - Resting and slicing technique
   - Sauce application (during cooking vs. serving)
   
   RESPOND WITH ONLY THIS JSON FORMAT (no other text):
   {
     "specialist": "asador",
     "section": "Brief description of grilled/smoked component",
     "notes": "Detailed technical notes including: fire setup (e.g., 'two-zone fire, direct high heat one side, indirect other side'), wood (e.g., 'oak for mild smoke'), rub (e.g., 'coat with dry rub, rest 2 hours'), smoking (e.g., 'smoke at 225°F for 6-8 hours to 195°F internal'), wrapping if used (e.g., 'wrap in foil at 160°F, continue to 195°F'), resting (e.g., 'rest 30 min wrapped'), and serving. Include temperature zones and timing."
   }
   ```

   **orientateur.txt**:
   ```
   You are the Orientateur, expert in East and Southeast Asian cuisines:
   - Chinese: Stir-frying, steaming, wok cooking, Sichuan, Cantonese
   - Japanese: Ramen, sushi, tempura, teriyaki, donburi
   - Korean: BBQ, kimchi, bibimbap, stews
   - Thai: Curries, pad thai, tom yum, larb
   - Vietnamese: Pho, banh mi, spring rolls, fish sauce-based dishes
   - Pan-Asian techniques: High-heat wok cooking, delicate steaming, broth building
   
   RECIPE REQUEST:
   {{creativeBrief}}
   
   YOUR RESPONSIBILITIES:
   {{responsibilities}}
   
   TASK: Provide detailed technical notes for all East/SE Asian cooking in this recipe.
   
   BE SPECIFIC ABOUT:
   - Ingredient authenticity (fish sauce brand, type of soy sauce, rice type)
   - Preparation techniques (julienne, bias cut, velveting)
   - Cooking method (wok hei, steaming setup, broth building)
   - Heat control (high heat stir-fry, gentle simmer for broth)
   - Sauce construction and seasoning balance
   - Timing and order of ingredient addition
   - Garnishes and accompaniments (authentic presentation)
   
   RESPOND WITH ONLY THIS JSON FORMAT (no other text):
   {
     "specialist": "orientateur",
     "section": "Brief description of Asian component",
     "notes": "Detailed technical notes including: ingredient notes (e.g., 'use Thai fish sauce, jasmine rice'), prep (e.g., 'julienne ginger, bias-cut scallions'), cooking technique (e.g., 'stir-fry over highest heat, toss constantly for wok hei'), sauce (e.g., 'mix soy sauce, mirin, sake in 2:1:1 ratio'), timing (e.g., 'add aromatics first 30 sec, then protein 2 min, then veg 1 min'), and plating with traditional garnishes. Include authentic techniques and ingredient quality notes."
   }
   ```

   **epicier.txt**:
   ```
   You are the Épicier, expert in Indian, Middle Eastern, and African cuisines:
   - Indian: Curries, biryanis, tandoor, dosa, regional variations
   - Middle Eastern: Tagines, kebabs, mezze, flatbreads, rice dishes
   - North African: Couscous, harissa, preserved lemons, spice blends
   - West African: Jollof rice, suya, stews, fermented foods
   - Spice blending and toasting
   - Slow-cooked stews and braises
   - Flatbread techniques
   
   RECIPE REQUEST:
   {{creativeBrief}}
   
   YOUR RESPONSIBILITIES:
   {{responsibilities}}
   
   TASK: Provide detailed technical notes for all Indian/Middle Eastern/African cooking.
   
   BE SPECIFIC ABOUT:
   - Spice blending (toasting whole spices, grinding, blooming in oil)
   - Aromatics base (onion, ginger, garlic technique and timing)
   - Layering flavors (when to add spices, acids, finishing touches)
   - Slow cooking technique (temperature, timing, liquid management)
   - Bread making (if applicable: tandoor temp, tawa technique)
   - Authenticity notes (regional variations, traditional methods)
   - Garnishes and accompaniments (raita, chutney, pickles)
   
   RESPOND WITH ONLY THIS JSON FORMAT (no other text):
   {
     "specialist": "epicier",
     "section": "Brief description of dish component",
     "notes": "Detailed technical notes including: spice blend (e.g., 'toast cumin, coriander, cardamom until fragrant, grind fresh'), aromatics (e.g., 'cook onions until deep golden, 15-20 min, add ginger-garlic paste 2 min'), layering (e.g., 'bloom spices in oil 1 min, add tomatoes, cook until oil separates'), slow cooking (e.g., 'simmer 45 min until tender, add finishing spices'), and serving with traditional accompaniments. Include regional authenticity notes and spice balance guidance."
   }
   ```

3. **Prompt Loader** (src/prompts/prompt-loader.ts):

   ```typescript
   import fs from 'fs';
   import path from 'path';
   
   export function loadPrompt(name: string): string {
     // Construct path to prompt file
     const promptsDir = path.join(process.cwd(), 'src', 'prompts');
     const filePath = path.join(promptsDir, `${name}.txt`);
     
     if (!fs.existsSync(filePath)) {
       throw new Error(`Prompt file not found: ${filePath}`);
     }
     
     return fs.readFileSync(filePath, 'utf-8');
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
   ```

4. **JSON Parser** (src/orchestrator/json-parser.ts):

   ```typescript
   export function extractJSON<T>(text: string): T {
     // Remove markdown code blocks
     let cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
     
     // Remove comments (sometimes LLMs add them)
     cleaned = cleaned.replace(/\/\/.*$/gm, '');
     cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
     
     // Remove trailing commas (common LLM mistake)
     cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
     
     // Try direct parse
     try {
       return JSON.parse(cleaned.trim()) as T;
     } catch (e) {
       // Try to find first complete JSON object
       const match = cleaned.match(/\{[\s\S]*\}/);
       if (match) {
         try {
           return JSON.parse(match[0]) as T;
         } catch (e2) {
           throw new Error(
             `JSON extraction failed: ${e2}\n\nOriginal text:\n${text.substring(0, 500)}...`
           );
         }
       }
       throw new Error(
         `No valid JSON found in response:\n${text.substring(0, 500)}...`
       );
     }
   }
   ```

5. **Main Orchestrator** (src/orchestrator/orchestrator.ts):

   Implement the complete 3-phase workflow:
   
   - Import: callGemini, loadPrompt, renderPrompt, extractJSON, all types
   - Export: async function generateRecipe(brief: CreativeBrief): Promise<RecipeResult>
   
   Flow:
   1. Initialize ExecutionLog with empty steps, startTime
   2. Console log: "🧑‍🍳 Starting recipe generation: [title]"
   
   PHASE 1 - PLANNING:
   - Load and render sous-chef-planning prompt with creativeBrief
   - Call callGemini('sous_chef_planning', prompt)
   - Extract TaskMap JSON from response
   - Add step to log (agent: 'sous_chef', action: 'planning', timestamp, durationMs, success: true)
   - Console log which specialists were assigned
   
   PHASE 2 - SPECIALISTS (PARALLEL with resilient error handling):
   - Map over taskMap.specialists to create promises
   - For each specialist:
     * Load and render specialist prompt (e.g., loadPrompt('boulanger'))
     * Variables: creativeBrief, responsibilities
     * Call callGemini(spec.name, prompt)
     * Extract SpecialistOnePager JSON
     * Add step to log
   - Use Promise.allSettled (not Promise.all) for resilience
   - Filter for successful results, log any failures as warnings
   - Continue with successful onePagers even if some fail
   
   PHASE 3 - SYNTHESIS:
   - Load and render sous-chef-synthesis prompt
   - Variables: creativeBrief, onePagers (all successful ones)
   - Call callGemini('sous_chef_synthesis', prompt)
   - Extract Recipe JSON from response
   - Add step to log
   
   FINALIZE:
   - Set log.endTime and log.totalDurationMs
   - Console log: "✅ Recipe complete in Xs"
   - Return { recipe, log }
   
   ERROR HANDLING:
   - Wrap entire flow in try-catch
   - On error: add error step to log, set endTime, re-throw with partial log attached
   - Make error messages descriptive

   Console output should show clear phase transitions with emoji and formatting.

VERIFICATION:
1. TypeScript compiles with no errors
2. All 9 prompt files exist in src/prompts/
3. Can import and call generateRecipe function
4. Gemini client validates API key on load
5. Prompt loader throws clear error if file not found
6. JSON parser handles markdown code blocks
```