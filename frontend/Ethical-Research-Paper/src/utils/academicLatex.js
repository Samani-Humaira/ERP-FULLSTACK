const latexEscapes = {
  "\\": "\\textbackslash{}",
  "{": "\\{",
  "}": "\\}",
  "%": "\\%",
  "$": "\\$",
  "&": "\\&",
  "#": "\\#",
  "_": "\\_",
  "^": "\\textasciicircum{}",
  "~": "\\textasciitilde{}",
  "<": "\\textless{}",
  ">": "\\textgreater{}",
};

const escapeLatex = (value) =>
  String(value ?? "").replace(/[\\{}%$&#_^~<>]/g, (character) => latexEscapes[character]);

const normalizeText = (value) =>
  String(value ?? "")
    .replace(/\\n/g, "\n")
    .replace(/\r\n?/g, "\n")
    .trim();

const renderText = (value) => {
  const lines = normalizeText(value).split("\n");
  const output = [];
  let paragraph = [];
  let list = [];
  let listType = null;

  const flushParagraph = () => {
    if (paragraph.length) {
      output.push(escapeLatex(paragraph.join(" ")));
      paragraph = [];
    }
  };

  const flushList = () => {
    if (!list.length) return;
    const environment = listType === "enumerate" ? "enumerate" : "itemize";
    output.push(
      [
        `\\begin{${environment}}[leftmargin=*, itemsep=2pt]`,
        ...list.map((item) => `\\item ${escapeLatex(item)}`),
        `\\end{${environment}}`,
      ].join("\n"),
    );
    list = [];
    listType = null;
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      return;
    }

    const match = trimmed.match(/^(?:(\d+)[.)]|[-*•●▪◦])\s+(.+)$/);
    if (match) {
      flushParagraph();
      const nextType = match[1] ? "enumerate" : "itemize";
      if (listType && listType !== nextType) flushList();
      listType = nextType;
      list.push(match[2]);
      return;
    }

    flushList();
    paragraph.push(trimmed);
  });

  flushParagraph();
  flushList();
  return output.join("\n\n");
};

const renderValue = (value, listEnvironment = "itemize") => {
  if (value === null || value === undefined || value === "") return "";
  if (Array.isArray(value)) {
    const environment = listEnvironment === "enumerate" ? "enumerate" : "itemize";
    return [
      `\\begin{${environment}}[leftmargin=*, itemsep=2pt]`,
      ...value.map((item) => `\\item ${renderValue(item) || escapeLatex(item)}`),
      `\\end{${environment}}`,
    ].join("\n");
  }
  if (typeof value === "object") {
    return Object.entries(value)
      .map(
        ([key, item]) =>
          `\\textbf{${escapeLatex(key)}}: ${renderValue(item)}`,
      )
      .join("\n\n");
  }
  return renderText(value);
};

const citationText = (reference, index) => {
  if (typeof reference === "string") {
    return reference.replace(/^\s*\d+[.)]\s*/, "").trim();
  }
  if (!reference || typeof reference !== "object") {
    return `Reference ${index + 1}`;
  }

  const authors = Array.isArray(reference.authors)
    ? reference.authors.join(", ")
    : reference.authors || "Unknown authors";
  const year = reference.year ? ` (${reference.year})` : "";
  const title = reference.title || reference.name || `Reference ${index + 1}`;
  const source = reference.source || reference.journal || reference.url || "";
  return `${authors}${year}. ${title}${source ? `. ${source}` : ""}`;
};

const renderReferences = (references) => {
  if (!references?.length) return "";
  const items = Array.isArray(references)
    ? references
    : [references];
  const citations = items.flatMap((reference) => {
    if (typeof reference === "string") {
      return normalizeText(reference)
        .split(/\n+/)
        .map((line) => line.replace(/^\s*\d+[.)]\s*/, "").trim())
        .filter((line) => !/^key references:?$/i.test(line))
        .filter((line) => !/^\.\.\.\s+and\s+\d+\s+additional sources?\.?$/i.test(line))
        .filter(Boolean);
    }
    return [citationText(reference, items.indexOf(reference))];
  });
  if (!citations.length) return "";

  return [
    `\\begin{thebibliography}{${Math.max(citations.length, 1)}}`,
    ...citations.map(
      (citation, index) =>
        `\\bibitem{reference${index + 1}} ${escapeLatex(citation)}`,
    ),
    "\\end{thebibliography}",
  ].join("\n\n");
};

const cleanSectionTitle = (title) =>
  String(title || "Section")
    .replace(/^\s*(?:[IVXLCDM]+|\d+)[.)]?\s+/i, "")
    .trim();

export const buildAcademicLatex = ({
  title,
  authors = "Research Team",
  query = "",
  fields = [],
  abstract = "",
  sections = [],
  gaps = [],
  references = [],
  additionalSections = [],
}) => {
  const topic = normalizeText(query) || title || "Research topic";
  const fieldText = Array.isArray(fields)
    ? fields.map((field) => (typeof field === "object" ? field.label || field.name || "" : field)).filter(Boolean).join(", ")
    : fields;
  const authorText = Array.isArray(authors) ? authors.join(", ") : authors;
  const bodies = [];
  const referenceSection = sections.find((section) =>
    /^references?$/i.test(cleanSectionTitle(section.title)),
  );
  const referenceList = references?.length
    ? references
    : referenceSection?.content
      ? [referenceSection.content]
      : [];

  if (topic) {
    bodies.push(`\\section*{Query}\n${"\\topic"}`);
  }

  sections
    .filter((section) => !/^references?$/i.test(cleanSectionTitle(section.title)))
    .forEach((section) => {
      const content = renderValue(section.content, section.listType);
      if (content) {
        bodies.push(
          `\\section{${escapeLatex(cleanSectionTitle(section.title))}}\n${content}`,
        );
      }
    });

  additionalSections.forEach((section) => {
    const content = section.content;
    if (content) {
      bodies.push(
        `${section.command || `\\section{${escapeLatex(section.title)}}`}\n${renderValue(content)}`,
      );
    }
  });

  if (gaps?.length) {
    const gapItems = gaps.map((gap, index) => {
      if (typeof gap !== "object" || gap === null) {
        return `\\item[\\textbf{Gap ${index + 1}}] ${renderValue(gap)}`;
      }
      const label = gap.title || gap.name || gap.gap || `Gap ${index + 1}`;
      const detail = gap.description || gap.details || gap.rationale || gap;
      const metadata = [gap.type, gap.priority && `priority: ${gap.priority}`, gap.confidence !== undefined && `confidence: ${gap.confidence}`]
        .filter(Boolean)
        .join("; ");
      const description = [escapeLatex(metadata), renderValue(detail)]
        .filter(Boolean)
        .join(". ");
      return `\\item[\\textbf{${escapeLatex(label)}}] ${description}`;
    });
    bodies.push(
      [
        "\\section{Research Gaps}",
        "\\begin{description}[leftmargin=*, itemsep=6pt, topsep=4pt]",
        ...gapItems,
        "\\end{description}",
      ].join("\n"),
    );
  }

  const bibliography = renderReferences(referenceList);
  const output = [
    "\\documentclass[conference]{IEEEtran}",
    "\\usepackage[utf8]{inputenc}",
    "\\usepackage[T1]{fontenc}",
    "\\usepackage{lmodern}",
    "\\usepackage{enumitem}",
    "\\usepackage{hyperref}",
    `% Topic: ${escapeLatex(topic)}`,
    `% Research fields: ${escapeLatex(fieldText || "Not specified")}`,
    `\\newcommand{\\topic}{${escapeLatex(topic)}}`,
    `\\newcommand{\\fields}{${escapeLatex(fieldText || "Not specified")}}`,
    `\\title{${escapeLatex(title || "Research Paper")}}`,
    `\\author{\\IEEEauthorblockN{${escapeLatex(authorText || "Research Team")}}}`,
    "\\date{}",
    "\\begin{document}",
    "\\maketitle",
    "\\begin{abstract}",
    renderValue(abstract),
    "\\end{abstract}",
    ...bodies,
    bibliography,
    "\\end{document}",
  ].filter(Boolean);

  return output.join("\n\n");
};
