/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Content, GenerateContentResponse, Part } from '@google/genai';
import type { Model, ModelProvider, RequestOptions } from './base.js';

/**
 * Hugging Face provider for local model inference
 * This is a placeholder implementation that uses HF Inference API
 * For true local inference, this would need to integrate with transformers.js
 * or use a local inference server like text-generation-inference
 */
export class HuggingFaceProvider implements ModelProvider {
  readonly name = 'huggingface';
  readonly supportsStreaming = false;
  readonly supportsVision = false;

  constructor(
    private apiKey?: string,
    private defaultModel: string = 'Qwen/Qwen2.5-Coder-14B-Instruct',
  ) {}

  async isAvailable(): Promise<boolean> {
    // Check if HF API key is available or if running local inference server
    if (this.apiKey) {
      return true;
    }

    // Try to connect to local TGI server if running
    try {
      const response = await fetch('http://localhost:8080/health', {
        signal: AbortSignal.timeout(2000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<Model[]> {
    // Return a predefined list of Qwen models available on HuggingFace
    return [
      // Qwen2.5-Coder models
      {
        id: 'Qwen/Qwen2.5-Coder-7B-Instruct',
        name: 'Qwen2.5-Coder-7B-Instruct',
        contextWindow: 32768,
        supportsStreaming: false,
        supportsVision: false,
      },
      {
        id: 'Qwen/Qwen2.5-Coder-14B-Instruct',
        name: 'Qwen2.5-Coder-14B-Instruct',
        contextWindow: 32768,
        supportsStreaming: false,
        supportsVision: false,
      },
      {
        id: 'Qwen/Qwen2.5-Coder-32B-Instruct',
        name: 'Qwen2.5-Coder-32B-Instruct',
        contextWindow: 32768,
        supportsStreaming: false,
        supportsVision: false,
      },
      // Qwen3-Coder models
      {
        id: 'Qwen/Qwen3-Coder-30B-A3B-Instruct',
        name: 'Qwen3-Coder-30B-A3B-Instruct',
        contextWindow: 131072,
        supportsStreaming: false,
        supportsVision: false,
      },
    ];
  }

  async sendRequest(
    contents: Content[],
    options: RequestOptions,
  ): Promise<GenerateContentResponse> {
    const messages = this.convertContentsToMessages(contents);
    const prompt = this.formatMessagesAsPrompt(messages);

    let endpoint: string;
    let headers: Record<string, string>;

    if (this.apiKey) {
      // Use HuggingFace Inference API
      endpoint = `https://api-inference.huggingface.co/models/${this.defaultModel}`;
      headers = {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      };
    } else {
      // Use local TGI server
      endpoint = 'http://localhost:8080/generate';
      headers = {
        'Content-Type': 'application/json',
      };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          temperature: options.temperature ?? 0.7,
          max_new_tokens: options.maxTokens ?? 2048,
          return_full_text: false,
        },
      }),
      signal: options.signal,
    });

    if (!response.ok) {
      throw new Error(`HuggingFace API error: ${response.statusText}`);
    }

    const data = await response.json() as Array<{ generated_text: string }> | { generated_text: string };
    const generatedText = Array.isArray(data) ? data[0]?.generated_text : data.generated_text;

    return this.convertToGeminiResponse(generatedText || '');
  }

  async *sendStreamRequest(
    _contents: Content[],
    _options: RequestOptions,
  ): AsyncGenerator<GenerateContentResponse> {
    throw new Error('Streaming not supported for HuggingFace provider');
    // @ts-expect-error - Unreachable yield to satisfy generator requirement
    yield;
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

  private formatMessagesAsPrompt(
    messages: Array<{ role: string; content: string }>,
  ): string {
    // Format messages in Qwen's chat template format
    let prompt = '<|im_start|>system\nYou are a helpful AI assistant.<|im_end|>\n';

    for (const msg of messages) {
      const role = msg.role === 'assistant' ? 'assistant' : 'user';
      prompt += `<|im_start|>${role}\n${msg.content}<|im_end|>\n`;
    }

    prompt += '<|im_start|>assistant\n';
    return prompt;
  }

  private convertToGeminiResponse(text: string): GenerateContentResponse {
    return {
      candidates: [
        {
          content: {
            role: 'model',
            parts: [{ text }],
          },
          finishReason: 1, // STOP
          index: 0,
        },
      ],
    } as unknown as GenerateContentResponse;
  }
}
