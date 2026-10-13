import { useEffect, useState, useRef } from "react";

import { useNavigate, useParams } from "react-router-dom";

import {
  ArrowLeft,
  ClipboardPen,
  FileCode,
  FileText,
  RefreshCcw,
} from "lucide-react";

import jsPDF from "jspdf";

import Card, { CardBody } from "../components/ui/Card";
import Button from "../components/ui/Button";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import { PageTransition, FadeIn } from "../components/ui/animations";

import CollabEditor from "../components/layout/CollabEditor";
import CommentPanel from "../components/layout/CommentPanel";
import VersionHistory from "../components/layout/VersionHistory";
import TeamPanel from "../components/layout/TeamPanel";
import { buildAcademicLatex } from "../utils/academicLatex";

function displayPaperTitle(title, query) {
  const source = String(query || title || "")
    .replace(/\s+/g, " ")
    .trim();
  const prefix =
    /^(?:(?:please\s+)?(?:search|find|review|analyze)\s+for\s+)?(?:(?:recent|current)\s+)?(?:academic\s+)?(?:research|literature)\s+(?:papers?\s+)?(?:on|about|into)\s+/i;
  let topic = source;
  for (let index = 0; index < 3; index += 1) {
    const cleaned = topic.replace(prefix, "").trim();
    if (cleaned === topic) break;
    topic = cleaned;
  }
  topic = topic.split(
    /(?:[.!?]\s+|\s+)(?:focus on|with a focus on|include|cover|examine|analyze)\b/i,
  )[0];
  const quotedTopics = [...topic.matchAll(/["“']([^"”']{2,100})["”']/g)];
  if (quotedTopics.length) topic = quotedTopics[quotedTopics.length - 1][1];
  topic = topic
    .replace(/["“”'`.,:;]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const hasPromptArtifacts =
    /search for recent academic research|focus on current trends|notable authors|important findings/i.test(
      String(title || ""),
    );
  if (!topic || !hasPromptArtifacts) return title || "Research Paper";

  let formattedTopic = topic
    .slice(0, 100)
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
  formattedTopic = formattedTopic
    .replace(/\bAi\b/g, "AI")
    .replace(/\bNlp\b/g, "NLP")
    .replace(/\bIot\b/g, "IoT");
  return `${formattedTopic}: Current Research and Open Challenges`;
}

function renderAcademicText(value, keyPrefix = "paper-text") {
  const normalized = String(value ?? "")
    .replace(/\\n/g, "\n")
    .replace(/\r\n?/g, "\n");
  const blocks = [];
  let paragraph = [];
  let listItems = [];
  let listType = null;

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ type: "paragraph", text: paragraph.join(" ") });
      paragraph = [];
    }
  };
  const flushList = () => {
    if (listItems.length) {
      blocks.push({ type: listType, items: listItems });
      listItems = [];
      listType = null;
    }
  };

  normalized.split("\n").forEach((line) => {
    const trimmed = line.trim();
    const item = trimmed.match(/^(?:(\d+)[.)]|[-*•])\s+(.+)$/);

    if (!trimmed) {
      flushParagraph();
      flushList();
      return;
    }
    if (item) {
      flushParagraph();
      const nextType = item[1] ? "ol" : "ul";
      if (listType && listType !== nextType) flushList();
      listType = nextType;
      listItems.push(item[2]);
      return;
    }

    flushList();
    if (trimmed.length < 90 && /^[^:]+:$/.test(trimmed)) {
      flushParagraph();
      blocks.push({ type: "heading", text: trimmed.slice(0, -1) });
    } else {
      paragraph.push(trimmed);
    }
  });
  flushParagraph();
  flushList();

  return blocks.map((block, index) => {
    const key = `${keyPrefix}-${index}`;
    if (block.type === "ol" || block.type === "ul") {
      const List = block.type;
      return (
        <List
          key={key}
          className="my-3 space-y-1.5 pl-6 text-slate-700 marker:text-violet-600"
        >
          {block.items.map((item, itemIndex) => (
            <li key={`${key}-${itemIndex}`} className="leading-7">
              {item}
            </li>
          ))}
        </List>
      );
    }
    if (block.type === "heading") {
      return (
        <h4 key={key} className="mb-1 mt-4 font-semibold text-slate-800">
          {block.text}
        </h4>
      );
    }
    return (
      <p key={key} className="my-3 leading-7 text-slate-700">
        {block.text}
      </p>
    );
  });
}

export default function ProjectDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [pendingInviteToken, setPendingInviteToken] = useState(null);
  const [generatedSummary, setGeneratedSummary] = useState("");

  const [members, setMembers] = useState([]);
  const [comments, setComments] = useState([]);
  const [presence, setPresence] = useState([]);

  const [newVersion, setNewVersion] = useState(null);

  const [editingContent, setEditingContent] = useState(null);

  // Used to immediately add the newly-created version to the UI
  const [versionHistory, setVersionHistory] = useState([]);

  const clientRef = useRef(null);

  //   const handleProposalClick = async () => {
  //     await fetch("/api/v1/activities/proposal", {
  //         method: "POST",
  //         headers: {
  //             Authorization: `Bearer ${token}`,
  //         },
  //     });

  //     // Continue with whatever your proposal button already does
  // };

  // const createProposalActivity = async () => {
  //   try {
  //     await api.post("/activities/proposal");
  //   } catch (error) {
  //     console.error("Failed to create proposal activity:", error);
  //   }
  // };

  const createProposalActivity = async () => {
    try {
      const res = await fetch(
        "http://localhost:8000/api/v1/activities/proposal",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to create proposal activity");
      }

      const data = await res.json();

      console.log("Activity created:", data);

      return data;
    } catch (err) {
      console.error("Proposal activity error:", err);
    }
  };

  const formatHeading = (key) =>
    key
      .replace(/\_/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/\b\w/g, (chr) => chr.toUpperCase());

  const renderContentValue = (value) => {
    if (value === null || value === undefined) {
      return <p className="text-slate-500 mt-2">No content available.</p>;
    }

    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return (
        <p className="whitespace-pre-line text-slate-700 mt-2">
          {String(value)}
        </p>
      );
    }

    if (Array.isArray(value)) {
      return (
        <ul className="mt-2 list-disc pl-5 text-slate-700 space-y-1">
          {value.map((item, index) => (
            <li key={index} className="mt-1">
              {typeof item === "string" || typeof item === "number"
                ? String(item)
                : renderContentValue(item)}
            </li>
          ))}
        </ul>
      );
    }

    if (typeof value === "object") {
      return (
        <div className="space-y-4 mt-2">
          {Object.entries(value).map(([subKey, subValue]) => (
            <div key={subKey}>
              <h4 className="font-semibold text-slate-800">
                {formatHeading(subKey)}
              </h4>

              {renderContentValue(subValue)}
            </div>
          ))}
        </div>
      );
    }

    return <p className="text-slate-500 mt-2">Unsupported content format.</p>;
  };

  const renderProjectContent = (content, originalQuery = "") => {
    if (!content) {
      return <p className="text-slate-500 mt-2">No content available.</p>;
    }

    if (
      typeof content === "string" ||
      typeof content === "number" ||
      typeof content === "boolean"
    ) {
      return (
        <p className="whitespace-pre-line text-slate-700 mt-2">
          {String(content)}
        </p>
      );
    }

    if (Array.isArray(content)) {
      return renderContentValue(content);
    }

    const paperContent = Array.isArray(content.sections)
      ? content
      : content.content && Array.isArray(content.content.sections)
        ? content.content
        : null;

    if (paperContent && (paperContent.title || paperContent.abstract)) {
      return (
        <article className="mx-auto max-w-4xl rounded-xl border border-slate-200 bg-white px-6 py-8 shadow-sm sm:px-10">
          {paperContent.title && (
            <h2 className="mb-8 text-center text-2xl font-bold leading-tight text-slate-900">
              {displayPaperTitle(paperContent.title, originalQuery)}
            </h2>
          )}
          {paperContent.abstract && (
            <section className="mb-8 border-b border-slate-200 pb-6">
              <h3 className="mb-3 text-center text-lg font-semibold text-slate-900">
                Abstract
              </h3>
              <div className="text-justify text-slate-700">
                {renderAcademicText(paperContent.abstract, "paper-abstract")}
              </div>
            </section>
          )}
          <div className="space-y-8">
            {paperContent.sections.map((section, index) => (
              <section key={`${section.title || "section"}-${index}`}>
                {section.title && (
                  <h3 className="mb-3 border-b border-slate-200 pb-2 text-lg font-bold uppercase tracking-wide text-slate-900">
                    {section.title}
                  </h3>
                )}
                <div className="text-justify">
                  {renderAcademicText(
                    section.content,
                    `paper-section-${index}`,
                  )}
                </div>
              </section>
            ))}
          </div>
        </article>
      );
    }

    return (
      <div className="space-y-6 mt-2">
        {Object.entries(content).map(([key, value]) => (
          <div key={key} className="space-y-2">
            <h4 className="font-semibold text-slate-800">
              {formatHeading(key)}
            </h4>

            {renderContentValue(value)}
          </div>
        ))}
      </div>
    );
  };

  const summarizeProject = () => {
    if (!project) {
      return "";
    }

    if (
      project.content &&
      typeof project.content === "object" &&
      project.content.abstract
    ) {
      return project.content.abstract;
    }

    const lines = [];

    const title =
      project.content?.title || project.title || "This research project";

    lines.push(
      `${title} is a ${project.project_type} focused on ${
        project.query || "a research topic"
      }.`,
    );

    if (project.content?.background) {
      lines.push(`Background: ${project.content.background}`);
    }

    if (project.content?.problem_statement) {
      lines.push(`Problem: ${project.content.problem_statement}`);
    }

    if (project.content?.objectives) {
      const objectives = Array.isArray(project.content.objectives)
        ? project.content.objectives.join("; ")
        : project.content.objectives;

      lines.push(`Objectives: ${objectives}`);
    }

    if (project.content?.methodology) {
      const methodology = Array.isArray(project.content.methodology)
        ? project.content.methodology.join(" ")
        : project.content.methodology;

      lines.push(`Methodology: ${methodology}`);
    }

    if (project.content?.expected_contributions) {
      const contributions = Array.isArray(
        project.content.expected_contributions,
      )
        ? project.content.expected_contributions.join("; ")
        : project.content.expected_contributions;

      lines.push(`Expected contributions: ${contributions}`);
    }

    if (project.gaps_data) {
      const gapCount = Array.isArray(project.gaps_data)
        ? project.gaps_data.length
        : 1;

      lines.push(
        `This work identifies ${gapCount} research gap(s) and structures the study around them.`,
      );
    }

    if (
      !project.content?.abstract &&
      !project.content?.background &&
      !project.content?.problem_statement
    ) {
      lines.push(
        `This saved project includes ${
          project.papers_data?.length || 0
        } source papers and a generated research overview.`,
      );
    }

    return lines.join(" ");
  };

  const makeCitationText = (paper, index) => {
    if (!paper) {
      return `Reference ${index + 1}`;
    }

    const authors = Array.isArray(paper.authors)
      ? paper.authors.join(", ")
      : paper.authors || "Unknown authors";

    const year = paper.year ? ` (${paper.year})` : "";

    const title = paper.title || paper.name || `Paper ${index + 1}`;

    const source = paper.source || paper.journal || paper.url || "";

    return `${authors}${year}. ${title}${source ? `. ${source}` : ""}`;
  };

  const buildLaTeX = () => {
    const summary = generatedSummary || summarizeProject() || "";
    const authors =
      Array.isArray(project.authors) && project.authors.length
        ? project.authors.join(", ")
        : project.author || "Research Team";

    const contentSections = Array.isArray(project.content?.sections)
      ? project.content.sections
      : Array.isArray(project.content?.content?.sections)
        ? project.content.content.sections
        : [];

    return buildAcademicLatex({
      title: project.title || "Research Project",
      authors,
      query: project.query || "N/A",
      fields: project.themes || project.content?.themes || [],
      abstract: summary,
      sections: contentSections,
      gaps: project.gaps_data || [],
      references: project.papers_data || [],
    });
  };

  const downloadFile = (filename, content, mimeType) => {
    const blob = new Blob([content], {
      type: mimeType,
    });

    const url = URL.createObjectURL(blob);

    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = filename;

    document.body.appendChild(anchor);

    anchor.click();

    anchor.remove();

    URL.revokeObjectURL(url);
  };

  const exportLaTeX = () => {
    const latex = buildLaTeX();

    downloadFile(
      `${project.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.tex`,
      latex,
      "application/x-latex;charset=utf-8",
    );
  };

  const exportPDF = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 52;
    const bottomLimit = pageHeight - 46;
    const columnGap = 22;
    const columnWidth = (pageWidth - margin * 2 - columnGap) / 2;
    const fullWidth = pageWidth - margin * 2;
    let y = 48;
    let column = 0;
    let firstColumnTop = y;

    const toRomanNumeral = (value) => {
      const numerals = [
        [1000, "M"],
        [900, "CM"],
        [500, "D"],
        [400, "CD"],
        [100, "C"],
        [90, "XC"],
        [50, "L"],
        [40, "XL"],
        [10, "X"],
        [9, "IX"],
        [5, "V"],
        [4, "IV"],
        [1, "I"],
      ];
      let number = value;
      let result = "";
      numerals.forEach(([amount, numeral]) => {
        while (number >= amount) {
          result += numeral;
          number -= amount;
        }
      });
      return result;
    };

    const wrapText = (text, maxWidth) => {
      const words = String(text || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean);
      const lines = [];
      let line = "";

      words.forEach((word) => {
        if (doc.getTextWidth(word) > maxWidth) {
          if (line) lines.push(line);
          line = "";
          let chunk = "";
          Array.from(word).forEach((character) => {
            const candidate = chunk + character;
            if (chunk && doc.getTextWidth(candidate) > maxWidth) {
              lines.push(chunk);
              chunk = character;
            } else {
              chunk = candidate;
            }
          });
          line = chunk;
          return;
        }

        const candidate = line ? `${line} ${word}` : word;
        if (line && doc.getTextWidth(candidate) > maxWidth) {
          lines.push(line);
          line = word;
        } else {
          line = candidate;
        }
      });

      if (line) lines.push(line);
      return lines;
    };

    const drawJustifiedLine = (text, x, baseline, width, justify) => {
      const words = text.split(/\s+/).filter(Boolean);
      if (!justify || words.length < 2) {
        doc.text(text, x, baseline);
        return;
      }
      const wordsWidth = words.reduce(
        (total, word) => total + doc.getTextWidth(word),
        0,
      );
      const gap = (width - wordsWidth) / (words.length - 1);
      let currentX = x;
      words.forEach((word) => {
        doc.text(word, currentX, baseline);
        currentX += doc.getTextWidth(word) + gap;
      });
    };

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

    const addFullWidthParagraphs = (text, fontSize, leading) => {
      doc.setFont("times", "normal");
      doc.setFontSize(fontSize);
      const paragraphs = String(text || "")
        .replace(/\\r\\n|\\n|\\r/g, "\n")
        .split(/\n\s*\n+/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean);

      paragraphs.forEach((paragraph) => {
        const lines = wrapText(paragraph.replace(/\s*\n\s*/g, " "), fullWidth);
        if (y + Math.min(lines.length, 2) * leading > bottomLimit) addPage();
        lines.forEach((line, index) => {
          if (y + leading > bottomLimit) addPage();
          drawJustifiedLine(
            line,
            margin,
            y,
            fullWidth,
            index < lines.length - 1,
          );
          y += leading;
        });
        y += 4;
      });
    };

    const addColumnParagraph = (
      text,
      { fontSize = 9, leading = 12, indent = 11, justify = true } = {},
    ) => {
      doc.setFont("times", "normal");
      doc.setFontSize(fontSize);
      const lines = wrapText(
        String(text || "").replace(/\s*\n\s*/g, " "),
        columnWidth - indent,
      );
      if (y + Math.min(lines.length, 2) * leading > bottomLimit) nextColumn();
      lines.forEach((line, index) => {
        if (y + leading > bottomLimit) nextColumn();
        const lineIndent = index === 0 ? indent : 0;
        drawJustifiedLine(
          line,
          margin + (column === 1 ? columnWidth + columnGap : 0) + lineIndent,
          y,
          columnWidth - lineIndent,
          justify && index < lines.length - 1,
        );
        y += leading;
      });
      y += 4;
    };

    const addColumnListItem = (marker, text) => {
      const leading = 12;
      const hangingIndent =
        marker === "•" ? 15 : doc.getTextWidth(`${marker} `);
      doc.setFont("times", "normal");
      doc.setFontSize(9);
      const lines = wrapText(String(text || ""), columnWidth - hangingIndent);
      if (y + Math.min(lines.length, 2) * leading > bottomLimit) nextColumn();

      lines.forEach((line, index) => {
        if (y + leading > bottomLimit) nextColumn();
        const x = margin + (column === 1 ? columnWidth + columnGap : 0);
        if (index === 0) {
          if (marker === "•") {
            doc.text("•", x + 2, y);
            doc.text(line, x + hangingIndent, y);
          } else {
            doc.text(`${marker} `, x, y);
            doc.text(line, x + hangingIndent, y);
          }
        } else {
          doc.text(line, x + hangingIndent, y);
        }
        y += leading;
      });
      y += 2;
    };

    const addSectionHeading = (text, number = null) => {
      const cleanTitle = String(text || "")
        .replace(/^\s*(?:(?:[IVXLCDM]+|\d+)[.)]?\s+)+/i, "")
        .trim();
      const heading = number ? `${number}. ${cleanTitle}` : cleanTitle;
      doc.setFont("times", "bold");
      doc.setFontSize(9.5);
      const lines = wrapText(heading.toUpperCase(), columnWidth);
      if (y + lines.length * 12 + 24 > bottomLimit) nextColumn();
      y += 5;
      lines.forEach((line) => {
        if (y + 12 > bottomLimit) nextColumn();
        const xOffset = column === 1 ? columnWidth + columnGap : 0;
        doc.text(line, margin + xOffset + columnWidth / 2, y, {
          align: "center",
        });
        y += 12;
      });
      y += 3;
    };

    const addSectionContent = (content) => {
      const blocks = String(content || "")
        .replace(/\\r\\n|\\n|\\r/g, "\n")
        .split(/\n\s*\n+/)
        .map((block) => block.replace(/\s*\n\s*/g, " ").trim())
        .filter(Boolean);

      blocks.forEach((block) => {
        const listPattern = /(^|\s)(\d{1,2}[.)]|[•●▪◦])\s+/g;
        const matches = [...block.matchAll(listPattern)];
        const startsWithList = matches.length > 0 && matches[0].index === 0;

        if (!matches.length || (!startsWithList && matches.length === 1)) {
          addColumnParagraph(block);
          return;
        }

        const parts = [];
        let previousIndex = 0;
        matches.forEach((match, index) => {
          const start = match.index + match[0].length;
          const end = matches[index + 1]?.index ?? block.length;
          const itemText = block.slice(start, end).trim();
          const leadingText = block.slice(previousIndex, match.index).trim();
          if (leadingText) parts.push({ type: "text", value: leadingText });
          if (itemText) {
            const marker = /^[•●▪◦]$/.test(match[2])
              ? "•"
              : match[2].replace(/[.)]$/, "");
            parts.push({ type: "list", value: itemText, marker });
          }
          previousIndex = end;
        });

        parts.forEach((part) => {
          if (part.type === "text") addColumnParagraph(part.value);
          else addColumnListItem(part.marker, part.value);
        });
      });
    };

    const paperContent = Array.isArray(project.content?.sections)
      ? project.content
      : Array.isArray(project.content?.content?.sections)
        ? project.content.content
        : null;
    const documentTitle =
      paperContent?.title || project.content?.title || project.title;

    doc.setFont("times", "bold");
    doc.setFontSize(19);
    const titleLines = wrapText(
      String(documentTitle || "Research Paper"),
      fullWidth,
    );
    titleLines.forEach((line) => {
      if (y + 23 > bottomLimit) addPage();
      doc.text(line, pageWidth / 2, y, { align: "center" });
      y += 23;
    });
    y += 13;

    const authors = paperContent?.authors;
    const authorLine = Array.isArray(authors)
      ? authors.join(", ")
      : typeof authors === "string"
        ? authors
        : "";
    if (authorLine) {
      doc.setFont("times", "italic");
      doc.setFontSize(8.5);
      const authorLines = wrapText(authorLine, fullWidth);
      authorLines.forEach((line) => {
        if (y + 12 > bottomLimit) addPage();
        doc.text(line, pageWidth / 2, y, { align: "center" });
        y += 12;
      });
      y += 8;
    }

    doc.setFont("times", "bolditalic");
    doc.setFontSize(9.5);
    doc.text("ABSTRACT", pageWidth / 2, y, { align: "center" });
    y += 16;
    addFullWidthParagraphs(
      paperContent?.abstract || project.content?.abstract || "",
      9,
      12,
    );
    y += 10;
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 17;
    firstColumnTop = y;

    let sectionNumber = 0;
    const sectionSource = paperContent?.sections || [];
    if (sectionSource.length) {
      sectionSource.forEach((section) => {
        const isReferences = /^(references|bibliography)$/i.test(
          String(section.title || "").trim(),
        );
        if (!isReferences) sectionNumber += 1;
        addSectionHeading(
          section.title || "Section",
          isReferences ? null : toRomanNumeral(sectionNumber),
        );
        if (isReferences) {
          const entries = String(section.content || "")
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line && !/^key references:?$/i.test(line));
          entries.forEach((entry, index) => {
            const match = entry.match(/^\[(\d+)\]\s*(.*)$|^(\d+)[.)]\s+(.*)$/);
            const number = match ? match[1] || match[3] : index + 1;
            const citation = match ? match[2] || match[4] : entry;
            addColumnListItem(`${number}.`, citation);
          });
        } else {
          addSectionContent(section.content || "");
        }
      });
    } else if (project.content && typeof project.content === "object") {
      const excludedKeys = new Set([
        "title",
        "abstract",
        "sections",
        "content",
      ]);
      Object.entries(project.content).forEach(([key, value]) => {
        if (excludedKeys.has(key)) return;
        if (typeof value === "string") {
          addSectionHeading(formatHeading(key));
          addSectionContent(value);
        } else if (Array.isArray(value)) {
          addSectionHeading(formatHeading(key));
          value.forEach((item) => {
            if (typeof item === "string") addColumnListItem("•", item);
            else addSectionContent(JSON.stringify(item));
          });
        } else if (value && typeof value === "object") {
          addSectionHeading(formatHeading(key));
          addSectionContent(
            Object.entries(value)
              .map(([k, v]) => `${k}: ${v}`)
              .join("\n"),
          );
        }
      });
    }

    const pageCount = doc.internal.getNumberOfPages();
    for (let page = 1; page <= pageCount; page += 1) {
      doc.setPage(page);
      doc.setFont("times", "normal");
      doc.setFontSize(8);
      doc.setTextColor(90, 90, 90);
      doc.text(String(page), pageWidth / 2, pageHeight - 22, {
        align: "center",
      });
    }

    doc.save(`${project.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.pdf`);
  };

  useEffect(() => {
    const fetchProject = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem("token");

        if (!token) {
          setError("Not authenticated. Please login first.");

          setLoading(false);

          return;
        }

        const res = await fetch(`http://localhost:8000/api/v1/projects/${id}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));

          throw new Error(errData.detail || "Failed to load project details.");
        }

        const data = await res.json();

        setProject(data);

        // ----------------------------------------
        // Accept invite token
        // ----------------------------------------

        try {
          const params = new URLSearchParams(window.location.search);

          const inviteToken = params.get("invite_token");

          const localToken = localStorage.getItem("token");

          if (inviteToken) {
            if (!localToken) {
              setPendingInviteToken(inviteToken);
            } else {
              const acceptRes = await fetch(
                `http://localhost:8000/api/v1/projects/${id}/invite/accept`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localToken}`,
                  },
                  body: JSON.stringify({
                    token: inviteToken,
                  }),
                },
              );

              if (acceptRes.ok) {
                const body = await acceptRes.json();

                if (body?.member) {
                  setMembers((m) => [...m, body.member]);
                }
              }
            }
          }
        } catch (e) {
          // Ignore invite errors silently
        }

        // ----------------------------------------
        // Fetch members
        // ----------------------------------------

        const memRes = await fetch(
          `http://localhost:8000/api/v1/projects/${id}/members`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (memRes.ok) {
          setMembers(await memRes.json());
        }

        // ----------------------------------------
        // Fetch comments
        // ----------------------------------------

        const comRes = await fetch(
          `http://localhost:8000/api/v1/projects/${id}/comments`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (comRes.ok) {
          setComments(await comRes.json());
        }

        // ----------------------------------------
        // Create collaboration client
        // ----------------------------------------

        const user = JSON.parse(localStorage.getItem("user") || "{}");

        const CollabClient = (await import("../api/collaboration")).default;

        const client = new CollabClient(id, (msg) => {
          if (msg.type === "delta") {
            const payload = msg.payload || {};

            if (payload.sender_id !== user.id && payload.content) {
              setProject((p) => ({
                ...p,
                content: payload.content,
              }));
            }
          } else if (msg.type === "presence") {
            setPresence(msg.presence || []);
          } else if (msg.type === "comment_created") {
            setComments((c) => [...c, msg.payload]);
          } else if (msg.type === "member_added") {
            setMembers((m) => [...m, msg.payload]);
          }
        });

        clientRef.current = client;

        client.connect(localStorage.getItem("token"), user);
      } catch (err) {
        setError(err.message || "Failed to load project details.");
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [id]);

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto space-y-6">
        <FadeIn>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold">Project Details</h1>

              <p className="text-slate-500 mt-1">
                Review your saved paper or proposal project.
              </p>

              {pendingInviteToken && (
                <div className="mt-3 p-3 bg-yellow-50 border-l-4 border-yellow-400 text-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <strong>You were invited to this project.</strong>

                      <div className="mt-1">
                        Please{" "}
                        <a
                          href={`/auth/login?next=${encodeURIComponent(
                            window.location.pathname + window.location.search,
                          )}`}
                          className="underline text-blue-600"
                        >
                          log in
                        </a>{" "}
                        or{" "}
                        <a
                          href={`/auth/signup?next=${encodeURIComponent(
                            window.location.pathname + window.location.search,
                          )}`}
                          className="underline text-blue-600"
                        >
                          create an account
                        </a>{" "}
                        to accept the invite.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <Button
                size="sm"
                icon={RefreshCcw}
                disabled={!project?.query || !project?.papers_data?.length}
                onClick={() =>
                  navigate("/gap-analysis", {
                    state: {
                      query: project?.query,
                      papers: project?.papers_data,
                    },
                  })
                }
              >
                Regenerate Gap Analysis
              </Button>

              <Button
                size="sm"
                variant="secondary"
                icon={FileText}
                disabled={!project}
                onClick={() => setGeneratedSummary(summarizeProject())}
              >
                Generate Summary
              </Button>

              <Button
                size="sm"
                variant="secondary"
                icon={FileCode}
                disabled={!project?.query || !project?.papers_data?.length}
                onClick={() =>
                  navigate("/gap-analysis", {
                    state: {
                      query: project?.query,
                      papers: project?.papers_data,
                    },
                  })
                }
              >
                Generate Research Paper
              </Button>

              {/* <Button
                size="sm"
                variant="secondary"
                icon={ClipboardPen}
                disabled={
                  !project?.query ||
                  !project?.papers_data?.length
                }
                onClick={() =>
                  navigate("/gap-analysis", {
                    state: {
                      query: project?.query,
                      papers:
                        project?.papers_data,
                    },
                  })
                }
              >
                Generate Research Proposal
              </Button> */}

              <Button
                size="sm"
                variant="secondary"
                icon={ClipboardPen}
                disabled={!project?.query || !project?.papers_data?.length}
                onClick={async () => {
                  await createProposalActivity();

                  navigate("/gap-analysis", {
                    state: {
                      query: project?.query,
                      papers: project?.papers_data,
                    },
                  });
                }}
              >
                Generate Research Proposal
              </Button>

              <Button
                size="sm"
                variant="secondary"
                icon={RefreshCcw}
                onClick={exportLaTeX}
              >
                Export LaTeX
              </Button>

              <Button
                size="sm"
                variant="secondary"
                icon={RefreshCcw}
                onClick={exportPDF}
              >
                Export PDF
              </Button>

              <Button size="sm" onClick={() => navigate(-1)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </div>
          </div>
        </FadeIn>

        {loading && (
          <FadeIn>
            <LoadingSpinner text="Loading project details..." />
          </FadeIn>
        )}

        {error && (
          <FadeIn>
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded">
              {error}
            </div>
          </FadeIn>
        )}

        {project && (
          <FadeIn>
            <Card>
              <CardBody className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold">{project.title}</h2>

                  <p className="text-slate-500 mt-1">{project.description}</p>

                  <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-500">
                    <span className="rounded-full bg-slate-100 px-3 py-1">
                      {project.project_type}
                    </span>

                    <span className="rounded-full bg-slate-100 px-3 py-1">
                      Query: {project.query || "N/A"}
                    </span>

                    <span className="rounded-full bg-slate-100 px-3 py-1">
                      Created {new Date(project.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                {(generatedSummary || project.content?.abstract) &&
                  !Array.isArray(project.content?.sections) && (
                    <div>
                      <h3 className="font-semibold">Summary / Abstract</h3>

                      <p className="whitespace-pre-wrap text-slate-700 mt-2">
                        {(
                          generatedSummary || project.content.abstract
                        )?.replace(/\\n/g, "\n")}
                      </p>
                    </div>
                  )}

                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold">
                      {Array.isArray(project.content?.sections) ||
                      Array.isArray(project.content?.content?.sections)
                        ? "Paper draft"
                        : "Content"}
                    </h3>

                    {renderProjectContent(
                      editingContent || project.content,
                      project.query,
                    )}

                    <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        {/* <CollabEditor
  projectId={id}
  content={project.content}
  client={clientRef.current}
  user={JSON.parse(
    localStorage.getItem("user") || "{}",
  )}
  onSave={async ({ content, commit_message }) => {
    const token = localStorage.getItem("token");

    const res = await fetch(
      `http://localhost:8000/api/v1/projects/${id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content,
          commit_message,
        }),
      },
    );

    if (!res.ok) {
      const errorData = await res
        .json()
        .catch(() => ({}));

      throw new Error(
        errorData.detail ||
          "Failed to save project",
      );
    }

    const data = await res.json();

    console.log("SAVE RESPONSE:", data);

    // Update only the project content.
    // Commit message stays in ProjectVersion.
    if (data.project) {
      setProject((prev) => ({
        ...prev,
        content: data.project.content,
        updated_at: data.project.updated_at,
      }));
    }

    return data;
  }}
  presence={presence}
/> */}

                        <CollabEditor
                          projectId={id}
                          content={project.content}
                          onContentChange={setEditingContent}
                          client={clientRef.current}
                          user={JSON.parse(
                            localStorage.getItem("user") || "{}",
                          )}
                          onSave={async ({ content, commit_message }) => {
                            const token = localStorage.getItem("token");

                            // ----------------------------------------
                            // Validate commit message on frontend
                            // ----------------------------------------

                            const trimmedCommitMessage = String(
                              commit_message || "",
                            ).trim();

                            if (!trimmedCommitMessage) {
                              throw new Error(
                                "Please enter a commit message before saving.",
                              );
                            }

                            // ----------------------------------------
                            // Save project
                            // ----------------------------------------

                            const res = await fetch(
                              `http://localhost:8000/api/v1/projects/${id}`,
                              {
                                method: "PATCH",
                                headers: {
                                  "Content-Type": "application/json",
                                  Authorization: `Bearer ${token}`,
                                },
                                body: JSON.stringify({
                                  content,
                                  commit_message: trimmedCommitMessage,
                                }),
                              },
                            );

                            if (!res.ok) {
                              const errorData = await res
                                .json()
                                .catch(() => ({}));

                              throw new Error(
                                errorData.detail || "Failed to save project",
                              );
                            }

                            const data = await res.json();

                            console.log("SAVE RESPONSE:", data);

                            // ----------------------------------------
                            // Update project content immediately
                            // ----------------------------------------

                            if (data.project) {
                              setProject((prev) => ({
                                ...prev,
                                content: data.project.content,
                                updated_at: data.project.updated_at,
                              }));
                            }

                            // ----------------------------------------
                            // Update Version History immediately
                            // ----------------------------------------

                            if (data.version) {
                              setNewVersion(data.version);
                            }

                            return data;
                          }}
                          presence={presence}
                        />

                        <CommentPanel
                          projectId={id}
                          comments={comments}
                          client={clientRef.current}
                          user={JSON.parse(
                            localStorage.getItem("user") || "{}",
                          )}
                          onAddComment={async (payload) => {
                            const token = localStorage.getItem("token");

                            const res = await fetch(
                              `http://localhost:8000/api/v1/projects/${id}/comments`,
                              {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                  Authorization: `Bearer ${token}`,
                                },
                                body: JSON.stringify(payload),
                              },
                            );

                            if (res.ok) {
                              const created = await res.json();

                              setComments((c) => [...c, created]);

                              clientRef.current?.send({
                                type: "comment_created",
                                payload: created,
                              });
                            }
                          }}
                        />
                      </div>

                      <div>
                        <TeamPanel
                          projectId={id}
                          members={members}
                          client={clientRef.current}
                          user={JSON.parse(
                            localStorage.getItem("user") || "{}",
                          )}
                          onAddMember={async (payload) => {
                            const token = localStorage.getItem("token");

                            const res = await fetch(
                              `http://localhost:8000/api/v1/projects/${id}/members`,
                              {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                  Authorization: `Bearer ${token}`,
                                },
                                body: JSON.stringify(payload),
                              },
                            );

                            if (res.ok) {
                              const created = await res.json();

                              setMembers((m) => [...m, created]);

                              clientRef.current?.send({
                                type: "member_added",
                                payload: created,
                              });
                            }
                          }}
                        />

                        <VersionHistory
                          projectId={id}
                          newVersion={newVersion}
                        />
                      </div>
                    </div>
                  </div>

                  {project.papers_data?.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="font-semibold">Saved Papers</h3>

                      <div className="space-y-4 mt-2">
                        {project.papers_data.map((paper, index) => (
                          <Card
                            key={index}
                            className="border-slate-200 bg-slate-50"
                          >
                            <CardBody>
                              {typeof paper === "string" ||
                              typeof paper === "number" ? (
                                <p className="text-slate-700">
                                  {String(paper)}
                                </p>
                              ) : (
                                renderProjectContent(paper)
                              )}
                            </CardBody>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {project.papers_data?.length > 0 && (
                    <div>
                      <h3 className="font-semibold">Bibliography</h3>

                      <ul className="mt-2 list-disc pl-5 text-slate-700 space-y-1">
                        {project.papers_data.map((paper, index) => (
                          <li key={index} className="mt-1">
                            {makeCitationText(paper, index)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {project.gaps_data && (
                    <div>
                      <h3 className="font-semibold">Gap Analysis</h3>

                      {renderProjectContent(project.gaps_data)}
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          </FadeIn>
        )}
      </div>
    </PageTransition>
  );
}
