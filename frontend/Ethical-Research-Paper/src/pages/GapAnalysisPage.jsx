import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Lightbulb,
  AlertTriangle,
  Target,
  ClipboardPen,
  FileCode,
} from "lucide-react";
import Card, { CardBody, CardHeader } from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import {
  PageTransition,
  FadeIn,
  StaggerContainer,
  StaggerItem,
} from "../components/ui/animations";
import { logActivity } from "../api/activity";

const priorityVariant = {
  High: "danger",
  Medium: "warning",
  Low: "neutral",
};

export default function GapAnalysisPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [themes, setThemes] = useState([]);
  const [limitations, setLimitations] = useState([]);
  const [gaps, setGaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const hasLogged = useRef(false);

  const query = location.state?.query || "";
  const papers = location.state?.papers || [];

  useEffect(() => {
    if (!papers.length || !query) {
      setError("No papers found. Please go back and search first.");
      setLoading(false);
      return;
    }

    const analyzeGaps = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("http://localhost:8000/api/v1/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, papers }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.detail || "Analysis failed");
        }

        const data = await res.json();

        setThemes(data.themes || []);
        setLimitations(data.limitations || []);
        setGaps(data.gaps || []);

        // Only log once even if useEffect fires twice (React Strict Mode)
        if (!hasLogged.current) {
          hasLogged.current = true;
          await logActivity("gap_analysis", query);
        }
      } catch (err) {
        console.error(err);
        setError(err.message || "Something went wrong during gap analysis.");
      } finally {
        setLoading(false);
      }
    };

    analyzeGaps();
  }, []);

  if (loading) {
    return (
      <PageTransition>
        <LoadingSpinner text="Analyzing research gaps..." />
      </PageTransition>
    );
  }

  if (error) {
    return (
      <PageTransition>
        <div className="max-w-4xl mx-auto text-center space-y-4 py-20">
          <p className="text-red-500 font-medium">{error}</p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <FadeIn>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                Research Gap Analysis
              </h1>
              <p className="text-slate-500 mt-1">
                AI-identified gaps and opportunities from analyzed papers
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                icon={ClipboardPen}
                onClick={() =>
                  navigate("/proposal", {
                    state: {
                      query,
                      papers,
                      themes,
                      limitations,
                      gaps,
                    },
                  })
                }
              >
                Generate Research Proposal
              </Button>

              <Button
                variant="secondary"
                icon={FileCode}
                onClick={() =>
                  navigate("/paper", {
                    state: { query, papers, themes, limitations, gaps },
                  })
                }
              >
                Generate Full Research Paper
              </Button>
            </div>
          </div>
        </FadeIn>

        {/* Common Research Themes */}
        <FadeIn delay={0.1}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                <h2 className="text-lg font-semibold text-slate-800">
                  Common Research Themes
                </h2>
              </div>
            </CardHeader>
            <CardBody>
              <div className="flex flex-wrap gap-2">
                {themes.length > 0 ? (
                  themes.map((theme, i) => (
                    <Badge
                      key={i}
                      variant="primary"
                      className="text-sm px-3 py-1"
                    >
                      {theme.label}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">
                    No themes identified.
                  </p>
                )}
              </div>
            </CardBody>
          </Card>
        </FadeIn>

        {/* Extracted Limitations */}
        <FadeIn delay={0.2}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <h2 className="text-lg font-semibold text-slate-800">
                  Extracted Limitations
                </h2>
              </div>
            </CardHeader>
            <CardBody>
              <StaggerContainer className="space-y-4" staggerDelay={0.08}>
                {limitations.length > 0 ? (
                  limitations.map((lim, i) => (
                    <StaggerItem key={i}>
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50/80 border border-amber-100">
                        <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm text-slate-700">{lim.text}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            Source: {lim.source}
                          </p>
                        </div>
                      </div>
                    </StaggerItem>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">
                    No limitations extracted.
                  </p>
                )}
              </StaggerContainer>
            </CardBody>
          </Card>
        </FadeIn>

        {/* Identified Research Gaps */}
        <FadeIn delay={0.3}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary-600" />
                <h2 className="text-lg font-semibold text-slate-800">
                  Identified Research Gaps
                </h2>
              </div>
            </CardHeader>
            <CardBody>
              <StaggerContainer className="space-y-4" staggerDelay={0.1}>
                {gaps.length > 0 ? (
                  gaps.map((gap, i) => (
                    <StaggerItem key={i}>
                      <div className="p-4 rounded-lg border-2 border-primary-100 bg-primary-50/50">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h3 className="font-semibold text-slate-800">
                            {gap.title}
                          </h3>
                          <Badge
                            variant={priorityVariant[gap.priority]}
                            className="shrink-0"
                          >
                            {gap.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600">
                          {gap.description}
                        </p>
                      </div>
                    </StaggerItem>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">No gaps identified.</p>
                )}
              </StaggerContainer>
            </CardBody>
          </Card>
        </FadeIn>
      </div>
    </PageTransition>
  );
}
