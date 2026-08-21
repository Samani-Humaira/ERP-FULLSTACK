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
    const margin = 20;
    const maxWidth = pageWidth - margin * 2;
    let yPosition = margin;
    const getLineHeight = (fontSize) => Math.round(fontSize * 1.4);

    const addText = (text, fontSize = 11, indent = 0) => {
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(text || "", maxWidth - indent);
      const x = margin + indent;
      const totalHeight = lines.length * getLineHeight(fontSize);

      if (yPosition + totalHeight > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }
      doc.text(lines, x, yPosition, { baseline: "top" });
      yPosition += totalHeight + 8;
    };

    const addHeading = (text) => {
      const fontSize = 14;
      const titleHeight = getLineHeight(fontSize) + 8;
      if (yPosition + titleHeight > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", "bold");
      doc.text(text, margin, yPosition, { baseline: "top" });
      yPosition += titleHeight;
    };

    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(paper.title, margin, yPosition);
    yPosition += getLineHeight(20) + 12;

    addHeading("Abstract");
    addText(paper.abstract);

    paper.sections.forEach((section) => {
      addHeading(section.title);
      addText(section.content);
    });

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

  const escapeLaTeX = (text) =>
    String(text || "")
      .replace(/\\/g, "\\textbackslash{}")
      .replace(/&/g, "\\&")
      .replace(/%/g, "\\%")
      .replace(/\$/g, "\\$")
      .replace(/#/g, "\\#")
      .replace(/_/g, "\\_")
      .replace(/\{/g, "\\{")
      .replace(/\}/g, "\\}")
      .replace(/\^/g, "\\^{}")
      .replace(/~/g, "\\textasciitilde{}")
      .replace(/</g, "\\textless{}")
      .replace(/>/g, "\\textgreater{}")
      .replace(/\n/g, "\\newline ");

  const exportLaTeX = () => {
    const latex = [
      "\\documentclass{article}",
      "\\usepackage[utf8]{inputenc}",
      "\\usepackage[T1]{fontenc}",
      "\\usepackage{lmodern}",
      "\\usepackage{hyperref}",
      "\\title{" + escapeLaTeX(paper.title) + "}",
      "\\date{}",
      "\\begin{document}",
      "\\maketitle",
      "\\begin{abstract}",
      escapeLaTeX(paper.abstract),
      "\\end{abstract}",
      paper.sections
        .map(
          (section) =>
            "\\section{" +
            escapeLaTeX(section.title) +
            "}\n" +
            escapeLaTeX(section.content),
        )
        .join("\n\n"),
      "\\end{document}",
    ].join("\n\n");

    const filename = `${paper.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.tex`;
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
            <CardHeader>
              <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                Abstract
              </h2>
            </CardHeader>
            <CardBody>
              <p className="text-slate-700 leading-relaxed">{paper.abstract}</p>
            </CardBody>
          </Card>
        </FadeIn>

        {paper.sections?.map((section, i) => (
          <FadeIn key={i} delay={0.2 + i * 0.05}>
            <Card>
              <CardHeader>
                <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                  {section.title}
                </h2>
              </CardHeader>
              <CardBody>
                <p className="text-slate-700 whitespace-pre-line leading-relaxed">
                  {section.content}
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
