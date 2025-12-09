export class TextLocation {
  constructor(
    readonly storyId: string,
    readonly path: number[],
    readonly paragraphId: string
  ) {}

  toId = () => `${this.storyId}:${this.path.join('.')}`

  toParagraphId = () => this.paragraphId
}
