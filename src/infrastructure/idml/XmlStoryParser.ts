import { DOMParser } from 'xmldom'
import type { StoryModel } from '../../domain/model/StoryModel.js'
import { TextLocation } from '../../domain/model/TextLocation.js'
import { TranslationUnit } from '../../domain/model/TranslationUnit.js'

const domParser = new DOMParser()

type StyleRangeVisitor = (location: TextLocation, element: Element) => void

const ANCHOR_PLACEHOLDER_PREFIX = '⟦ANCHOR_'
const ANCHOR_PLACEHOLDER_SUFFIX = '⟧'

export const walkParagraphStyleRanges = (
  root: Node,
  storyId: string,
  visit: StyleRangeVisitor
) => {
  const walk = (node: Node, path: number[]) => {
    const nodeType = node.nodeType

    if (nodeType === 1 && (node as Element).nodeName === 'ParagraphStyleRange') {
      const paragraphId = `${storyId}:${path.join('.')}`
      const location = new TextLocation(storyId, path, paragraphId)
      visit(location, node as Element)
    }

    const children = node.childNodes
    if (!children) return

    Array.from(children).forEach((child, index) => {
      walk(child, [...path, index])
    })
  }

  walk(root, [])
}

export const buildParagraphSource = (paragraph: Element): string => {
  let buffer = ''
  let anchorIndex = 0

  const walk = (node: Node) => {
    if (node.nodeType === 3) {
      const parent = node.parentNode as Element | null
      if (!parent || parent.nodeType !== 1 || parent.nodeName !== 'Content') {
        return
      }

      buffer += node.nodeValue ?? ''
      return
    }

    if (node.nodeType === 1) {
      const el = node as Element

      if (
        el.nodeName === 'ParagraphStyleRange' ||
        el.nodeName === 'CharacterStyleRange' ||
        el.nodeName === 'Content'
      ) {
        const children = el.childNodes
        if (!children) return

        Array.from(children).forEach(child => {
          walk(child)
        })

        return
      }

      const placeholder = `${ANCHOR_PLACEHOLDER_PREFIX}${anchorIndex}${ANCHOR_PLACEHOLDER_SUFFIX}`
      buffer += placeholder
      anchorIndex += 1
    }
  }

  walk(paragraph)
  return buffer
}

export class XmlStoryParser {
  extractTextUnitsFromStory = (story: StoryModel): TranslationUnit[] => {
    const doc = domParser.parseFromString(story.xml, 'application/xml')
    const units: TranslationUnit[] = []

    walkParagraphStyleRanges(doc, story.id, (location, element) => {
      const id = location.toId()
      const source = buildParagraphSource(element)

      if (source.trim().length === 0) return

      units.push(new TranslationUnit(id, source, location))
    })

    return units
  }
}
