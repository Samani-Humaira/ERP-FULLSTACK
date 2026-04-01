import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FileText, Download, Save } from "lucide-react";
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
              <Button variant="secondary" icon={FileText} size="sm">
                Export as LaTeX
              </Button>
              <Button variant="secondary" icon={Download} size="sm">
                Download PDF
              </Button>
              <Button icon={Save} size="sm">
                Save Project
              </Button>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <Card>
            <CardHeader>
              <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                Title
              </h2>
            </CardHeader>
            <CardBody>
              <h3 className="text-xl font-bold text-slate-800 leading-relaxed">
                {paper.title}
              </h3>
            </CardBody>
          </Card>
        </FadeIn>

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
            <Button variant="secondary" icon={FileText}>
              Export as LaTeX
            </Button>
            <Button variant="secondary" icon={Download}>
              Download PDF
            </Button>
            <Button icon={Save}>Save Project</Button>
          </div>
        </FadeIn>
      </div>
    </PageTransition>
  );
}
