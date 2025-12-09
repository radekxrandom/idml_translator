import { describe, it, expect } from 'vitest'
import { XmlStoryParser } from '../../../src/infrastructure/idml/XmlStoryParser.js'
import type { StoryModel } from '../../../src/domain/model/StoryModel.js'

describe('XmlStoryParser', () => {
  it('should extract text from paragraphs', () => {
    const xml = `
      <Story>
        <ParagraphStyleRange>
          <CharacterStyleRange>
            <Content>hello world</Content>
          </CharacterStyleRange>
        </ParagraphStyleRange>
      </Story>
    `

    const story: StoryModel = { id: 'story1', xml }
    const parser = new XmlStoryParser()
    const units = parser.extractTextUnitsFromStory(story)

    expect(units).toHaveLength(1)
    expect(units[0].source).toBe('hello world')
  })

  it('should replace non-content elements with anchor placeholders', () => {
    const xml = `
      <Story>
        <ParagraphStyleRange>
          <CharacterStyleRange>
            <Content>before</Content>
            <HyperlinkTextSource Self="link1" />
            <Content>after</Content>
          </CharacterStyleRange>
        </ParagraphStyleRange>
      </Story>
    `

    const story: StoryModel = { id: 'story1', xml }
    const parser = new XmlStoryParser()
    const units = parser.extractTextUnitsFromStory(story)

    expect(units[0].source).toBe('before⟦ANCHOR_0⟧after')
  })

  it('should handle multiple anchors correctly', () => {
    const xml = `
      <Story>
        <ParagraphStyleRange>
          <CharacterStyleRange>
            <Content>text</Content>
            <Rectangle />
            <Content>more</Content>
            <Image />
            <Content>end</Content>
          </CharacterStyleRange>
        </ParagraphStyleRange>
      </Story>
    `

    const story: StoryModel = { id: 'story1', xml }
    const parser = new XmlStoryParser()
    const units = parser.extractTextUnitsFromStory(story)

    expect(units[0].source).toBe('text⟦ANCHOR_0⟧more⟦ANCHOR_1⟧end')
  })

  it('should skip empty paragraphs', () => {
    const xml = `
      <Story>
        <ParagraphStyleRange>
          <CharacterStyleRange>
            <Content></Content>
          </CharacterStyleRange>
        </ParagraphStyleRange>
        <ParagraphStyleRange>
          <CharacterStyleRange>
            <Content>not empty</Content>
          </CharacterStyleRange>
        </ParagraphStyleRange>
      </Story>
    `

    const story: StoryModel = { id: 'story1', xml }
    const parser = new XmlStoryParser()
    const units = parser.extractTextUnitsFromStory(story)

    expect(units).toHaveLength(1)
    expect(units[0].source).toBe('not empty')
  })
})
