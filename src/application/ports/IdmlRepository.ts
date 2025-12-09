import type { StoryModel } from '../../domain/model/StoryModel.js'

export interface IdmlRepository {
  loadStories: (filePath: string) => Promise<StoryModel[]>
  saveStories: (originalFilePath: string, stories: StoryModel[]) => Promise<string>
}


