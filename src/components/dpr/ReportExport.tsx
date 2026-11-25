"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type Section = { title: string; content: ReactNode };
type Mode = "summary" | "report";
type ReportDetails = { applicant: string; loan: string; bank: string; branch: string };
type Preview = { url: string; pages: string[]; filename: string };
const paper = { width: 1122, height: 793 };
const pixelRatio = 2;
const pageBackground = "#faf7fc";

function fitOnPaper(source: HTMLCanvasElement) {
  const width = paper.width * pixelRatio;
  const height = paper.height * pixelRatio;
  if (source.width === width && source.height === height) return source;

  const page = document.createElement("canvas");
  page.width = width;
  page.height = height;
  const context = page.getContext("2d");
  if (!context) throw new Error("Could not prepare the A4 PDF page.");
  const scale = Math.min(width / source.width, height / source.height);
  const scaledWidth = source.width * scale;
  const scaledHeight = source.height * scale;
  context.fillStyle = pageBackground;
  context.fillRect(0, 0, width, height);
  context.drawImage(source, (width - scaledWidth) / 2, 0, scaledWidth, scaledHeight);
  return page;
}

function element(className: string, text?: string) {
  const node = document.createElement("div");
  node.className = className;
  if (text) node.textContent = text;
  return node;
}

async function generate(stage: HTMLElement, mode: Mode, { applicant, loan, bank, branch }: ReportDetails): Promise<Preview> {
  const [{ toCanvas }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);
  await document.fonts.ready;
  const output = element("dpr-export-output");
  stage.append(output);

  const sheets: HTMLElement[] = [];
  const footers: HTMLElement[] = [];
  function sheet(title?: string) {
    const page = element("dpr-export-sheet report");
    const header = element("dpr-export-header");
    header.append(element("dpr-export-brand", "SAVLINO"), element("dpr-export-bank", `${bank} · MUDRA Tarun · ${loan}`));
    const heading = document.createElement("h2");
    if (title) heading.textContent = title;
    const content = element("dpr-export-content");
    const footer = element("dpr-export-footer", "SAVLINO · DPR projections and illustrative financing terms");
    page.append(header);
    if (title) page.append(heading);
    page.append(content, footer);
    output.append(page);
    sheets.push(page);
    footers.push(footer);
    return content;
  }

  try {
    if (mode === "report") {
      const cover = sheet("Detailed Project Report");
      cover.classList.add("dpr-export-cover");
      const main = element("dpr-cover-main");
      const project = element("dpr-cover-project");
      project.append(
        element("dpr-cover-website", "www.savlino.in"),
        element("dpr-export-cover-title", "Women’s blouse and apparel manufacturing"),
        element("dpr-export-cover-line", "Online retail and local orders · Bhopal, Madhya Pradesh"),
      );
      const recipient = element("dpr-cover-recipient");
      recipient.append(
        element("dpr-cover-label", "SUBMITTED TO"),
        element("dpr-export-cover-line", "The Branch Manager"),
        element("dpr-cover-name", bank),
        element("dpr-export-cover-line", branch),
        element("dpr-cover-label dpr-cover-loan-label", "MUDRA TARUN LOAN REQUEST"),
        element("dpr-cover-loan", loan),
      );
      main.append(project, recipient);
      const credits = element("dpr-cover-credits");
      const applicantBlock = element("dpr-cover-credit");
      applicantBlock.append(
        element("dpr-cover-label", "PREPARED FOR"),
        element("dpr-cover-name", applicant || "Proposed proprietor of SAVLINO"),
        element("dpr-export-cover-line", "Applicant · SAVLINO"),
      );
      const preparer = element("dpr-cover-credit");
      preparer.append(
        element("dpr-cover-label", "PREPARED BY"),
        element("dpr-cover-name", "Authorized Officer"),
        element("dpr-export-cover-line", "Savrdh Financial Services Private Limited"),
        element("dpr-cover-website", "www.savrdhfinancialservices.com"),
      );
      credits.append(applicantBlock, preparer);
      cover.append(main, credits, element("dpr-cover-date", "Report date · 25 November 2026"));
    }

    const sources = Array.from(stage.querySelectorAll<HTMLElement>("[data-export-section]"));
    let page: HTMLElement | undefined;
    const fits = (content: HTMLElement) => content.scrollHeight <= content.clientHeight + 1;

    sources.forEach((source, index) => {
      const title = source.dataset.exportSection ?? "";
      const root = source.firstElementChild?.classList.contains("detail") ? source.firstElementChild : source;
      if (index === 0) {
        const summary = sheet(title);
        for (const block of root.children) summary.append(block.cloneNode(true));
        return;
      }

      const heading = (continued = false) => element("dpr-flow-heading", continued ? `${title} · Continued` : title);
      for (const [blockIndex, block] of Array.from(root.children).entries()) {
        page ??= sheet();
        const first = blockIndex === 0;
        const sectionHeading = first ? heading() : undefined;
        if (sectionHeading) page.append(sectionHeading);
        const copy = block.cloneNode(true) as HTMLElement;
        page.append(copy);
        if (fits(page)) continue;

        // Keep a section heading with its first card and move intact cards to a fresh page.
        if (page.children.length > (first ? 2 : 1)) {
          copy.remove();
          sectionHeading?.remove();
          page = sheet();
          page.append(first ? heading() : heading(true), copy);
        }

        // Split an oversized table by whole rows. Each fragment retains its caption and column headers.
        const rowGroup = copy.querySelector("tbody");
        if (fits(page) || !rowGroup || copy.querySelectorAll("table").length !== 1) continue;
        const rows = Array.from(rowGroup.rows);
        rowGroup.replaceChildren();
        let currentRows = rowGroup;
        for (const row of rows) {
          currentRows.append(row);
          if (!fits(page) && currentRows.rows.length > 1) {
            row.remove();
            page = sheet();
            const continuation = copy.cloneNode(true) as HTMLElement;
            const continuationRows = continuation.querySelector("tbody");
            if (!continuationRows) throw new Error("Could not continue the DPR table.");
            currentRows = continuationRows;
            currentRows.replaceChildren(row);
            page.append(heading(true), continuation);
          }
        }
      }
    });

    footers.forEach((footer, index) => {
      footer.textContent = `SAVLINO · DPR projections and illustrative financing terms  |  ${index + 1} / ${sheets.length}`;
    });

    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
    pdf.setProperties({ title: mode === "summary" ? "SAVLINO — Executive Summary" : "SAVLINO — Detailed Project Report" });
    const pages: string[] = [];
    for (const [index, page] of sheets.entries()) {
      // Lay out the entire sheet, including anything taller than the nominal paper,
      // then scale the capture into A4 without cropping charts or table rows.
      page.style.height = "auto";
      page.style.minHeight = `${paper.height}px`;
      const canvas = await toCanvas(page, {
        width: Math.max(paper.width, page.scrollWidth),
        height: Math.max(paper.height, page.offsetHeight, page.scrollHeight),
        pixelRatio,
        backgroundColor: pageBackground,
        skipFonts: true,
      });
      const fitted = fitOnPaper(canvas);
      const image = fitted.toDataURL("image/jpeg", .94);
      fitted.width = fitted.height = 0;
      canvas.width = canvas.height = 0;
      pages.push(image);
      if (index > 0) pdf.addPage("a4", "landscape");
      pdf.addImage(image, "JPEG", 0, 0, 297, 210);
    }
    return { pages, url: URL.createObjectURL(pdf.output("blob")), filename: mode === "summary"
      ? "SAVLINO_DPR_Executive_Summary.pdf" : "SAVLINO_Detailed_Project_Report.pdf" };
  } finally {
    output.remove();
  }
}

export function ReportExport({ summary, reportSections, applicant, loan, bank, branch }: {
  summary: ReactNode; reportSections: Section[];
} & ReportDetails) {
  const [mode, setMode] = useState<Mode>();
  const [preview, setPreview] = useState<Preview>();
  const [error, setError] = useState("");
  const [snapshot, setSnapshot] = useState<{ sections: Section[] } & ReportDetails>();
  const dialog = useRef<HTMLDialogElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const blob = useRef<string | undefined>(undefined);
  const busy = useRef(false);
  const sequence = useRef(0);

  function close() {
    sequence.current++;
    busy.current = false;
    if (blob.current) URL.revokeObjectURL(blob.current);
    blob.current = undefined;
    setMode(undefined);
    setPreview(undefined);
    setSnapshot(undefined);
    setError("");
  }

  useEffect(() => () => {
    sequence.current++;
    if (blob.current) URL.revokeObjectURL(blob.current);
  }, []);

  useEffect(() => {
    if (!mode || !snapshot) return;
    const current = ++sequence.current;
    const root = stage.current;
    if (!root) return;
    generate(root, mode, snapshot).then((result) => {
      if (sequence.current !== current) {
        URL.revokeObjectURL(result.url);
        return;
      }
      blob.current = result.url;
      setPreview(result);
    }).catch((cause: unknown) => {
      if (sequence.current !== current) return;
      setError(cause instanceof Error ? cause.message : "Could not render the PDF. Close this preview and try again.");
    });
  }, [mode, snapshot]);

  function open(next: Mode) {
    if (busy.current) return;
    busy.current = true;
    setSnapshot({ applicant, loan, bank, branch, sections: next === "summary"
      ? [{ title: "Executive Summary Dashboard", content: summary }] : reportSections });
    setMode(next);
    dialog.current?.showModal();
  }

  return <>
    <button className="print" type="button" onClick={() => open("summary")}>Preview dashboard PDF</button>
    <button className="print" type="button" onClick={() => open("report")}>Preview full DPR PDF</button>
    <dialog className="dpr-preview" ref={dialog} onClose={close} aria-labelledby="dpr-preview-title">
      <div className="dpr-preview-toolbar">
        <h2 id="dpr-preview-title">{mode === "summary" ? "Dashboard PDF preview" : "Full DPR PDF preview"}</h2>
        <span>{preview ? `A4 landscape · ${preview.pages.length} ${preview.pages.length === 1 ? "page" : "pages"}` : ""}</span>
        {preview && <a className="print" href={preview.url} download={preview.filename}>Download PDF</a>}
        <button className="print" type="button" onClick={() => dialog.current?.close()}>Close</button>
      </div>
      {error ? <p className="error" role="alert">{error}</p> : preview ? <div className="dpr-preview-pages">
        {preview.pages.map((src, index) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={index} src={src} alt={`PDF page ${index + 1} of ${preview.pages.length}`} loading="lazy" />
        ))}
      </div> : <p role="status">Preparing PDF preview…</p>}
    </dialog>
    {snapshot && <div className="dpr-export-stage" aria-hidden="true" inert ref={stage}>
      {snapshot.sections.map(({ title, content }) => <div key={title} data-export-section={title}>{content}</div>)}
    </div>}
  </>;
}
