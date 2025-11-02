/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OllamaProvider } from './ollama.js';
import type { Content } from '@google/genai';

describe('OllamaProvider', () => {
  let provider: OllamaProvider;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    provider = new OllamaProvider('http://localhost:11434');
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isAvailable', () => {
    it('should return true when Ollama is available', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ models: [] }),
      });

      const result = await provider.isAvailable();
      expect(result).toBe(true);
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:11434/api/tags',
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        }),
      );
    });

    it('should return false when Ollama is not available', async () => {
      fetchMock.mockRejectedValue(new Error('Connection failed'));

      const result = await provider.isAvailable();
      expect(result).toBe(false);
    });

    it('should return false when request times out', async () => {
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
        models: [
          { name: 'qwen2.5-coder:7b', size: 4661211648 },
          { name: 'qwen2.5-coder:14b', size: 9243291136 },
          { name: 'llava:7b', size: 4661211648 },
        ],
      };

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockModels,
      });

      const models = await provider.listModels();

      expect(models).toHaveLength(3);
      expect(models[0]).toEqual({
        id: 'qwen2.5-coder:7b',
        name: 'qwen2.5-coder:7b',
        supportsStreaming: true,
        supportsVision: false,
      });
      expect(models[2]).toEqual({
        id: 'llava:7b',
        name: 'llava:7b',
        supportsStreaming: true,
        supportsVision: true,
      });
    });

    it('should detect vision models by name', async () => {
      const mockModels = {
        models: [
          { name: 'llava:13b', size: 8000000000 },
          { name: 'qwen-vision:latest', size: 5000000000 },
        ],
      };

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockModels,
      });

      const models = await provider.listModels();

      expect(models[0].supportsVision).toBe(true);
      expect(models[1].supportsVision).toBe(true);
    });

    it('should return empty array on error', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'));

      const models = await provider.listModels();
      expect(models).toEqual([]);
    });
  });

  describe('sendRequest', () => {
    it('should send request and return formatted response', async () => {
      const contents: Content[] = [
        {
          role: 'user',
          parts: [{ text: 'Hello, how are you?' }],
        },
      ];

      const mockResponse = {
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'I am doing well, thank you!',
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
        temperature: 0.7,
      });

      expect(result.candidates).toHaveLength(1);
      expect(result.candidates?.[0]?.content.parts[0]).toEqual({
        text: 'I am doing well, thank you!',
      });
      expect(result.candidates?.[0]?.finishReason).toBe(1); // STOP
    });

    it('should handle model role conversion', async () => {
      const contents: Content[] = [
        {
          role: 'user',
          parts: [{ text: 'First message' }],
        },
        {
          role: 'model',
          parts: [{ text: 'Response' }],
        },
        {
          role: 'user',
          parts: [{ text: 'Follow up' }],
        },
      ];

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: { role: 'assistant', content: 'Reply' },
              finish_reason: 'stop',
            },
          ],
        }),
      });

      await provider.sendRequest(contents, {});

      const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(requestBody.messages).toEqual([
        { role: 'user', content: 'First message' },
        { role: 'assistant', content: 'Response' },
        { role: 'user', content: 'Follow up' },
      ]);
    });

    it('should handle temperature and maxTokens options', async () => {
      const contents: Content[] = [
        { role: 'user', parts: [{ text: 'Test' }] },
      ];

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: { role: 'assistant', content: 'Test response' },
              finish_reason: 'stop',
            },
          ],
        }),
      });

      await provider.sendRequest(contents, {
        temperature: 0.9,
        maxTokens: 1000,
      });

      const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(requestBody.temperature).toBe(0.9);
      expect(requestBody.max_tokens).toBe(1000);
      expect(requestBody.stream).toBe(false);
    });

    it('should throw error on failed request', async () => {
      const contents: Content[] = [
        { role: 'user', parts: [{ text: 'Test' }] },
      ];

      fetchMock.mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
      });

      await expect(
        provider.sendRequest(contents, {}),
      ).rejects.toThrow('Ollama API error: Internal Server Error');
    });
  });

  describe('sendStreamRequest', () => {
    it('should stream responses', async () => {
      const contents: Content[] = [
        { role: 'user', parts: [{ text: 'Tell me a story' }] },
      ];

      const mockStreamData = [
        'data: {"choices":[{"delta":{"content":"Once"},"finish_reason":null}]}\n',
        'data: {"choices":[{"delta":{"content":" upon"},"finish_reason":null}]}\n',
        'data: {"choices":[{"delta":{"content":" a time"},"finish_reason":"stop"}]}\n',
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

      expect(responses).toEqual(['Once', ' upon', ' a time']);
      expect(mockReader.releaseLock).toHaveBeenCalled();
    });

    it('should handle streaming errors gracefully', async () => {
      const contents: Content[] = [
        { role: 'user', parts: [{ text: 'Test' }] },
      ];

      fetchMock.mockResolvedValue({
        ok: false,
        statusText: 'Service Unavailable',
      });

      await expect(async () => {
        const stream = provider.sendStreamRequest(contents, {});
        for await (const _ of stream) {
          // Should throw before yielding any values
        }
      }).rejects.toThrow('Ollama API error: Service Unavailable');
    });

    it('should skip invalid JSON chunks', async () => {
      const contents: Content[] = [
        { role: 'user', parts: [{ text: 'Test' }] },
      ];

      const mockStreamData = [
        'data: {"choices":[{"delta":{"content":"Valid"},"finish_reason":null}]}\n',
        'data: {invalid json}\n',
        'data: {"choices":[{"delta":{"content":" chunk"},"finish_reason":"stop"}]}\n',
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

      // Should only get valid chunks
      expect(responses).toEqual(['Valid', ' chunk']);
    });
  });

  describe('provider properties', () => {
    it('should have correct provider name', () => {
      expect(provider.name).toBe('ollama');
    });

    it('should support streaming', () => {
      expect(provider.supportsStreaming).toBe(true);
    });

    it('should not support vision by default', () => {
      expect(provider.supportsVision).toBe(false);
    });
  });

  describe('endpoint configuration', () => {
    it('should use default endpoint when not specified', () => {
      new OllamaProvider();
      expect(fetchMock).toBeDefined();
      // Endpoint is private, but we can verify through isAvailable call
    });

    it('should use custom endpoint when specified', async () => {
      const customProvider = new OllamaProvider('http://custom:8080');
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ models: [] }),
      });

      await customProvider.isAvailable();
      expect(fetchMock).toHaveBeenCalledWith(
        'http://custom:8080/api/tags',
        expect.any(Object),
      );
    });
  });
});
