import { EventEmitter } from 'events';
import { callGemini } from '../llm/gemini-client';
import { loadPrompt, renderPrompt, extractSystemInstruction } from '../prompts/prompt-loader';
import { extractJSON } from './json-parser';
import {
  CreativeBrief,
  RecipeResult,
  Recipe,
  TaskMap,
  SpecialistOnePager,
  ExecutionLog,
  ExecutionStep,
  AppError
} from '../types';
import { TaskMapSchema, SpecialistOnePagerSchema, RecipeSchema } from '../types/validation';
import { DebugEvent } from '../types/debug-events';

export async function generateRecipe(
  brief: CreativeBrief,
  debugEmitter?: EventEmitter
): Promise<RecipeResult> {
  // Initialize execution log
  const log: ExecutionLog = {
    steps: [],
    startTime: new Date().toISOString(),
  };

  const orchestratorStartTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  // Utility to emit debug events
  const emit = (event: Omit<DebugEvent, 'timestamp' | 'requestId' | 'elapsedMs'>) => {
    if (debugEmitter) {
      debugEmitter.emit('debug', {
        ...event,
        timestamp: new Date().toISOString(),
        requestId,
        elapsedMs: Date.now() - orchestratorStartTime,
      } as DebugEvent);
    }
  };

  console.log(`\n🧑‍🍳 Starting recipe generation: "${brief.title}"\n`);

  try {
    // ============= PHASE 1: PLANNING =============
    console.log('📋 PHASE 1: PLANNING\n');
    emit({ type: 'phase:start', phase: 'planning' });

    const planningStartTime = Date.now();
    const planningTemplate = loadPrompt('sous-chef-planning');
    const { systemInstruction: planningSysInst, taskPrompt: planningTask } =
      extractSystemInstruction(planningTemplate);
    const planningPrompt = renderPrompt(planningTask, { creativeBrief: brief });

    emit({
      type: 'llm:request',
      agent: 'sous_chef_planning',
      model: 'gemini-2.5-flash',
      temperature: 0.3,
      promptPreview: planningPrompt.slice(0, 200),
      fullPrompt: planningPrompt,
    });

    const planningResponse = await callGemini('sous_chef_planning', planningPrompt, {
      jsonMode: true,
      systemInstruction: planningSysInst,
    });

    emit({
      type: 'llm:response',
      agent: 'sous_chef_planning',
      durationMs: Date.now() - planningStartTime,
      success: true,
      tokenUsage: planningResponse.tokenUsage,
      responsePreview: planningResponse.text.slice(0, 300),
      fullResponse: planningResponse.text,
    });

    const taskMap = extractJSON<TaskMap>(planningResponse.text, TaskMapSchema);

    emit({
      type: 'data:parsed',
      agent: 'sous_chef_planning',
      dataType: 'TaskMap',
      data: taskMap,
      validationSuccess: true,
    });

    const planningDuration = Date.now() - planningStartTime;

    log.steps.push({
      agent: 'sous_chef',
      action: 'planning',
      timestamp: new Date().toISOString(),
      durationMs: planningDuration,
      success: true,
      tokenUsage: planningResponse.tokenUsage,
    });

    emit({
      type: 'phase:complete',
      phase: 'planning',
      durationMs: planningDuration,
      success: true,
    });

    console.log(`✓ Specialists assigned: ${taskMap.specialists.map(s => s.name).join(', ')}`);
    console.log(`✓ Estimated complexity: ${taskMap.estimatedComplexity}\n`);

    // ============= PHASE 2: SPECIALISTS (PARALLEL) =============
    console.log('👨‍🍳 PHASE 2: SPECIALIST CONTRIBUTIONS\n');
    emit({ type: 'phase:start', phase: 'specialists' });

    const specialistPromises = taskMap.specialists.map(async (spec, index) => {
      const startTime = Date.now();
      const isParallel = taskMap.specialists.length > 1;

      try {
        // Load specialist prompt template and extract system instruction
        const template = loadPrompt(spec.name);
        const { systemInstruction: specSysInst, taskPrompt: specTask } =
          extractSystemInstruction(template);
        const prompt = renderPrompt(specTask, {
          creativeBrief: brief,
          responsibilities: spec.responsibilities,
        });

        emit({
          type: 'llm:request',
          agent: spec.name,
          model: 'gemini-2.5-flash',
          temperature: 0.6,
          promptPreview: prompt.slice(0, 200),
          fullPrompt: prompt,
          isParallel,
        });

        // Call specialist with JSON mode and system instruction
        const response = await callGemini(spec.name, prompt, {
          jsonMode: true,
          systemInstruction: specSysInst,
        });

        emit({
          type: 'llm:response',
          agent: spec.name,
          durationMs: Date.now() - startTime,
          success: true,
          tokenUsage: response.tokenUsage,
          responsePreview: response.text.slice(0, 300),
          fullResponse: response.text,
        });

        const onePager = extractJSON<SpecialistOnePager>(response.text, SpecialistOnePagerSchema);

        emit({
          type: 'data:parsed',
          agent: spec.name,
          dataType: 'SpecialistOnePager',
          data: onePager,
          validationSuccess: true,
        });

        const duration = Date.now() - startTime;

        // Log success
        const step: ExecutionStep = {
          agent: spec.name,
          action: 'specialist_contribution',
          timestamp: new Date().toISOString(),
          durationMs: duration,
          success: true,
          tokenUsage: response.tokenUsage,
        };

        return { onePager, step };
      } catch (error: unknown) {
        const duration = Date.now() - startTime;
        const message = error instanceof Error ? error.message : String(error);

        emit({
          type: 'agent:error',
          agent: spec.name,
          error: message,
          phase: 'specialists',
          recoverable: true,
        });

        // Log failure but don't throw
        console.warn(`⚠️  ${spec.name} failed: ${message}`);

        const step: ExecutionStep = {
          agent: spec.name,
          action: 'specialist_contribution',
          timestamp: new Date().toISOString(),
          durationMs: duration,
          success: false,
          error: message,
        };

        return { onePager: null, step };
      }
    });

    // Wait for all specialists (use allSettled for resilience)
    const results = await Promise.allSettled(specialistPromises);

    // Extract successful results
    const onePagers: SpecialistOnePager[] = [];

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        const { onePager, step } = result.value;
        log.steps.push(step);

        if (onePager) {
          onePagers.push(onePager);
        }
      } else {
        // This shouldn't happen since we catch errors above, but handle it anyway
        console.error(`⚠️  Specialist promise rejected: ${result.reason}`);
      }
    });

    if (onePagers.length === 0) {
      throw new AppError(
        'All specialists failed. Cannot proceed to synthesis.',
        true, // operational - all external API calls failed
        500,
        { attemptedSpecialists: taskMap.specialists.map(s => s.name) }
      );
    }

    emit({
      type: 'phase:complete',
      phase: 'specialists',
      durationMs: Date.now() - orchestratorStartTime - planningDuration,
      success: onePagers.length > 0,
    });

    console.log(`\n✓ Collected ${onePagers.length} specialist contributions\n`);

    // ============= PHASE 3: SYNTHESIS =============
    console.log('🎯 PHASE 3: SYNTHESIS\n');
    emit({ type: 'phase:start', phase: 'synthesis' });

    const synthesisStartTime = Date.now();
    const synthesisTemplate = loadPrompt('sous-chef-synthesis');
    const { systemInstruction: synthesisSysInst, taskPrompt: synthesisTask } =
      extractSystemInstruction(synthesisTemplate);
    const synthesisPrompt = renderPrompt(synthesisTask, {
      creativeBrief: brief,
      onePagers: onePagers,
    });

    emit({
      type: 'llm:request',
      agent: 'sous_chef_synthesis',
      model: 'gemini-2.5-flash',
      temperature: 0.5,
      promptPreview: synthesisPrompt.slice(0, 200),
      fullPrompt: synthesisPrompt,
    });

    const synthesisResponse = await callGemini('sous_chef_synthesis', synthesisPrompt, {
      jsonMode: true,
      systemInstruction: synthesisSysInst,
    });

    emit({
      type: 'llm:response',
      agent: 'sous_chef_synthesis',
      durationMs: Date.now() - synthesisStartTime,
      success: true,
      tokenUsage: synthesisResponse.tokenUsage,
      responsePreview: synthesisResponse.text.slice(0, 300),
      fullResponse: synthesisResponse.text,
    });

    const recipe = extractJSON<Recipe>(synthesisResponse.text, RecipeSchema);

    emit({
      type: 'data:parsed',
      agent: 'sous_chef_synthesis',
      dataType: 'Recipe',
      data: recipe,
      validationSuccess: true,
    });

    const synthesisDuration = Date.now() - synthesisStartTime;

    log.steps.push({
      agent: 'sous_chef',
      action: 'synthesis',
      timestamp: new Date().toISOString(),
      durationMs: synthesisDuration,
      success: true,
      tokenUsage: synthesisResponse.tokenUsage,
    });

    // ============= FINALIZE =============
    emit({
      type: 'phase:complete',
      phase: 'synthesis',
      durationMs: synthesisDuration,
      success: true,
    });

    log.endTime = new Date().toISOString();
    log.totalDurationMs = Date.now() - new Date(log.startTime).getTime();

    const totalSeconds = (log.totalDurationMs / 1000).toFixed(1);
    console.log(`\n✅ Recipe complete in ${totalSeconds}s\n`);

    emit({
      type: 'recipe:complete',
      recipe,
      log,
    });

    return { recipe, log };

  } catch (error: unknown) {
    // Log error and finalize
    log.endTime = new Date().toISOString();
    log.totalDurationMs = Date.now() - new Date(log.startTime).getTime();

    const message = error instanceof Error ? error.message : String(error);

    log.steps.push({
      agent: 'orchestrator',
      action: 'error',
      timestamp: new Date().toISOString(),
      durationMs: 0,
      success: false,
      error: message,
    });

    emit({
      type: 'recipe:error',
      error: message,
      partialLog: log,
    });

    console.error(`\n❌ Recipe generation failed: ${message}\n`);

    // Attach log to error for debugging
    if (error instanceof Error) {
      (error as any).executionLog = log;
    }
    throw error;
  }
}
