import { describe, it, expect, vi } from 'vitest'
import { TranslateIdmlFile } from '../../../src/application/usecases/TranslateIdmlFile.js'
import { TranslationUnit } from '../../../src/domain/model/TranslationUnit.js'
import { TextLocation } from '../../../src/domain/model/TextLocation.js'
import type { IdmlRepository } from '../../../src/application/ports/IdmlRepository.js'
import type { Translator } from '../../../src/application/ports/Translator.js'
import type { Logger } from '../../../src/application/ports/Logger.js'
import type { TextExtractionService } from '../../../src/domain/services/TextExtractionService.js'
import type { TextInjectionService } from '../../../src/domain/services/TextInjectionService.js'
import type { StoryModel } from '../../../src/domain/model/StoryModel.js'

const createMockDeps = () => {
  const idmlRepository: IdmlRepository = {
    loadStories: vi.fn(),
    saveStories: vi.fn()
  }

  const translator: Translator = {
    translateBatch: vi.fn()
  }

  const logger: Logger = {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn()
  }

  const textExtraction: TextExtractionService = {
    extract: vi.fn()
  } as any

  const textInjection: TextInjectionService = {
    inject: vi.fn()
  } as any

  return { idmlRepository, translator, logger, textExtraction, textInjection }
}

describe('TranslateIdmlFile', () => {
  it('should orchestrate the complete translation workflow', async () => {
    const deps = createMockDeps()
    const useCase = new TranslateIdmlFile(deps)

    const stories: StoryModel[] = [
      { id: 'story1', xml: '<Story>hello</Story>' }
    ]

    const units = [
      new TranslationUnit('unit1', 'hello', new TextLocation('story1', [0], 'story1:0'))
    ]

    const translations = new Map([['unit1', 'witaj']])

    const updatedStories: StoryModel[] = [
      { id: 'story1', xml: '<Story>witaj</Story>' }
    ]

    vi.mocked(deps.idmlRepository.loadStories).mockResolvedValue(stories)
    vi.mocked(deps.textExtraction.extract).mockReturnValue(units)
    vi.mocked(deps.translator.translateBatch).mockResolvedValue(translations)
    vi.mocked(deps.textInjection.inject).mockReturnValue(updatedStories)
    vi.mocked(deps.idmlRepository.saveStories).mockResolvedValue('/path/output.idml')

    const result = await useCase.execute('/path/input.idml')

    expect(result).toBe('/path/output.idml')
    expect(deps.idmlRepository.loadStories).toHaveBeenCalledWith('/path/input.idml')
    expect(deps.textExtraction.extract).toHaveBeenCalledWith(stories)
    expect(deps.translator.translateBatch).toHaveBeenCalledWith(units)
    expect(deps.textInjection.inject).toHaveBeenCalledWith(stories, translations)
    expect(deps.idmlRepository.saveStories).toHaveBeenCalledWith('/path/input.idml', updatedStories)
  })
})
