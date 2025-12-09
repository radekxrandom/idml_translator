import type { StoryModel } from '../model/StoryModel.js'
import type { TranslationUnit } from '../model/TranslationUnit.js'

type StoryParser = {
  extractTextUnitsFromStory: (story: StoryModel) => TranslationUnit[]
}

export class TextExtractionService {
  private readonly parser: StoryParser

  constructor(parser: StoryParser) {
    this.parser = parser
  }

  extract = (stories: StoryModel[]): TranslationUnit[] =>
    stories.flatMap(story => this.parser.extractTextUnitsFromStory(story))
}


