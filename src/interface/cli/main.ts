import { fileURLToPath } from 'node:url'
import { loadEnv } from '../../config/env.js'
import { ConsoleLogger } from '../../infrastructure/logging/ConsoleLogger.js'
import { ZipIdmlRepository } from '../../infrastructure/idml/ZipIdmlRepository.js'
import { XmlStoryParser } from '../../infrastructure/idml/XmlStoryParser.js'
import { XmlStorySerializer } from '../../infrastructure/idml/XmlStorySerializer.js'
import { OpenAITranslator } from '../../infrastructure/translation/OpenAITranslator.js'
import { TextExtractionService } from '../../domain/services/TextExtractionService.js'
import { TextInjectionService } from '../../domain/services/TextInjectionService.js'
import { TranslateIdmlFile } from '../../application/usecases/TranslateIdmlFile.js'

export const run = async (argv: string[]): Promise<number> => {
  const [, , filePath] = argv

  if (!filePath) {
    // eslint-disable-next-line no-console
    console.error('usage: npm start -- <file.idml>')
    return 1
  }

  const config = loadEnv()
  const logger = new ConsoleLogger()

  const idmlRepository = new ZipIdmlRepository(logger, config.debugFiles)
  const xmlParser = new XmlStoryParser()
  const xmlSerializer = new XmlStorySerializer(logger)

  const textExtraction = new TextExtractionService(xmlParser)
  const textInjection = new TextInjectionService({ serializer: xmlSerializer, logger })

  if (!config.openaiApiKey) {
    logger.error('missing OPENAI_API_KEY')
    return 1
  }

  const translator = new OpenAITranslator(
    { apiKey: config.openaiApiKey, model: config.openaiModel },
    logger
  )

  const useCase = new TranslateIdmlFile({
    idmlRepository,
    translator,
    logger,
    textExtraction,
    textInjection
  })

  try {
    const outputPath = await useCase.execute(filePath)
    logger.info('translation completed', { outputPath })
    return 0
  } catch (err) {
    const error = err as Error
    logger.error('translation failed', { message: error.message })
    return 1
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run(process.argv)
    .then(process.exit)
    .catch(() => process.exit(1))
}
