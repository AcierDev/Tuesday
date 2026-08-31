import { PDFDocument } from "pdf-lib";

export async function splitPdfPages(pdfBuffer: Buffer): Promise<Buffer[]> {
  const source = await PDFDocument.load(pdfBuffer);

  return Promise.all(
    source.getPageIndices().map(async (pageIndex) => {
      const pagePdf = await PDFDocument.create();
      const [page] = await pagePdf.copyPages(source, [pageIndex]);
      if (!page) {
        throw new Error(`Unable to copy PDF page ${pageIndex + 1}.`);
      }
      pagePdf.addPage(page);
      return Buffer.from(await pagePdf.save());
    })
  );
}

export async function mergePdfPages(pageBuffers: Buffer[]): Promise<Buffer> {
  const merged = await PDFDocument.create();

  for (const pageBuffer of pageBuffers) {
    const source = await PDFDocument.load(pageBuffer);
    const copiedPages = await merged.copyPages(source, source.getPageIndices());
    copiedPages.forEach((page) => merged.addPage(page));
  }

  return Buffer.from(await merged.save());
}
