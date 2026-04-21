# Knowledge Base

Drop Icertis-related documents here. Supported formats:

- `*.pdf`  — user guides, release notes, SOPs, training material
- `*.docx` — Word documents
- `*.txt`  — plain text
- `*.md`   — Markdown

## How to add / update documents

1. Add your file(s) to this folder
2. Commit and push to GitHub
3. Run the ingestion script **once** from your local machine:

```bash
npm run ingest
```

That's it. The chatbot at `/chat` will immediately use the new knowledge.

## Re-ingesting an updated document

To replace an existing document (e.g. you updated a PDF):

```bash
npm run ingest -- --force          # re-ingest ALL files
npm run ingest -- --file=guide.pdf # re-ingest one specific file
```

## Notes

- GitHub file limit: 100 MB per file, 1 GB per repo
- Text-based PDFs only — scanned / image-only PDFs produce no text
- First run may take 20–30 s for HuggingFace model warm-up
