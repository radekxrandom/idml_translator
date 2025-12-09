import type { IdmlRepository } from '../ports/IdmlRepository.js'
import type { Translator } from '../ports/Translator.js'
import type { Logger } from '../ports/Logger.js'
import type { TextExtractionService } from '../../domain/services/TextExtractionService.js'
import type { TextInjectionService } from '../../domain/services/TextInjectionService.js'

type TranslateIdmlFileDeps = {
  idmlRepository: IdmlRepository
  translator: Translator
  logger: Logger
  textExtraction: TextExtractionService
  textInjection: TextInjectionService
}

export class TranslateIdmlFile {
  private readonly deps: TranslateIdmlFileDeps

  constructor(deps: TranslateIdmlFileDeps) {
    this.deps = deps
  }

  execute = async (filePath: string): Promise<string> => {
    const { logger, idmlRepository, textExtraction, translator, textInjection } = this.deps

    logger.info('starting idml translation', { filePath })

    const stories = await idmlRepository.loadStories(filePath)
    logger.debug('loaded stories', { count: stories.length })

    const units = textExtraction.extract(stories)
    logger.debug('extracted translation units', { count: units.length })

    const translations = await translator.translateBatch(units)
    logger.debug('received translations', { count: translations.size })

    const updatedStories = textInjection.inject(stories, translations)
    logger.debug('injected translations into stories', { count: updatedStories.length })

    const outputPath = await idmlRepository.saveStories(filePath, updatedStories)
    logger.info('finished idml translation', { outputPath })

    return outputPath
  }
}


