import jsPDF from "jspdf";

const normalize = (value) => {
  if (value == null) return "";
  if (Array.isArray(value)) return value.map(normalize).filter(Boolean).join("\n");
  if (typeof value === "object") {
    if (value.content != null || value.text != null || value.value != null) {
      return normalize(value.content ?? value.text ?? value.value);
    }
    return Object.entries(value)
      .map(([key, item]) => `${key}: ${normalize(item)}`)
      .join("\n");
  }
  return String(value).replace(/\\r\\n|\\n|\\r/g, "\n").replace(/\r\n?/g, "\n").trim();
};

const roman = (value) => {
  const symbols = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let remaining = value;
  return symbols.reduce((result, [number, symbol]) => {
    while (remaining >= number) {
      result += symbol;
      remaining -= number;
    }
    return result;
  }, "");
};

export function downloadProjectPdf({ title, authors, abstract, sections, filename }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 52;
  const gap = 22;
  const fullWidth = pageWidth - margin * 2;
  const columnWidth = (fullWidth - gap) / 2;
  const bottom = pageHeight - 46;
  let y = 48;
  let column = 0;
  let firstColumnTop = 48;

  const addPage = () => {
    doc.addPage();
    y = 48;
    column = 0;
  };
  const nextColumn = () => {
    if (column === 0) {
      column = 1;
      y = firstColumnTop;
    } else {
      addPage();
    }
  };
  const ensureColumnSpace = (height) => {
    if (y + height > bottom) nextColumn();
  };
  const columnX = () => margin + (column ? columnWidth + gap : 0);

  doc.setFont("times", "bold");
  doc.setFontSize(19);
  const titleLines = doc.splitTextToSize(normalize(title) || "Research Paper", fullWidth);
  titleLines.forEach((line) => {
    if (y + 23 > bottom) addPage();
    doc.text(line, pageWidth / 2, y, { align: "center" });
    y += 23;
  });
  y += 10;

  const authorText = Array.isArray(authors) ? authors.join(", ") : normalize(authors);
  if (authorText) {
    doc.setFont("times", "italic");
    doc.setFontSize(8.5);
    doc.splitTextToSize(authorText, fullWidth).forEach((line) => {
      if (y + 12 > bottom) addPage();
      doc.text(line, pageWidth / 2, y, { align: "center" });
      y += 12;
    });
    y += 8;
  }

  if (normalize(abstract)) {
    doc.setFont("times", "bolditalic");
    doc.setFontSize(9.5);
    doc.text("ABSTRACT", pageWidth / 2, y, { align: "center" });
    y += 16;
    doc.setFont("times", "normal");
    doc.setFontSize(9);
    const abstractParagraphs = normalize(abstract).split(/\n\s*\n+/).filter(Boolean);
    abstractParagraphs.forEach((paragraph) => {
      const lines = doc.splitTextToSize(paragraph.replace(/\s*\n\s*/g, " "), fullWidth);
      lines.forEach((line) => {
        if (y + 12 > bottom) addPage();
        doc.text(line, margin, y);
        y += 12;
      });
      y += 4;
    });
  }
  y += 10;
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 17;
  firstColumnTop = y;

  const writeParagraph = (text) => {
    const blocks = normalize(text).split(/\n\s*\n+|\n/).map((block) => block.trim()).filter(Boolean);
    blocks.forEach((block) => {
      const lines = doc.splitTextToSize(block.replace(/\s+/g, " "), columnWidth);
      ensureColumnSpace(Math.min(lines.length, 2) * 12 + 2);
      doc.setFont("times", "normal");
      doc.setFontSize(9);
      lines.forEach((line) => {
        ensureColumnSpace(12);
        doc.text(line, columnX(), y);
        y += 12;
      });
      y += 4;
    });
  };

  const writeListItem = (text, marker = "•") => {
    doc.setFont("times", "normal");
    doc.setFontSize(9);
    const indent = marker === "•" ? 15 : doc.getTextWidth(`${marker} `);
    const lines = doc.splitTextToSize(normalize(text), columnWidth - indent);
    ensureColumnSpace(Math.min(lines.length, 2) * 12 + 2);
    lines.forEach((line, index) => {
      ensureColumnSpace(12);
      if (index === 0) doc.text(`${marker} `, columnX(), y);
      doc.text(line, columnX() + indent, y);
      y += 12;
    });
    y += 2;
  };

  const writeSectionContent = (content, isReferences = false) => {
    const normalized = normalize(content);
    if (isReferences) {
      normalized.split("\n").map((line) => line.trim()).filter(Boolean).forEach((entry, index) => {
        const match = entry.match(/^\[(\d+)\]\s*(.*)$|^(\d+)[.)]\s+(.*)$/);
        const number = match?.[1] || match?.[3] || String(index + 1);
        const citation = match?.[2] || match?.[4] || entry;
        writeListItem(citation, `[${number}]`);
      });
      return;
    }

    normalized.split(/\n\s*\n+/).filter(Boolean).forEach((block) => {
      const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
      if (lines.length > 1 && lines.every((line) => /^(?:\d+[.)]|[-*•])\s+/.test(line))) {
        lines.forEach((line) => {
          const match = line.match(/^(\d+[.)]|[-*•])\s+(.+)$/);
          writeListItem(match[2], match[1].replace(/[.)]$/, "."));
        });
      } else {
        writeParagraph(block);
      }
    });
  };

  let sectionNumber = 0;
  (Array.isArray(sections) ? sections : []).forEach((section) => {
    const headingText = normalize(section?.title) || "Section";
    const isReferences = /^(references|bibliography)$/i.test(headingText.trim());
    if (!isReferences) sectionNumber += 1;
    const heading = `${isReferences ? "" : `${roman(sectionNumber)}. `}${headingText}`.toUpperCase();
    const headingLines = doc.splitTextToSize(heading, columnWidth);
    ensureColumnSpace(headingLines.length * 12 + 24);
    y += 5;
    doc.setFont("times", "bold");
    doc.setFontSize(9.5);
    headingLines.forEach((line) => {
      ensureColumnSpace(12);
      doc.text(line, columnX() + columnWidth / 2, y, { align: "center" });
      y += 12;
    });
    y += 3;
    writeSectionContent(section?.content, isReferences);
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont("times", "normal");
    doc.setFontSize(8);
    doc.setTextColor(90, 90, 90);
    doc.text(String(page), pageWidth / 2, pageHeight - 22, { align: "center" });
  }
  const safeName = String(filename || title || "research_project")
    .replace(/[^a-z0-9]/gi, "_")
    .toLowerCase();
  doc.save(`${safeName}.pdf`);
}
