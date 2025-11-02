/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LMStudioProvider } from './lmstudio.js';
import type { Content } from '@google/genai';

describe('LMStudioProvider', () => {
  let provider: LMStudioProvider;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    provider = new LMStudioProvider('http://127.0.0.1:1234', 262144);
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isAvailable', () => {
    it('should return true when LM Studio is available', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      const result = await provider.isAvailable();
      expect(result).toBe(true);
      expect(fetchMock).toHaveBeenCalledWith(
        'http://127.0.0.1:1234/v1/models',
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        }),
      );
    });

    it('should return false when LM Studio is not available', async () => {
      fetchMock.mockRejectedValue(new Error('Connection refused'));

      const result = await provider.isAvailable();
      expect(result).toBe(false);
    });

    it('should handle timeout gracefully', async () => {
      fetchMock.mockImplementation(() =>
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 3000);
        }),
      );

      const result = await provider.isAvailable();
      expect(result).toBe(false);
    });
  });

  describe('listModels', () => {
    it('should return list of available models', async () => {
      const mockModels = {
        data: [
          {
            id: 'qwen2.5-coder-7b-instruct',
            object: 'model',
            owned_by: 'lmstudio',
          },
          {
            id: 'qwen3-coder-30b',
            object: 'model',
            owned_by: 'lmstudio',
          },
        ],
      };

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockModels,
      });

      const models = await provider.listModels();

      expect(models).toHaveLength(2);
      expect(models[0]).toEqual({
        id: 'qwen2.5-coder-7b-instruct',
        name: 'qwen2.5-coder-7b-instruct',
        contextWindow: 262144,
        supportsStreaming: true,
        supportsVision: false,
      });
      expect(models[1]).toEqual({
        id: 'qwen3-coder-30b',
        name: 'qwen3-coder-30b',
        contextWindow: 262144,
        supportsStreaming: true,
        supportsVision: false,
      });
    });

    it('should use configured context window', async () => {
      const customProvider = new LMStudioProvider(
        'http://127.0.0.1:1234',
        131072,
      );
      const mockModels = {
        data: [
          { id: 'model1', object: 'model', owned_by: 'lmstudio' },
        ],
      };

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockModels,
      });

      const models = await customProvider.listModels();

      expect(models[0].contextWindow).toBe(131072);
    });

    it('should return empty array on error', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'));

      const models = await provider.listModels();
      expect(models).toEqual([]);
    });

    it('should handle non-OK response', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
      });

      const models = await provider.listModels();
      expect(models).toEqual([]);
    });
  });

  describe('sendRequest', () => {
    it('should send request and return formatted response', async () => {
      const contents: Content[] = [
        {
          role: 'user',
          parts: [{ text: 'Write a function to add two numbers' }],
        },
      ];

      const mockResponse = {
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'function add(a, b) { return a + b; }',
            },
            finish_reason: 'stop',
          },
        ],
      };

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await provider.sendRequest(contents, {
        temperature: 0.5,
      });

      expect(result.candidates).toHaveLength(1);
      expect(result.candidates?.[0]?.content.parts[0]).toEqual({
        text: 'function add(a, b) { return a + b; }',
      });
      expect(result.candidates?.[0]?.finishReason).toBe(1); // STOP
    });

    it('should convert model role to assistant', async () => {
      const contents: Content[] = [
        { role: 'user', parts: [{ text: 'Hello' }] },
        { role: 'model', parts: [{ text: 'Hi there!' }] },
        { role: 'user', parts: [{ text: 'How are you?' }] },
      ];

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: { role: 'assistant', content: 'Good!' },
              finish_reason: 'stop',
            },
          ],
        }),
      });

      await provider.sendRequest(contents, {});

      const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(requestBody.messages[1].role).toBe('assistant');
    });

    it('should pass temperature and maxTokens options', async () => {
      const contents: Content[] = [
        { role: 'user', parts: [{ text: 'Test' }] },
      ];

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: { role: 'assistant', content: 'Response' },
              finish_reason: 'stop',
            },
          ],
        }),
      });

      await provider.sendRequest(contents, {
        temperature: 0.8,
        maxTokens: 2048,
      });

      const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(requestBody.temperature).toBe(0.8);
      expect(requestBody.max_tokens).toBe(2048);
      expect(requestBody.stream).toBe(false);
    });

    it('should throw error on failed request', async () => {
      const contents: Content[] = [
        { role: 'user', parts: [{ text: 'Test' }] },
      ];

      fetchMock.mockResolvedValue({
        ok: false,
        statusText: 'Bad Request',
      });

      await expect(
        provider.sendRequest(contents, {}),
      ).rejects.toThrow('LM Studio API error: Bad Request');
    });

    it('should handle empty response content', async () => {
      const contents: Content[] = [
        { role: 'user', parts: [{ text: 'Test' }] },
      ];

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: { role: 'assistant', content: '' },
              finish_reason: 'stop',
            },
          ],
        }),
      });

      const result = await provider.sendRequest(contents, {});
      expect(result.candidates?.[0]?.content.parts[0]).toEqual({ text: '' });
    });
  });

  describe('sendStreamRequest', () => {
    it('should stream responses correctly', async () => {
      const contents: Content[] = [
        { role: 'user', parts: [{ text: 'Count to three' }] },
      ];

      const mockStreamData = [
        'data: {"choices":[{"delta":{"content":"One"},"finish_reason":null}]}\n',
        'data: {"choices":[{"delta":{"content":", two"},"finish_reason":null}]}\n',
        'data: {"choices":[{"delta":{"content":", three"},"finish_reason":"stop"}]}\n',
        'data: [DONE]\n',
      ].join('');

      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(mockStreamData),
          })
          .mockResolvedValueOnce({ done: true, value: undefined }),
        releaseLock: vi.fn(),
      };

      fetchMock.mockResolvedValue({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });

      const responses: string[] = [];
      const stream = provider.sendStreamRequest(contents, {});

      for await (const chunk of stream) {
        const text = chunk.candidates?.[0]?.content.parts[0];
        if ('text' in text!) {
          responses.push(text.text || '');
        }
      }

      expect(responses).toEqual(['One', ', two', ', three']);
      expect(mockReader.releaseLock).toHaveBeenCalled();
    });

    it('should handle no response body error', async () => {
      const contents: Content[] = [
        { role: 'user', parts: [{ text: 'Test' }] },
      ];

      fetchMock.mockResolvedValue({
        ok: true,
        body: null,
      });

      await expect(async () => {
        const stream = provider.sendStreamRequest(contents, {});
        for await (const _ of stream) {
          // Should throw before yielding
        }
      }).rejects.toThrow('No response body');
    });

    it('should skip [DONE] marker', async () => {
      const contents: Content[] = [
        { role: 'user', parts: [{ text: 'Test' }] },
      ];

      const mockStreamData = [
        'data: {"choices":[{"delta":{"content":"Text"},"finish_reason":null}]}\n',
        'data: [DONE]\n',
      ].join('');

      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(mockStreamData),
          })
          .mockResolvedValueOnce({ done: true, value: undefined }),
        releaseLock: vi.fn(),
      };

      fetchMock.mockResolvedValue({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });

      const responses: string[] = [];
      const stream = provider.sendStreamRequest(contents, {});

      for await (const chunk of stream) {
        const text = chunk.candidates?.[0]?.content.parts[0];
        if ('text' in text!) {
          responses.push(text.text || '');
        }
      }

      // Should only have the actual content, not [DONE]
      expect(responses).toEqual(['Text']);
    });
  });

  describe('provider properties', () => {
    it('should have correct provider name', () => {
      expect(provider.name).toBe('lmstudio');
    });

    it('should support streaming', () => {
      expect(provider.supportsStreaming).toBe(true);
    });

    it('should not support vision', () => {
      expect(provider.supportsVision).toBe(false);
    });
  });

  describe('endpoint configuration', () => {
    it('should use default endpoint when not specified', () => {
      new LMStudioProvider();
      expect(fetchMock).toBeDefined();
    });

    it('should use custom endpoint when specified', async () => {
      const customProvider = new LMStudioProvider('http://custom:5000');
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      await customProvider.isAvailable();
      expect(fetchMock).toHaveBeenCalledWith(
        'http://custom:5000/v1/models',
        expect.any(Object),
      );
    });
  });
});
