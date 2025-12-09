import { TextLocation } from './TextLocation.js'

export class TranslationUnit {
  constructor(
    readonly id: string,
    readonly source: string,
    readonly location: TextLocation
  ) {}
}
