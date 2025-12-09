import { DOMParser, XMLSerializer } from 'xmldom'
import type { StoryModel } from '../../domain/model/StoryModel.js'
import type { Logger } from '../../application/ports/Logger.js'
import {
  buildParagraphSource,
  walkParagraphStyleRanges
} from './XmlStoryParser.js'

const domParser = new DOMParser()
const xmlSerializer = new XMLSerializer()

const collectParagraphAnchors = (root: Element): Element[] => {
  const anchors: Element[] = []

  const walk = (node: Node) => {
    if (node.nodeType !== 1) return

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

    anchors.push(el)
  }

  walk(root)
  return anchors
}

const collectParagraphContents = (root: Element): Element[] => {
  const contents: Element[] = []

  const walk = (node: Node) => {
    if (node.nodeType !== 1) return

    const el = node as Element

    if (el.nodeName === 'Content') {
      contents.push(el)
    }

    const children = el.childNodes
    if (!children) return

    Array.from(children).forEach(child => {
      walk(child)
    })
  }

  walk(root)
  return contents
}

const mapParagraphContentRegions = (root: Element, anchors: Element[]): Map<Element, number> => {
  const regions = new Map<Element, number>()
  const anchorSet = new Set(anchors)
  let regionIndex = 0

  const walk = (node: Node) => {
    if (node.nodeType !== 1) return

    const el = node as Element

    if (anchorSet.has(el)) {
      regionIndex += 1
      return
    }

    if (el.nodeName === 'Content') {
      regions.set(el, regionIndex)
    }

    const children = el.childNodes
    if (!children) return

    Array.from(children).forEach(child => {
      walk(child)
    })
  }

  walk(root)
  return regions
}

export class XmlStorySerializer {
  private readonly logger: Logger

  constructor(logger: Logger) {
    this.logger = logger
  }

  injectTranslations = (story: StoryModel, translations: Map<string, string>): StoryModel => {
    const doc = domParser.parseFromString(story.xml, 'application/xml')

    let applied = 0
    const placeholderRegex = /⟦ANCHOR_(\d+)⟧/g

    walkParagraphStyleRanges(doc, story.id, (location, element) => {
      const id = location.toId()
      const nextValue = translations.get(id)
      if (typeof nextValue !== 'string') return

      const before = buildParagraphSource(element)
      if (before === nextValue) return
      const anchors = collectParagraphAnchors(element)
      const expectedAnchors = anchors.map((_, index) => `⟦ANCHOR_${index}⟧`)

      const foundAnchors: string[] = []
      let match: RegExpExecArray | null

      placeholderRegex.lastIndex = 0
      while ((match = placeholderRegex.exec(nextValue)) !== null) {
        foundAnchors.push(match[0])
      }

      if (foundAnchors.length !== expectedAnchors.length) {
        this.logger.error('xml serializer: anchor placeholder count mismatch', {
          storyId: story.id,
          id,
          expected: expectedAnchors.length,
          actual: foundAnchors.length
        })
        return
      }

      const segments: string[] = []
      let lastIndex = 0

      placeholderRegex.lastIndex = 0
      while ((match = placeholderRegex.exec(nextValue)) !== null) {
        const token = match[0]
        segments.push(nextValue.slice(lastIndex, match.index))
        lastIndex = match.index + token.length
      }
      segments.push(nextValue.slice(lastIndex))

      const docRef = element.ownerDocument as Document
      const contents = collectParagraphContents(element)
      const contentRegions = mapParagraphContentRegions(element, anchors)
      const regionUsed = new Map<number, boolean>()

      for (const content of contents) {
        const region = contentRegions.get(content) ?? 0
        const fullSegment = segments[region] ?? ''
        const alreadyUsed = regionUsed.get(region) ?? false
        const segment = alreadyUsed ? '' : fullSegment
        regionUsed.set(region, true)

        while (content.firstChild) {
          content.removeChild(content.firstChild)
        }

        if (segment.length > 0) {
          content.appendChild(docRef.createTextNode(segment))
        }
      }

      applied += 1
    })

    const xml = xmlSerializer.serializeToString(doc)

    return { ...story, xml }
  }
}
