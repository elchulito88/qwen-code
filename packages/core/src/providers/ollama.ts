/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  Content,
  GenerateContentResponse,
  GenerateContentParameters,
} from '@google/genai';
import type { Model, ModelProvider, RequestOptions } from './base.js';
import { OpenAIContentConverter } from '../core/openaiContentGenerator/converter.js';
import type OpenAI from 'openai';

/**
 * Ollama provider for local model inference
 * Uses Ollama's OpenAI-compatible API endpoint with full tool calling support
 */
export class OllamaProvider implements ModelProvider {
  readonly name = 'ollama';
  readonly supportsStreaming = true;
  readonly supportsVision = false; // Can be enabled for vision models
  private converter: OpenAIContentConverter;

  constructor(
    private endpoint: string = 'http://localhost:11434',
    private defaultModel: string = 'qwen2.5-coder:14b',
  ) {
    this.converter = new OpenAIContentConverter(defaultModel);
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.endpoint}/api/tags`, {
        signal: AbortSignal.timeout(2000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<Model[]> {
    try {
      const response = await fetch(`${this.endpoint}/api/tags`);
      if (!response.ok) {
        throw new Error(`Failed to list models: ${response.statusText}`);
      }

      const data = (await response.json()) as {
        models: Array<{
          name: string;
          size: number;
          details?: {
            parameter_size?: string;
            quantization_level?: string;
          };
        }>;
      };

      return data.models.map((model) => ({
        id: model.name,
        name: model.name,
        supportsStreaming: true,
        supportsVision:
          model.name.includes('vision') || model.name.includes('llava'),
      }));
    } catch (error) {
      console.error('Error listing Ollama models:', error);
      return [];
    }
  }

  async sendRequest(
    contents: Content[],
    options: RequestOptions,
  ): Promise<GenerateContentResponse> {
    const messages = await this.convertContentsToMessages(contents);

    // Prepare request body
    const requestBody: {
      model: string;
      messages: OpenAI.Chat.ChatCompletionMessageParam[];
      temperature?: number;
      max_tokens?: number;
      stream: boolean;
      tools?: OpenAI.Chat.ChatCompletionTool[];
    } = {
      model: this.defaultModel,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens,
      stream: false,
    };

    // Add tools if provided
    if (options.tools && options.tools.length > 0) {
      const openaiTools = await this.converter.convertGeminiToolsToOpenAI(
        options.tools,
      );
      if (openaiTools.length > 0) {
        requestBody.tools = openaiTools;
      }
    }

    const response = await fetch(`${this.endpoint}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: options.signal,
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = (await response.json()) as OpenAI.Chat.ChatCompletion;

    // Ollama workaround: Check if tool call is in content as text (Ollama limitation)
    if (
      data.choices[0]?.message?.content &&
      !data.choices[0]?.message?.tool_calls
    ) {
      const parsedToolCall = this.parseToolCallFromText(
        data.choices[0].message.content,
      );
      if (parsedToolCall) {
        // Convert text-based tool call to proper tool_calls format
        data.choices[0].message.tool_calls = [parsedToolCall];
        data.choices[0].message.content = null;
      }
    }

    // Convert OpenAI response (including tool_calls) to Gemini format
    return this.converter.convertOpenAIResponseToGemini(data);
  }

  async *sendStreamRequest(
    contents: Content[],
    options: RequestOptions,
  ): AsyncGenerator<GenerateContentResponse> {
    const messages = await this.convertContentsToMessages(contents);

    // Reset streaming tool call parser for new stream
    this.converter.resetStreamingToolCalls();

    // Prepare request body
    const requestBody: {
      model: string;
      messages: OpenAI.Chat.ChatCompletionMessageParam[];
      temperature?: number;
      max_tokens?: number;
      stream: boolean;
      tools?: OpenAI.Chat.ChatCompletionTool[];
    } = {
      model: this.defaultModel,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens,
      stream: true,
    };

    // Add tools if provided
    if (options.tools && options.tools.length > 0) {
      const openaiTools = await this.converter.convertGeminiToolsToOpenAI(
        options.tools,
      );
      if (openaiTools.length > 0) {
        requestBody.tools = openaiTools;
      }
    }

    const response = await fetch(`${this.endpoint}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: options.signal,
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(
                data,
              ) as OpenAI.Chat.ChatCompletionChunk;
              yield this.converter.convertOpenAIChunkToGemini(parsed);
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private async convertContentsToMessages(
    contents: Content[],
  ): Promise<OpenAI.Chat.ChatCompletionMessageParam[]> {
    const request: GenerateContentParameters = {
      contents,
      model: this.defaultModel,
    };
    return this.converter.convertGeminiRequestToOpenAI(request);
  }

  /**
   * Ollama workaround: Parse tool call from text content
   * Ollama currently returns tool calls as JSON text instead of proper tool_calls field
   */
  private parseToolCallFromText(
    content: string,
  ): OpenAI.Chat.ChatCompletionMessageToolCall | null {
    try {
      // Try to parse JSON from content
      const trimmed = content.trim();

      // Check if it looks like a JSON tool call
      if (
        (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('```json') && trimmed.includes('```'))
      ) {
        // Extract JSON from code blocks if present
        let jsonStr = trimmed;
        const jsonMatch = trimmed.match(/```json\s*\n([\s\S]*?)\n```/);
        if (jsonMatch) {
          jsonStr = jsonMatch[1];
        }

        const parsed = JSON.parse(jsonStr);

        // Check if it has the tool call structure
        if (parsed.name && parsed.arguments) {
          return {
            id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            type: 'function',
            function: {
              name: parsed.name,
              arguments: JSON.stringify(parsed.arguments),
            },
          };
        }
      }
    } catch {
      // Not a valid JSON tool call, return null
    }
    return null;
  }
}
