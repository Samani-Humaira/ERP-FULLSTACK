import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FileCode, FileText, Download, Save } from "lucide-react";
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

export default function ProposalPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const inputState = location.state || {};

  const [proposal, setProposal] = useState(null);
  const [editableProposal, setEditableProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState(
    "Preparing proposal flow...",
  );
  const [progressStep, setProgressStep] = useState(1);
  const [plagiarismResult, setPlagiarismResult] = useState(null);
  const [plagiarismLoading, setPlagiarismLoading] = useState(false);
  const [plagiarismError, setPlagiarismError] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(null);
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const activeProposal = editableProposal || proposal;

  useEffect(() => {
    const { query, papers, themes, limitations, gaps } = inputState;

    if (!query || !papers?.length || !themes?.length || !gaps?.length) {
      setError(
        "Missing input from gap analysis. Please complete gap analysis first.",
      );
      setLoading(false);
      return;
    }

    const fetchProposal = async () => {
      try {
        setLoading(true);
        setError(null);
        setStatusMessage("Validating gap analysis inputs...");
        setProgressStep(1);

        const res = await fetch(
          "http://localhost:8000/api/v1/proposal/generate",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify({
              query,
              papers,
              themes: themes.map((t) => t.label || t),
              limitations: limitations.map((l) => l.text || l),
              gaps,
            }),
          },
        );

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.detail || "Proposal generation failed");
        }

        setStatusMessage("Generating research proposal...");
        setProgressStep(2);

        const data = await res.json();
        setProposal(data);
        setEditableProposal(data);
        setStatusMessage("Proposal ready. Edit content and export or save.");
        setProgressStep(3);
      } catch (err) {
        setError(err.message || "Failed to generate proposal");
        setStatusMessage("Proposal generation failed.");
      } finally {
        setLoading(false);
      }
    };

    fetchProposal();
  }, [inputState]);

  if (loading) {
    return (
      <PageTransition>
        <LoadingSpinner text="Generating research proposal..." />
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

  if (!proposal) {
    return null;
  }

  const downloadPDF = () => {
    const activeProposal = editableProposal || proposal;
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
        if (!matches.length) {
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

    doc.setFont("times", "bold");
    doc.setFontSize(19);
    const titleLines = wrapText(
      String(activeProposal.title || "Research Proposal"),
      fullWidth,
    );
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
    addFullWidthParagraphs(activeProposal.background, 9, 12);
    y += 10;
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 17;
    firstColumnTop = y;

    const sections = [
      { title: "Background", content: activeProposal.background },
      { title: "Problem Statement", content: activeProposal.problem_statement },
      { title: "Methodology", content: activeProposal.methodology.join("\n") },
      {
        title: "Expected Contributions",
        content: activeProposal.expected_contributions.join("\n"),
      },
      { title: "Timeline", content: activeProposal.timeline },
      { title: "Resources", content: activeProposal.resources.join("\n") },
    ];

    let sectionNumber = 0;
    sections.forEach((section) => {
      sectionNumber += 1;
      addSectionHeading(section.title, toRomanNumeral(sectionNumber));
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

    doc.save(
      `${activeProposal.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_proposal.pdf`,
    );
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
      const activeProposal = editableProposal || proposal;
      const sourceText = [
        activeProposal.title,
        activeProposal.problem_statement,
        activeProposal.methodology.join("\n"),
        activeProposal.expected_contributions.join("\n"),
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

  const updateProposalField = (field, value) => {
    setEditableProposal((prev) => ({ ...prev, [field]: value }));
  };

  const updateProposalLines = (field, raw) => {
    setEditableProposal((prev) => ({
      ...prev,
      [field]: raw
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    }));
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
          project_type: "proposal",
          query: inputState.query,
          content: activeProposal,
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
    const activeProposal = editableProposal || proposal;
    const latex = buildAcademicLatex({
      title: activeProposal.title || "Research Proposal",
      authors: activeProposal.authors || "Research Team",
      query: inputState.query,
      fields: inputState.themes || [],
      abstract:
        activeProposal.abstract ||
        [activeProposal.background, activeProposal.problem_statement]
          .filter(Boolean)
          .join("\n\n"),
      sections: [
        { title: "Background", content: activeProposal.background },
        {
          title: "Problem Statement",
          content: activeProposal.problem_statement,
        },
        {
          title: "Objectives",
          content: activeProposal.objectives,
          listType: "enumerate",
        },
        {
          title: "Proposed Methodology",
          content: activeProposal.methodology,
          listType: "enumerate",
        },
        {
          title: "Expected Contributions",
          content: activeProposal.expected_contributions,
        },
        { title: "Timeline", content: activeProposal.timeline },
        { title: "Resources", content: activeProposal.resources },
      ],
      gaps: inputState.gaps || [],
      references: inputState.papers || [],
    });

    const safeFilename = `${activeProposal.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.tex`;
    downloadFile(safeFilename, latex, "application/x-latex;charset=utf-8");
  };

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <FadeIn>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                Research Proposal
              </h1>
              <p className="text-slate-500 mt-1">
                AI-generated proposal based on identified research gaps
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                icon={FileCode}
                size="sm"
                onClick={exportLaTeX}
              >
                Export as LaTeX
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

        <FadeIn delay={0.05}>
          <Card className="bg-slate-100/80">
            <CardBody className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Proposal workflow
                  </p>
                  <p className="text-sm text-slate-500">
                    Review, edit, and export your AI proposal with clear
                    progress steps.
                  </p>
                </div>
                <div className="text-sm font-medium text-slate-700">
                  {statusMessage}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    title: "Validate",
                    active: progressStep >= 1,
                    label: "Step 1",
                  },
                  {
                    title: "Generate",
                    active: progressStep >= 2,
                    label: "Step 2",
                  },
                  {
                    title: "Review",
                    active: progressStep >= 3,
                    label: "Step 3",
                  },
                ].map((step) => (
                  <div
                    key={step.title}
                    className={`rounded-3xl border p-3 transition-colors duration-200 ${
                      step.active
                        ? "border-primary-200 bg-primary-50/80 text-primary-700"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <p className="text-[11px] uppercase tracking-[0.24em] font-semibold">
                      {step.label}
                    </p>
                    <p className="mt-2 text-sm font-semibold">{step.title}</p>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
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

        <FadeIn delay={0.1}>
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                    Editable Proposal Content
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Modify the proposal before exporting or saving.
                    Line-separated fields become list entries.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditableProposal(proposal)}
                >
                  Reset Edits
                </Button>
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Proposal Title
                </label>
                <input
                  type="text"
                  value={activeProposal?.title || ""}
                  onChange={(e) => updateProposalField("title", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white/90 px-4 py-3 text-slate-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Background
                </label>
                <textarea
                  value={activeProposal?.background || ""}
                  onChange={(e) =>
                    updateProposalField("background", e.target.value)
                  }
                  rows={4}
                  className="w-full rounded-xl border border-slate-300 bg-white/90 px-4 py-3 text-slate-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Problem Statement
                </label>
                <textarea
                  value={activeProposal?.problem_statement || ""}
                  onChange={(e) =>
                    updateProposalField("problem_statement", e.target.value)
                  }
                  rows={4}
                  className="w-full rounded-xl border border-slate-300 bg-white/90 px-4 py-3 text-slate-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                />
              </div>
            </CardBody>
          </Card>
        </FadeIn>

        <FadeIn delay={0.15}>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                  Objectives
                </h2>
              </CardHeader>
              <CardBody>
                <textarea
                  value={(activeProposal?.objectives || []).join("\n")}
                  onChange={(e) =>
                    updateProposalLines("objectives", e.target.value)
                  }
                  rows={5}
                  className="w-full rounded-xl border border-slate-300 bg-white/90 px-4 py-3 text-slate-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Use one objective per line.
                </p>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                  Proposed Methodology
                </h2>
              </CardHeader>
              <CardBody>
                <textarea
                  value={(activeProposal?.methodology || []).join("\n")}
                  onChange={(e) =>
                    updateProposalLines("methodology", e.target.value)
                  }
                  rows={5}
                  className="w-full rounded-xl border border-slate-300 bg-white/90 px-4 py-3 text-slate-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Each line becomes a separate methodology step.
                </p>
              </CardBody>
            </Card>
          </div>
        </FadeIn>

        <FadeIn delay={0.2}>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                  Expected Contributions
                </h2>
              </CardHeader>
              <CardBody>
                <textarea
                  value={(activeProposal?.expected_contributions || []).join(
                    "\n",
                  )}
                  onChange={(e) =>
                    updateProposalLines(
                      "expected_contributions",
                      e.target.value,
                    )
                  }
                  rows={5}
                  className="w-full rounded-xl border border-slate-300 bg-white/90 px-4 py-3 text-slate-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Use one contribution per line.
                </p>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                  Resources
                </h2>
              </CardHeader>
              <CardBody>
                <textarea
                  value={(activeProposal?.resources || []).join("\n")}
                  onChange={(e) =>
                    updateProposalLines("resources", e.target.value)
                  }
                  rows={5}
                  className="w-full rounded-xl border border-slate-300 bg-white/90 px-4 py-3 text-slate-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Use one resource per line.
                </p>
              </CardBody>
            </Card>
          </div>
        </FadeIn>

        <FadeIn delay={0.25}>
          <Card>
            <CardHeader>
              <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                Timeline
              </h2>
            </CardHeader>
            <CardBody>
              <textarea
                value={activeProposal?.timeline || ""}
                onChange={(e) =>
                  updateProposalField("timeline", e.target.value)
                }
                rows={5}
                className="w-full rounded-xl border border-slate-300 bg-white/90 px-4 py-3 text-slate-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
              />
              <p className="mt-2 text-xs text-slate-500">
                Update the project timeline based on your preferred schedule.
              </p>
            </CardBody>
          </Card>
        </FadeIn>

        <FadeIn delay={0.3}>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button variant="secondary" icon={FileCode} onClick={exportLaTeX}>
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
