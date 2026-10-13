import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FileText, Download, Save } from "lucide-react";
import jsPDF from "jspdf";
import Card, { CardBody, CardHeader } from "../components/ui/Card";
import Button from "../components/ui/Button";
import {
  PageTransition,
  FadeIn,
  StaggerContainer,
  StaggerItem,
} from "../components/ui/animations";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import { buildAcademicLatex } from "../utils/academicLatex";

const normalizePaperText = (text) =>
  String(text || "")
    .replace(/\\n/g, "\n")
    .replace(/\r\n?/g, "\n")
    .trim();

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

export default function PaperPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const inputState = location.state || {};

  const [paper, setPaper] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [plagiarismResult, setPlagiarismResult] = useState(null);
  const [plagiarismLoading, setPlagiarismLoading] = useState(false);
  const [plagiarismError, setPlagiarismError] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(null);
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  useEffect(() => {
    const { query, papers, themes, limitations, gaps } = inputState;

    if (!query || !papers?.length || !themes?.length || !gaps?.length) {
      setError(
        "Missing input from gap analysis. Please complete gap analysis first.",
      );
      setLoading(false);
      return;
    }

    const fetchPaper = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("http://localhost:8000/api/v1/paper/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query,
            papers,
            themes: themes.map((t) => t.label || t),
            limitations: limitations.map((l) => l.text || l),
            gaps,
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.detail || "Full paper generation failed");
        }

        const data = await res.json();
        setPaper(data);
      } catch (err) {
        setError(err.message || "Failed to generate research paper");
      } finally {
        setLoading(false);
      }
    };

    fetchPaper();
  }, [inputState]);

  if (loading) {
    return (
      <PageTransition>
        <LoadingSpinner text="Generating full research paper..." />
      </PageTransition>
    );
  }

  if (error) {
    return (
      <PageTransition>
        <div className="max-w-3xl mx-auto text-center space-y-4 py-20">
          <p className="text-red-500 font-medium">{error}</p>
          <Button onClick={() => navigate("/gap-analysis")}>
            Go Back to Gap Analysis
          </Button>
        </div>
      </PageTransition>
    );
  }

  if (!paper) {
    return null;
  }

  const downloadPDF = () => {
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
      const paragraphs = normalizePaperText(text)
        .split(/\n\s*\n+/)
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
        text.replace(/\s*\n\s*/g, " "),
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
      const fontSize = 9;
      const leading = 12;
      const hangingIndent =
        marker === "•" ? 15 : doc.getTextWidth(`${marker} `);
      doc.setFont("times", "normal");
      doc.setFontSize(fontSize);
      const lines = wrapText(text, columnWidth - hangingIndent);
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

    const addSectionContent = (content) => {
      const blocks = normalizePaperText(content)
        .split(/\n\s*\n+/)
        .map((block) => block.replace(/\s*\n\s*/g, " ").trim())
        .filter(Boolean);
      const listMarker = /(^|\s)(\d{1,2}[.)]|[•●▪◦])\s+/g;

      blocks.forEach((block) => {
        const markers = [...block.matchAll(listMarker)];
        const beginsWithListMarker = markers[0]?.index === 0;
        if (markers.length < 2 && !beginsWithListMarker) {
          addColumnParagraph(block);
          return;
        }

        let precedingText = block.slice(0, markers[0].index).trim();
        if (precedingText) addColumnParagraph(precedingText);

        markers.forEach((match, index) => {
          const itemStart = match.index + match[0].length;
          const itemEnd = markers[index + 1]?.index ?? block.length;
          const itemText = block.slice(itemStart, itemEnd).trim();
          if (!itemText) return;
          const marker = /^[•●▪◦]$/.test(match[2])
            ? "•"
            : match[2].replace(/[.)]$/, "");
          addColumnListItem(marker, itemText);
        });
      });
    };

    const addSectionHeading = (text, number = null) => {
      const cleanTitle = text
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

    // Full-width first-page title and abstract.
    doc.setFont("times", "bold");
    doc.setFontSize(19);
    const titleLines = wrapText(paper.title, fullWidth);
    titleLines.forEach((line) => {
      if (y + 23 > bottomLimit) addPage();
      doc.text(line, pageWidth / 2, y, { align: "center" });
      y += 23;
    });
    y += 13;

    doc.setFont("times", "bolditalic");
    doc.setFontSize(9.5);
    doc.text("ABSTRACT", pageWidth / 2, y, { align: "center" });
    y += 16;
    addFullWidthParagraphs(paper.abstract, 9, 12);
    y += 10;
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 17;
    firstColumnTop = y;

    let sectionNumber = 0;
    paper.sections.forEach((section) => {
      const isReferences = /^(references|bibliography)$/i.test(
        section.title.trim(),
      );
      sectionNumber += isReferences ? 0 : 1;
      addSectionHeading(
        section.title,
        isReferences ? null : toRomanNumeral(sectionNumber),
      );

      if (isReferences) {
        const entries = normalizePaperText(section.content)
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line && !/^key references:?$/i.test(line));
        let referenceNumber = 1;
        entries.forEach((entry) => {
          const match = entry.match(/^\[(\d+)\]\s*(.*)$|^(\d+)[.)]\s+(.*)$/);
          const number = match ? match[1] || match[3] : referenceNumber;
          const citation = match ? match[2] || match[4] : entry;
          referenceNumber = Number(number) + 1;
          addColumnParagraph(`[${number}] ${citation}`, {
            fontSize: 8,
            leading: 10,
            indent: 0,
            justify: false,
          });
        });
        return;
      }

      addSectionContent(section.content);
    });

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

    doc.save(`${paper.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.pdf`);
  };

  const checkPlagiarism = async () => {
    if (!inputState.papers?.length) {
      setPlagiarismError(
        "No reference papers available for similarity checking.",
      );
      return;
    }

    setPlagiarismLoading(true);
    setPlagiarismError(null);
    setPlagiarismResult(null);

    try {
      const sourceText = [
        paper.title,
        paper.abstract,
        ...paper.sections.map(
          (section) => `${section.title}\n${section.content}`,
        ),
      ].join("\n\n");

      const response = await fetch(
        "http://localhost:8000/api/v1/plagiarism/check",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source_text: sourceText,
            papers: inputState.papers,
            threshold: 0.25,
          }),
        },
      );

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Similarity check failed.");
      }

      const result = await response.json();
      setPlagiarismResult(result);
    } catch (err) {
      setPlagiarismError(err.message || "Failed to run similarity check.");
    } finally {
      setPlagiarismLoading(false);
    }
  };

  const handleSaveProject = async () => {
    if (!projectTitle.trim()) {
      setSaveError("Please enter a project title.");
      return;
    }

    setSaveLoading(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setSaveError("Not authenticated. Please login first.");
        setSaveLoading(false);
        return;
      }

      const response = await fetch("http://localhost:8000/api/v1/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: projectTitle,
          description: projectDescription,
          project_type: "paper",
          query: inputState.query,
          content: paper,
          papers_data: inputState.papers,
          gaps_data: inputState.gaps,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Failed to save project.");
      }

      const result = await response.json();
      setSaveSuccess(`Project "${result.title}" saved successfully!`);
      setProjectTitle("");
      setProjectDescription("");
      setShowSaveDialog(false);

      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err) {
      setSaveError(err.message || "Failed to save project.");
    } finally {
      setSaveLoading(false);
    }
  };

  const downloadFile = (filename, content, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.style.display = "none";
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  const exportLaTeX = () => {
    const title = String(paper.title || "Research Paper");
    const latex = buildAcademicLatex({
      title,
      authors: paper.authors || "Research Team",
      query: inputState.query,
      fields: inputState.themes || [],
      abstract: paper.abstract,
      sections: paper.sections || [],
      gaps: inputState.gaps || [],
      references: inputState.papers || [],
    });

    const filename = `${title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.tex`;
    downloadFile(filename, latex, "application/x-latex;charset=utf-8");
  };

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto space-y-6">
        <FadeIn>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                Full Research Paper
              </h1>
              <p className="text-slate-500 mt-1">
                AI-generated paper including abstract, introduction,
                methodology, and discussion
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                icon={FileText}
                size="sm"
                onClick={exportLaTeX}
              >
                Export LaTeX
              </Button>
              <Button
                variant="secondary"
                icon={Download}
                size="sm"
                onClick={downloadPDF}
              >
                Download PDF
              </Button>
              <Button
                variant="secondary"
                icon={FileText}
                size="sm"
                onClick={checkPlagiarism}
              >
                Check Similarity
              </Button>
              <Button
                icon={Save}
                size="sm"
                onClick={() => setShowSaveDialog(true)}
              >
                Save Project
              </Button>
            </div>
          </div>
        </FadeIn>

        {saveSuccess && (
          <FadeIn delay={0.1}>
            <div className="max-w-4xl mx-auto bg-green-50 border border-green-200 text-green-700 p-4 rounded">
              {saveSuccess}
            </div>
          </FadeIn>
        )}

        {saveError && (
          <FadeIn delay={0.1}>
            <div className="max-w-4xl mx-auto bg-red-50 border border-red-200 text-red-700 p-4 rounded">
              {saveError}
            </div>
          </FadeIn>
        )}

        {showSaveDialog && (
          <FadeIn delay={0.1}>
            <Card>
              <CardHeader>
                <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                  Save Project
                </h2>
              </CardHeader>
              <CardBody>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Project Title *
                    </label>
                    <input
                      type="text"
                      value={projectTitle}
                      onChange={(e) => setProjectTitle(e.target.value)}
                      placeholder="Enter project title"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Description (Optional)
                    </label>
                    <textarea
                      value={projectDescription}
                      onChange={(e) => setProjectDescription(e.target.value)}
                      placeholder="Enter project description"
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                    />
                  </div>
                  <div className="flex gap-3 justify-end">
                    <Button
                      variant="secondary"
                      onClick={() => setShowSaveDialog(false)}
                      disabled={saveLoading}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleSaveProject} disabled={saveLoading}>
                      {saveLoading ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          </FadeIn>
        )}

        {plagiarismLoading && (
          <FadeIn delay={0.1}>
            <Card>
              <CardBody>
                <LoadingSpinner text="Checking content similarity..." />
              </CardBody>
            </Card>
          </FadeIn>
        )}

        {plagiarismError && (
          <FadeIn delay={0.1}>
            <div className="max-w-4xl mx-auto bg-red-50 border border-red-200 text-red-700 p-4 rounded">
              {plagiarismError}
            </div>
          </FadeIn>
        )}

        {plagiarismResult && (
          <FadeIn delay={0.1}>
            <Card>
              <CardHeader>
                <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                  Similarity Check Results
                </h2>
              </CardHeader>
              <CardBody>
                <p className="text-slate-700 mb-3">
                  {plagiarismResult.flagged
                    ? `Potential duplicate content detected. Highest similarity: ${(plagiarismResult.max_similarity * 100).toFixed(1)}%`
                    : `No strong duplication patterns found. Highest similarity was ${(plagiarismResult.max_similarity * 100).toFixed(1)}%.`}
                </p>
                <div className="space-y-3">
                  {plagiarismResult.matches.map((match) => (
                    <div
                      key={match.paper_index}
                      className="border border-slate-200 rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {match.title}
                          </p>
                          <p className="text-xs text-slate-500">
                            {match.source}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-slate-700">
                          {(match.similarity * 100).toFixed(1)}%
                        </span>
                      </div>
                      {match.url && (
                        <p className="text-xs text-slate-500 mt-2">
                          Source URL: {match.url}
                        </p>
                      )}
                      <p className="text-sm text-slate-600 mt-2">
                        {match.snippet}
                      </p>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </FadeIn>
        )}

        <FadeIn delay={0.15}>
          <Card>
            <CardBody className="py-8 text-center sm:py-10">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-violet-700">
                Research paper
              </p>
              <h2 className="mx-auto max-w-3xl text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">
                {paper.title}
              </h2>
            </CardBody>
          </Card>
        </FadeIn>

        <FadeIn delay={0.18}>
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
                Abstract
              </h2>
            </CardHeader>
            <CardBody>
              <p className="text-justify text-slate-700 leading-7">
                {normalizePaperText(paper.abstract)}
              </p>
            </CardBody>
          </Card>
        </FadeIn>

        {paper.sections?.map((section, i) => (
          <FadeIn key={i} delay={0.22 + i * 0.05}>
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
                  {section.title}
                </h2>
              </CardHeader>
              <CardBody>
                <p className="text-justify text-slate-700 whitespace-pre-line leading-7">
                  {normalizePaperText(section.content)}
                </p>
              </CardBody>
            </Card>
          </FadeIn>
        ))}

        <FadeIn delay={0.8}>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button variant="secondary" icon={FileText} onClick={exportLaTeX}>
              Export as LaTeX
            </Button>
            <Button variant="secondary" icon={Download} onClick={downloadPDF}>
              Download PDF
            </Button>
            <Button icon={Save} onClick={() => setShowSaveDialog(true)}>
              Save Project
            </Button>
          </div>
        </FadeIn>
      </div>
    </PageTransition>
  );
}
