import { describe, it, expect, vi } from 'vitest'
import { XmlStorySerializer } from '../../../src/infrastructure/idml/XmlStorySerializer.js'
import { XmlStoryParser } from '../../../src/infrastructure/idml/XmlStoryParser.js'
import type { StoryModel } from '../../../src/domain/model/StoryModel.js'
import type { Logger } from '../../../src/application/ports/Logger.js'

const createMockLogger = (): Logger => ({
  info: vi.fn(),
  debug: vi.fn(),
  error: vi.fn()
})

describe('XmlStorySerializer', () => {
  it('should inject translations into xml', () => {
    const xml = `<Story><ParagraphStyleRange><CharacterStyleRange><Content>hello world</Content></CharacterStyleRange></ParagraphStyleRange></Story>`
    const story: StoryModel = { id: 'story1', xml }

    const parser = new XmlStoryParser()
    const units = parser.extractTextUnitsFromStory(story)
    const translationId = units[0].id

    const translations = new Map([[translationId, 'witaj świecie']])

    const logger = createMockLogger()
    const serializer = new XmlStorySerializer(logger)
    const result = serializer.injectTranslations(story, translations)

    expect(result.xml).toContain('witaj świecie')
    expect(result.xml).not.toContain('hello world')
  })

  it('should preserve anchor placeholders in correct positions', () => {
    const xml = `<Story><ParagraphStyleRange><CharacterStyleRange><Content>before</Content><HyperlinkTextSource Self="link1"/><Content>after</Content></CharacterStyleRange></ParagraphStyleRange></Story>`
    const story: StoryModel = { id: 'story1', xml }

    const parser = new XmlStoryParser()
    const units = parser.extractTextUnitsFromStory(story)
    const translationId = units[0].id

    const translations = new Map([[translationId, 'przed⟦ANCHOR_0⟧po']])

    const logger = createMockLogger()
    const serializer = new XmlStorySerializer(logger)
    const result = serializer.injectTranslations(story, translations)

    expect(result.xml).toContain('przed')
    expect(result.xml).toContain('po')
    expect(result.xml).toContain('HyperlinkTextSource')
  })

  it('should log error when anchor count mismatches', () => {
    const xml = `<Story><ParagraphStyleRange><CharacterStyleRange><Content>text</Content><Br/><Content>more</Content></CharacterStyleRange></ParagraphStyleRange></Story>`
    const story: StoryModel = { id: 'story1', xml }

    const parser = new XmlStoryParser()
    const units = parser.extractTextUnitsFromStory(story)
    const translationId = units[0].id

    const translations = new Map([[translationId, 'translated without anchor']])

    const logger = createMockLogger()
    const serializer = new XmlStorySerializer(logger)
    serializer.injectTranslations(story, translations)

    expect(logger.error).toHaveBeenCalledWith(
      'xml serializer: anchor placeholder count mismatch',
      expect.objectContaining({ expected: 1, actual: 0 })
    )
  })
})
