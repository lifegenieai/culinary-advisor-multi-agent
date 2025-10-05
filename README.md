# Recipe Orchestrator POC

Multi-agent AI system that generates professional culinary recipes by orchestrating specialist chef agents, simulating the structure of a classical French kitchen brigade.

## Overview

This system transforms creative recipe requests into complete, professional recipes through a 3-phase workflow powered by AI agents with specialized culinary expertise.

**Core Concept:** Instead of a single AI generating recipes, this system delegates work to specialist "chef" agents (Boulanger, Rotisseur, Pâtissier, etc.), each focused on their domain of expertise, then synthesizes their contributions into a cohesive final recipe.

## Architecture

### Three-Phase Workflow

```
┌─────────────────────────────────────────────────────────────┐
│ PHASE 1: PLANNING                                           │
│ Sous Chef analyzes creative brief → Task Map                │
│ (Determines which specialists are needed)                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 2: SPECIALIST CONTRIBUTIONS (Parallel Execution)      │
│ Assigned specialists develop their sections → One-Pagers    │
│ (Each specialist provides domain-specific guidance)         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 3: SYNTHESIS                                          │
│ Sous Chef reconciles all inputs → Complete Recipe JSON      │
│ (Harmonizes contributions into final structured recipe)     │
└─────────────────────────────────────────────────────────────┘
```

### Available Specialists

- **Boulanger** (Baker): Breads, doughs, fermentation techniques
- **Rotisseur** (Roast Chef): Hot proteins, roasting, classic sauces
- **Garde-Manger** (Pantry Chef): Cold preparations, salads, charcuterie
- **Pâtissier** (Pastry Chef): Desserts, pastries, sweet preparations
- **Asador** (Grill Chef): Americas-focused fire and smoke cooking
- **Orientateur** (Eastern Chef): East and Southeast Asian cuisines
- **Épicier** (Spice Chef): Indian, Middle Eastern, and African cuisines

### Agent Orchestration

- **Sous Chef (Planning)**: Analyzes creative brief, assigns specialists based on recipe requirements
- **Sous Chef (Synthesis)**: Integrates specialist contributions, ensures recipe coherence and completeness
- **Specialists**: Work independently in parallel during Phase 2 (critical for performance)

## Quick Start

### Prerequisites

- Node.js 18+
- Google AI API key ([Get one here](https://ai.google.dev/))

### Installation

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and add your Google AI API key
```

### Running the POC

```bash
# Development mode (auto-reload on changes)
npm run dev

# Production mode
npm start

# Build TypeScript
npm run build
```

### Testing the System

1. **Main UI**: Start the server and open http://localhost:3000
   - Submit creative briefs via the web UI
   - View generated recipes and execution logs

2. **Debug Console** 🔬 (Development Only): Open http://localhost:3000/debug.html
   - Real-time event streaming during recipe generation
   - View LLM prompts, responses, and token usage
   - Monitor parallel specialist execution
   - Three pre-loaded test scenarios: Brioche, Roast Chicken, Thanksgiving Menu

## API Reference

### POST /api/generate-recipe

Generate a recipe from a creative brief.

### POST /api/generate-recipe-debug

**Development only**: Initiates a debug session with real-time event streaming.

**Response:**
```json
{
  "requestId": "req_1234567890_abc123",
  "debugUrl": "/api/debug/stream/req_1234567890_abc123"
}
```

Connect to `debugUrl` with EventSource to receive real-time events during recipe generation.

### GET /api/debug/stream/:requestId

**Development only**: Server-Sent Events (SSE) endpoint for streaming orchestration events.

**Event Types:**
- `phase:start` / `phase:complete` - Phase transitions
- `llm:request` / `llm:response` - LLM interactions with full prompts and responses
- `data:parsed` - Successful JSON parsing
- `agent:error` - Agent failures
- `recipe:complete` / `recipe:error` - Final outcomes

**Request Body:**
```json
{
  "title": "Classic French Baguette",
  "scope": "single_recipe",
  "constraints": {
    "dietary": [],
    "equipment": ["oven", "dutch oven"],
    "skill": "intermediate",
    "time": "4 hours",
    "servings": 2
  },
  "creativeFocus": "traditional",
  "additionalContext": "Focus on authentic technique"
}
```

**Response:**
```json
{
  "recipe": {
    "id": "recipe_123",
    "title": "Classic French Baguette",
    "category": "Bread",
    "servings": 2,
    "difficulty": "medium",
    "prepTime": "30 minutes",
    "cookTime": "25 minutes",
    "totalTime": "4 hours",
    "introduction": "...",
    "tips": ["...", "..."],
    "equipment": ["...", "..."],
    "ingredients": [...],
    "instructions": [...],
    "nutrition": {...}
  },
  "log": {
    "steps": [
      {
        "agent": "sous_chef_planning",
        "action": "analyze_brief",
        "timestamp": "2025-10-04T12:00:00.000Z",
        "durationMs": 1234,
        "success": true
      },
      ...
    ],
    "startTime": "2025-10-04T12:00:00.000Z",
    "endTime": "2025-10-04T12:01:30.000Z",
    "totalDurationMs": 90000
  }
}
```

## Project Structure

```
recipe-orchestrator-poc/
├── src/
│   ├── orchestrator/       # Core workflow logic (Phase 1, 2, 3)
│   ├── llm/               # Gemini API wrapper & model routing
│   ├── prompts/           # Agent system prompts (.txt files)
│   ├── types/             # TypeScript type definitions
│   │   ├── debug-events.ts    # Debug event type definitions
│   │   └── validation.ts      # Zod schemas
│   ├── server.ts          # Express API server
│   └── server-debug.ts    # Debug SSE endpoints (dev only)
├── config/
│   └── agents.json        # Model assignments & temperature settings
├── test-briefs/           # Sample recipe request JSON files
├── public/
│   ├── index.html         # Main web test UI
│   └── debug.html         # Debug console UI (dev only)
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Configuration

### Model Assignments & Temperature Tuning

Edit `config/agents.json` to configure models and temperatures per agent:

```json
{
  "defaultModel": "gemini-2.5-flash",
  "agents": {
    "sous_chef_planning": "gemini-2.5-flash",
    "sous_chef_synthesis": "gemini-2.5-flash",
    "boulanger": "gemini-2.5-flash",
    ...
  },
  "temperatures": {
    "sous_chef_planning": 0.3,    // Low: Analytical reasoning
    "sous_chef_synthesis": 0.5,   // Medium: Balanced synthesis
    "boulanger": 0.35,            // Low: Science-based precision
    "patissier": 0.4,             // Low: Tempering precision
    "rotisseur": 0.55,            // Medium: Classical technique
    "garde_manger": 0.6,          // Medium: Composition balance
    "asador": 0.75,               // High: Creative fire/smoke
    "orientateur": 0.7,           // High: Fusion creativity
    "epicier": 0.7                // High: Bold spice innovation
  }
}
```

**Temperature Philosophy**: Settings reflect cognitive demands of each role:
- **Precision specialists** (Boulanger, Pâtissier): 0.35-0.4 for mathematical accuracy
- **Technique specialists** (Rotisseur, Garde-Manger): 0.55-0.6 for balanced approach
- **Creative specialists** (Asador, Orientateur, Épicier): 0.7-0.75 for flavor innovation

### Environment Variables

- `GOOGLE_AI_API_KEY`: Required. Your Google AI API key.

## Design Principles

1. **Stateless Service**: JSON in → JSON out. No database, no sessions.
2. **Parallel Execution**: Specialists work simultaneously in Phase 2 (not sequential).
3. **Observable**: Every response includes complete execution trace with timing and success/error states.
4. **Type-Safe**: Full TypeScript coverage across all data structures.

## Test Briefs

The system includes 7 comprehensive test briefs in `test-briefs/`:

1. **brioche.json** - Classic French Brioche (Boulanger specialist)
2. **roast-chicken.json** - Roast Chicken with Sides (Rotisseur + Garde-Manger)
3. **tonkotsu-ramen.json** - Japanese Tonkotsu Ramen (Orientateur specialist)
4. **chicken-tikka-masala.json** - Chicken Tikka Masala (Épicier specialist)
5. **texas-brisket.json** - Texas BBQ Brisket (Asador specialist)
6. **pad-thai.json** - Authentic Pad Thai (Orientateur specialist)
7. **thanksgiving-menu.json** - Complete Thanksgiving Dinner (Multi-specialist)

## Performance Characteristics

**Typical Execution Times** (with Gemini 2.0 Flash):
- Simple recipes (1 specialist): 10-15 seconds
- Moderate recipes (2-3 specialists): 15-30 seconds
- Complex menus (4+ specialists): 30-60 seconds

**Parallel Execution**: Phase 2 specialists run concurrently, not sequentially. Check execution logs for timestamp overlaps to verify parallel processing.

## Troubleshooting

### API Key Issues
**Problem**: `GOOGLE_AI_API_KEY environment variable is not set`
**Solution**:
1. Copy `.env.example` to `.env`
2. Add your Google AI API key: `GOOGLE_AI_API_KEY=your_key_here`
3. Restart the server

### JSON Parsing Errors
**Problem**: `JSON validation failed` or `expected object, received array`
**Solution**:
- This indicates the LLM returned malformed JSON
- Check `src/orchestrator/json-parser.ts` for array unwrapping logic
- May require prompt refinement in `src/prompts/`

### Specialist Not Found
**Problem**: `Prompt file not found: specialist_name.txt`
**Solution**:
- Verify all 9 prompt files exist in `src/prompts/`
- Required files: `sous-chef-planning.txt`, `sous-chef-synthesis.txt`, and 7 specialist prompts

### Timeout Errors
**Problem**: Request times out after 5 minutes
**Solution**:
- Simplify the creative brief (reduce complexity)
- Try a less complex test brief first
- Check network connectivity to Google AI API

### Validation Errors
**Problem**: `Invalid creative brief` with field-level errors
**Solution**:
- Ensure required fields are present: `title`, `scope`, `creativeFocus`
- Check that `scope` is either `single_recipe` or `menu`
- Verify `creativeFocus` is `traditional`, `modern`, or `fusion`

## Known Limitations

1. **Nutrition Information**: Estimates only, not validated against nutritional databases
2. **Specialist Assignment**: Heuristic-based; may not always choose optimal specialists
3. **LLM Variability**: Recipe quality varies based on LLM model and temperature
4. **Single Model**: Currently supports Google Gemini only (multi-model support planned)

## Development Roadmap

### Phase 0: Setup ✅
- Project structure, types, configuration

### Phase 1: Core Orchestration ✅
- 3-phase workflow implementation
- Gemini API integration
- All 9 specialist prompt templates

### Phase 2: Test Harness & Integration ✅
- Express server with error handling
- Web UI with 7 test briefs
- Zod validation with flattened errors
- Execution log visualization
- JSON parser enhancements (array unwrapping, null handling)

### Phase 2.5: Development Observability ✅
- Event-driven architecture with EventEmitter
- Real-time SSE streaming of orchestration events
- Debug console UI with expandable prompts/responses
- Token usage tracking per agent
- Parallel execution visualization
- Temperature tuning per agent role

### Phase 3: Production Ready (Planned)
- Multi-model support (OpenAI, Anthropic)
- Retry logic with exponential backoff
- Recipe caching with fingerprint-based lookup
- Recipe modification flow (Executive Chef twists)
- Component-level caching for reusable one-pagers
- Deployment to Supabase Edge Functions

## License

MIT
