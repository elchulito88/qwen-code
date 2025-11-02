/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HuggingFaceProvider } from './huggingface.js';
import type { Content } from '@google/genai';

describe('HuggingFaceProvider', () => {
  let provider: HuggingFaceProvider;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    provider = new HuggingFaceProvider(
      'test-api-key',
      'Qwen/Qwen2.5-Coder-7B-Instruct',
    );
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isAvailable', () => {
    it('should return true when API key is provided', async () => {
      const result = await provider.isAvailable();
      expect(result).toBe(true);
    });

    it('should return true when local TGI server is available', async () => {
      const providerWithoutKey = new HuggingFaceProvider();
      fetchMock.mockResolvedValue({
        ok: true,
      });

      const result = await providerWithoutKey.isAvailable();
      expect(result).toBe(true);
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/health',
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        }),
      );
    });

    it('should return false when no API key and TGI server unavailable', async () => {
      const providerWithoutKey = new HuggingFaceProvider();
      fetchMock.mockRejectedValue(new Error('Connection refused'));

      const result = await providerWithoutKey.isAvailable();
      expect(result).toBe(false);
    });

    it('should handle timeout for TGI server check', async () => {
      const providerWithoutKey = new HuggingFaceProvider();
      fetchMock.mockImplementation(() =>
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 3000);
        }),
      );

      const result = await providerWithoutKey.isAvailable();
      expect(result).toBe(false);
    });
  });

  describe('listModels', () => {
    it('should return predefined list of Qwen models', async () => {
      const models = await provider.listModels();

      expect(models).toHaveLength(3);
      expect(models[0]).toEqual({
        id: 'Qwen/Qwen2.5-Coder-7B-Instruct',
        name: 'Qwen2.5-Coder-7B-Instruct',
        contextWindow: 32768,
        supportsStreaming: false,
        supportsVision: false,
      });
      expect(models[1].name).toBe('Qwen2.5-Coder-14B-Instruct');
      expect(models[2].name).toBe('Qwen2.5-Coder-32B-Instruct');
    });

    it('should return models that do not support streaming', async () => {
      const models = await provider.listModels();

      models.forEach(model => {
        expect(model.supportsStreaming).toBe(false);
      });
    });

    it('should return models that do not support vision', async () => {
      const models = await provider.listModels();

      models.forEach(model => {
        expect(model.supportsVision).toBe(false);
      });
    });
  });

  describe('sendRequest', () => {
    it('should send request to HuggingFace API with API key', async () => {
      const contents: Content[] = [
        {
          role: 'user',
          parts: [{ text: 'Write a Hello World program' }],
        },
      ];

      const mockResponse = [
        {
          generated_text: 'print("Hello, World!")',
        },
      ];

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await provider.sendRequest(contents, {
        temperature: 0.7,
        maxTokens: 1024,
      });

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api-inference.huggingface.co/models/Qwen/Qwen2.5-Coder-7B-Instruct',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json',
          }),
        }),
      );

      expect(result.candidates).toHaveLength(1);
      expect(result.candidates![0]!.content!.parts![0]!).toEqual({
        text: 'print("Hello, World!")',
      });
    });

    it('should send request to local TGI server without API key', async () => {
      const providerWithoutKey = new HuggingFaceProvider();
      const contents: Content[] = [
        { role: 'user', parts: [{ text: 'Test' }] },
      ];

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ generated_text: 'Response' }),
      });

      await providerWithoutKey.sendRequest(contents, {});

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/generate',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      );
    });

    it('should format messages using Qwen chat template', async () => {
      const contents: Content[] = [
        { role: 'user', parts: [{ text: 'First message' }] },
        { role: 'model', parts: [{ text: 'First response' }] },
        { role: 'user', parts: [{ text: 'Second message' }] },
      ];

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ generated_text: 'Response' }),
      });

      await provider.sendRequest(contents, {});

      const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      const prompt = requestBody.inputs;

      expect(prompt).toContain('<|im_start|>system');
      expect(prompt).toContain('<|im_start|>user\nFirst message<|im_end|>');
      expect(prompt).toContain('<|im_start|>assistant\nFirst response<|im_end|>');
      expect(prompt).toContain('<|im_start|>user\nSecond message<|im_end|>');
      expect(prompt).toContain('<|im_start|>assistant\n');
    });

    it('should pass temperature and maxTokens parameters', async () => {
      const contents: Content[] = [
        { role: 'user', parts: [{ text: 'Test' }] },
      ];

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ generated_text: 'Response' }),
      });

      await provider.sendRequest(contents, {
        temperature: 0.9,
        maxTokens: 2048,
      });

      const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(requestBody.parameters.temperature).toBe(0.9);
      expect(requestBody.parameters.max_new_tokens).toBe(2048);
      expect(requestBody.parameters.return_full_text).toBe(false);
    });

    it('should handle array response format', async () => {
      const contents: Content[] = [
        { role: 'user', parts: [{ text: 'Test' }] },
      ];

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => [{ generated_text: 'Array response' }],
      });

      const result = await provider.sendRequest(contents, {});
      expect(result.candidates![0]!.content!.parts![0]!).toEqual({
        text: 'Array response',
      });
    });

    it('should handle object response format', async () => {
      const contents: Content[] = [
        { role: 'user', parts: [{ text: 'Test' }] },
      ];

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ generated_text: 'Object response' }),
      });

      const result = await provider.sendRequest(contents, {});
      expect(result.candidates![0]!.content!.parts![0]!).toEqual({
        text: 'Object response',
      });
    });

    it('should handle empty response', async () => {
      const contents: Content[] = [
        { role: 'user', parts: [{ text: 'Test' }] },
      ];

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ generated_text: '' }),
      });

      const result = await provider.sendRequest(contents, {});
      expect(result.candidates![0]!.content!.parts![0]!).toEqual({ text: '' });
    });

    it('should throw error on failed request', async () => {
      const contents: Content[] = [
        { role: 'user', parts: [{ text: 'Test' }] },
      ];

      fetchMock.mockResolvedValue({
        ok: false,
        statusText: 'Model Loading',
      });

      await expect(
        provider.sendRequest(contents, {}),
      ).rejects.toThrow('HuggingFace API error: Model Loading');
    });
  });

  describe('sendStreamRequest', () => {
    it('should throw error as streaming is not supported', async () => {
      const contents: Content[] = [
        { role: 'user', parts: [{ text: 'Test' }] },
      ];

      await expect(async () => {
        const stream = provider.sendStreamRequest(contents, {});
        for await (const _ of stream) {
          // Should throw immediately
        }
      }).rejects.toThrow('Streaming not supported for HuggingFace provider');
    });
  });

  describe('provider properties', () => {
    it('should have correct provider name', () => {
      expect(provider.name).toBe('huggingface');
    });

    it('should not support streaming', () => {
      expect(provider.supportsStreaming).toBe(false);
    });

    it('should not support vision', () => {
      expect(provider.supportsVision).toBe(false);
    });
  });

  describe('model configuration', () => {
    it('should use default model when not specified', async () => {
      const defaultProvider = new HuggingFaceProvider('test-key');
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ generated_text: 'Response' }),
      });

      await defaultProvider.sendRequest(
        [{ role: 'user', parts: [{ text: 'Test' }] }],
        {},
      );

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api-inference.huggingface.co/models/Qwen/Qwen2.5-Coder-7B-Instruct',
        expect.any(Object),
      );
    });

    it('should use custom model when specified', async () => {
      const customProvider = new HuggingFaceProvider(
        'test-key',
        'Qwen/Qwen2.5-Coder-14B-Instruct',
      );
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ generated_text: 'Response' }),
      });

      await customProvider.sendRequest(
        [{ role: 'user', parts: [{ text: 'Test' }] }],
        {},
      );

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api-inference.huggingface.co/models/Qwen/Qwen2.5-Coder-14B-Instruct',
        expect.any(Object),
      );
    });
  });
});
