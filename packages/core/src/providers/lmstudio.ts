/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Content, GenerateContentResponse, Part } from '@google/genai';
import type { Model, ModelProvider, RequestOptions } from './base.js';

/**
 * LM Studio provider for local model inference
 * Uses LM Studio's OpenAI-compatible API endpoint
 */
export class LMStudioProvider implements ModelProvider {
  readonly name = 'lmstudio';
  readonly supportsStreaming = true;
  readonly supportsVision = false;

  constructor(
    private endpoint: string = 'http://127.0.0.1:1234',
    private contextWindow: number = 262144,
  ) {}

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.endpoint}/v1/models`, {
        signal: AbortSignal.timeout(2000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<Model[]> {
    try {
      const response = await fetch(`${this.endpoint}/v1/models`);
      if (!response.ok) {
        throw new Error(`Failed to list models: ${response.statusText}`);
      }

      const data = (await response.json()) as {
        data: Array<{
          id: string;
          object: string;
          owned_by: string;
        }>;
      };

      return data.data.map((model) => ({
        id: model.id,
        name: model.id,
        contextWindow: this.contextWindow,
        supportsStreaming: true,
        supportsVision: false,
      }));
    } catch (error) {
      console.error('Error listing LM Studio models:', error);
      return [];
    }
  }

  async sendRequest(
    contents: Content[],
    options: RequestOptions,
  ): Promise<GenerateContentResponse> {
    const messages = this.convertContentsToMessages(contents);

    const response = await fetch(`${this.endpoint}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens,
        stream: false,
      }),
      signal: options.signal,
    });

    if (!response.ok) {
      throw new Error(`LM Studio API error: ${response.statusText}`);
    }

    const data = (await response.json()) as {
      choices: Array<{
        message: {
          role: string;
          content: string;
        };
        finish_reason: string;
      }>;
    };

    return this.convertToGeminiResponse(data);
  }

  async *sendStreamRequest(
    contents: Content[],
    options: RequestOptions,
  ): AsyncGenerator<GenerateContentResponse> {
    const messages = this.convertContentsToMessages(contents);

    const response = await fetch(`${this.endpoint}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens,
        stream: true,
      }),
      signal: options.signal,
    });

    if (!response.ok) {
      throw new Error(`LM Studio API error: ${response.statusText}`);
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
              const parsed = JSON.parse(data) as {
                choices: Array<{
                  delta: { content?: string };
                  finish_reason?: string;
                }>;
              };
              yield this.convertStreamChunkToGeminiResponse(parsed);
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

  private convertContentsToMessages(
    contents: Content[],
  ): Array<{ role: string; content: string }> {
    return contents.map((content) => ({
      role: content.role === 'model' ? 'assistant' : (content.role || 'user'),
      content: this.extractTextFromParts(content.parts || []),
    }));
  }

  private extractTextFromParts(parts: Part[]): string {
    return parts
      .map((part) => {
        if ('text' in part) return part.text;
        if ('functionCall' in part && part.functionCall)
          return `[Function Call: ${part.functionCall.name}]`;
        if ('functionResponse' in part && part.functionResponse)
          return `[Function Response: ${part.functionResponse.name}]`;
        return '';
      })
      .join('\n');
  }

  private convertToGeminiResponse(data: {
    choices: Array<{
      message: { role: string; content: string };
      finish_reason: string;
    }>;
  }): GenerateContentResponse {
    const choice = data.choices[0];
    return {
      candidates: [
        {
          content: {
            role: 'model',
            parts: [{ text: choice?.message?.content || '' }],
          },
          finishReason: choice?.finish_reason === 'stop' ? 1 : 0,
          index: 0,
        },
      ],
    } as unknown as GenerateContentResponse;
  }

  private convertStreamChunkToGeminiResponse(data: {
    choices: Array<{
      delta: { content?: string };
      finish_reason?: string;
    }>;
  }): GenerateContentResponse {
    const choice = data.choices[0];
    return {
      candidates: [
        {
          content: {
            role: 'model',
            parts: [{ text: choice?.delta?.content || '' }],
          },
          finishReason: choice?.finish_reason === 'stop' ? 1 : 0,
          index: 0,
        },
      ],
    } as unknown as GenerateContentResponse;
  }
}
