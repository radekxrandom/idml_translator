import fs from 'node:fs/promises'
import path from 'node:path'
import JSZip from 'jszip'
import type { StoryModel } from '../../domain/model/StoryModel.js'
import type { IdmlRepository } from '../../application/ports/IdmlRepository.js'
import type { Logger } from '../../application/ports/Logger.js'

export class ZipIdmlRepository implements IdmlRepository {
  private readonly logger: Logger
  private readonly debugFiles: boolean
  private readonly debugDirName = '.stories'

  constructor(logger: Logger, debugFiles: boolean = false) {
    this.logger = logger
    this.debugFiles = debugFiles
  }

  loadStories = async (filePath: string): Promise<StoryModel[]> => {
    this.logger.info('reading idml archive', { filePath })

    const buffer = await fs.readFile(filePath)
    const zip = await JSZip.loadAsync(buffer)
    const stories: StoryModel[] = []

    const storyEntries = Object.entries(zip.files).filter(
      ([name, entry]) => !entry.dir && name.startsWith('Stories/') && name.endsWith('.xml')
    )

    await Promise.all(
      storyEntries.map(async ([name, entry]) => {
        const xml = await entry.async('string')
        const id = path.basename(name, '.xml')
        stories.push({ id, xml })
      })
    )

    this.logger.debug('loaded stories from idml', { count: stories.length })
    if (this.debugFiles) {
      await this.writeStoriesDebug(filePath, stories, 'loaded')
    }
    return stories
  }

  saveStories = async (originalFilePath: string, stories: StoryModel[]): Promise<string> => {
    this.logger.info('writing translated idml archive', { originalFilePath })

    const originalBuffer = await fs.readFile(originalFilePath)
    const zip = await JSZip.loadAsync(originalBuffer)

    for (const story of stories) {
      const storyPath = `Stories/${story.id}.xml`
      zip.file(storyPath, story.xml)
    }

    if (this.debugFiles) {
      await this.writeStoriesDebug(originalFilePath, stories, 'translated')
    }

    const outputBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 }
    })
    const { dir, name, ext } = path.parse(originalFilePath)
    const outputPath = path.join(dir, `${name}.translated${ext}`)

    await fs.writeFile(outputPath, outputBuffer)

    this.logger.info('wrote translated idml archive', { outputPath })
    return outputPath
  }

  private writeStoriesDebug = async (
    originalFilePath: string,
    stories: StoryModel[],
    label: 'loaded' | 'translated'
  ): Promise<void> => {
    const { dir, name } = path.parse(originalFilePath)
    const debugDir = path.join(dir, `${name}.${label}${this.debugDirName}`)

    await fs.mkdir(debugDir, { recursive: true })

    await Promise.all(
      stories.map(async story => {
        const storyPath = path.join(debugDir, `${story.id}.xml`)
        await fs.writeFile(storyPath, story.xml, 'utf-8')
      })
    )
  }
}
