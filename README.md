# IDML Content Translator

translates adobe indesign idml files using openai's api while preserving all formatting, styles, and embedded elements.

currently translates to polish. uses hexagonal architecture so swapping translation providers or adding new languages is straightforward. non-text elements (images, hyperlinks) become placeholder tokens during translation, then get restored to their exact positions.

## architecture

hexagonal/clean architecture with ports and adapters. domain layer has no external dependencies, infrastructure implements the adapters (openai, xml parsing, file i/o), application layer orchestrates the workflow.

```
domain → application (ports) → infrastructure (adapters) → interface (cli)
```

## setup

requires node.js 18+ and an openai api key.

```bash
npm install
```

set environment variables:
```bash
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o     # optional
DEBUG_FILES=true        # optional, exports xml files
```

## usage

```bash
npm start -- path/to/file.idml
```

outputs `file.translated.idml` in the same directory.

## how it works

unzip idml → parse xml stories → replace non-text elements with `⟦ANCHOR_n⟧` tokens → translate via openai → inject translations back → restore anchors → rezip

validates anchor placeholders match before injecting to avoid breaking layouts. falls back to source text on api failures.

## testing

```bash
npm test
npm run test:ui
```

vitest with tests for xml parsing, anchor handling, translation injection, and error scenarios.

## limitations

- hardcoded to polish (easily configurable)
- parallel api calls could hit rate limits on large files
- no retry logic (fails gracefully to source text)
- limited amount of tests (i restricted them to only most important behaviors)

## why hexagonal architecture?

i could've made a quick script, but wanted to show production thinking. clean separation means swapping providers, adding languages, or building a web interface doesn't require rewriting core logic.
