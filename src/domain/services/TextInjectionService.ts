import type { StoryModel } from '../model/StoryModel.js'
import type { Logger } from '../../application/ports/Logger.js'

type StorySerializer = {
  injectTranslations: (story: StoryModel, translations: Map<string, string>) => StoryModel
}

type TextInjectionServiceDeps = {
  serializer: StorySerializer
  logger: Logger
}

export class TextInjectionService {
  private readonly serializer: StorySerializer
  private readonly logger: Logger

  constructor(deps: TextInjectionServiceDeps) {
    this.serializer = deps.serializer
    this.logger = deps.logger
  }

  inject = (stories: StoryModel[], translations: Map<string, string>): StoryModel[] => {
    this.logger.debug('text injection: start', {
      stories: stories.length,
      translations: translations.size
    })

    let updatedCount = 0

    const result = stories.map(story => {
      const before = story.xml
      const after = this.serializer.injectTranslations(story, translations)

      if (before !== after.xml) {
        updatedCount += 1
      }

      return after
    })

    this.logger.debug('text injection: done', { storiesUpdated: updatedCount })
    return result
  }
}
