// Debug event types for development observability

export type DebugEvent =
  | PhaseStartEvent
  | PhaseCompleteEvent
  | LLMRequestEvent
  | LLMResponseEvent
  | DataParsedEvent
  | AgentErrorEvent
  | RecipeCompleteEvent
  | RecipeErrorEvent;

interface BaseEvent {
  type: string;
  timestamp: string;
  requestId: string;
  elapsedMs: number;  // Time since orchestrator start
}

export interface PhaseStartEvent extends BaseEvent {
  type: 'phase:start';
  phase: 'planning' | 'specialists' | 'synthesis';
  context?: Record<string, any>;
}

export interface PhaseCompleteEvent extends BaseEvent {
  type: 'phase:complete';
  phase: 'planning' | 'specialists' | 'synthesis';
  durationMs: number;
  success: boolean;
}

export interface LLMRequestEvent extends BaseEvent {
  type: 'llm:request';
  agent: string;              // "sous_chef_planning", "boulanger", etc.
  model: string;              // "gemini-2.5-flash"
  temperature: number;
  promptPreview: string;      // First 200 chars of prompt
  fullPrompt: string;         // Full prompt for expandable view
  isParallel?: boolean;       // True if part of parallel execution
}

export interface LLMResponseEvent extends BaseEvent {
  type: 'llm:response';
  agent: string;
  durationMs: number;
  success: boolean;
  tokenUsage: {
    promptTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  responsePreview: string;    // First 300 chars
  fullResponse: string;       // Full response text
  error?: string;
}

export interface DataParsedEvent extends BaseEvent {
  type: 'data:parsed';
  agent: string;
  dataType: 'TaskMap' | 'SpecialistOnePager' | 'Recipe';
  data: any;                  // Full parsed object
  validationSuccess: boolean;
}

export interface AgentErrorEvent extends BaseEvent {
  type: 'agent:error';
  agent: string;
  error: string;
  phase: string;
  recoverable: boolean;       // Can orchestrator continue?
}

export interface RecipeCompleteEvent extends BaseEvent {
  type: 'recipe:complete';
  recipe: any;
  log: any;
}

export interface RecipeErrorEvent extends BaseEvent {
  type: 'recipe:error';
  error: string;
  partialLog?: any;
}
