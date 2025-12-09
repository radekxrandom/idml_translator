import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OpenAITranslator } from '../../../src/infrastructure/translation/OpenAITranslator.js'
import { TranslationUnit } from '../../../src/domain/model/TranslationUnit.js'
import { TextLocation } from '../../../src/domain/model/TextLocation.js'
import type { Logger } from '../../../src/application/ports/Logger.js'

const createMockLogger = (): Logger => ({
  info: vi.fn(),
  debug: vi.fn(),
  error: vi.fn()
})

describe('OpenAITranslator', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi.fn()
    global.fetch = mockFetch
  })

  it('should translate text via openai api', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'przetłumaczony tekst' } }]
      })
    }

    mockFetch.mockResolvedValue(mockResponse)

    const config = { apiKey: 'test-key', model: 'gpt-4o' }
    const logger = createMockLogger()
    const translator = new OpenAITranslator(config, logger)

    const units = [
      new TranslationUnit('unit1', 'translated text', new TextLocation('story1', [0], 'story1:0'))
    ]

    const result = await translator.translateBatch(units)

    expect(result.get('unit1')).toBe('przetłumaczony tekst')
  })

  it('should preserve leading and trailing whitespace', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'translated' } }]
      })
    }

    mockFetch.mockResolvedValue(mockResponse)

    const config = { apiKey: 'test-key', model: 'gpt-4o' }
    const logger = createMockLogger()
    const translator = new OpenAITranslator(config, logger)

    const units = [
      new TranslationUnit('unit1', '  original text  ', new TextLocation('story1', [0], 'story1:0'))
    ]

    const result = await translator.translateBatch(units)

    expect(result.get('unit1')).toBe('  translated  ')
  })

  it('should fallback to source text on api error', async () => {
    const mockResponse = {
      ok: false,
      status: 500,
      text: async () => 'server error'
    }

    mockFetch.mockResolvedValue(mockResponse)

    const config = { apiKey: 'test-key', model: 'gpt-4o' }
    const logger = createMockLogger()
    const translator = new OpenAITranslator(config, logger)

    const units = [
      new TranslationUnit('unit1', 'original text', new TextLocation('story1', [0], 'story1:0'))
    ]

    const result = await translator.translateBatch(units)

    expect(result.get('unit1')).toBe('original text')
    expect(logger.error).toHaveBeenCalled()
  })
})
