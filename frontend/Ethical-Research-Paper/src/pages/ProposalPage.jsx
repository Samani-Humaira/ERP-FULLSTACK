import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FileCode, Download, Save } from "lucide-react";
import Card, { CardBody, CardHeader } from "../components/ui/Card";
import Button from "../components/ui/Button";
import {
  PageTransition,
  FadeIn,
  StaggerContainer,
  StaggerItem,
} from "../components/ui/animations";
import LoadingSpinner from "../components/ui/LoadingSpinner";

export default function ProposalPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const inputState = location.state || {};

  const [proposal, setProposal] = useState(null);
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

    const fetchProposal = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          "http://localhost:8000/api/v1/proposal/generate",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
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

        const data = await res.json();
        setProposal(data);
      } catch (err) {
        setError(err.message || "Failed to generate proposal");
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
              <Button variant="secondary" icon={FileCode} size="sm">
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
                Proposed Title
              </h2>
            </CardHeader>
            <CardBody>
              <h3 className="text-xl font-bold text-slate-800 leading-relaxed">
                {proposal.title}
              </h3>
            </CardBody>
          </Card>
        </FadeIn>

        <FadeIn delay={0.15}>
          <Card>
            <CardHeader>
              <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                Problem Statement
              </h2>
            </CardHeader>
            <CardBody>
              <p className="text-slate-700 leading-relaxed">
                {proposal.problem_statement}
              </p>
            </CardBody>
          </Card>
        </FadeIn>

        <FadeIn delay={0.2}>
          <Card>
            <CardHeader>
              <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                Proposed Methodology
              </h2>
            </CardHeader>
            <CardBody>
              <StaggerContainer className="space-y-3">
                {proposal.methodology.map((step, i) => (
                  <StaggerItem key={i}>
                    <li className="flex items-start gap-3 list-none">
                      <span className="flex items-center justify-center h-6 w-6 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 text-primary-700 text-xs font-bold shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {step}
                      </p>
                    </li>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </CardBody>
          </Card>
        </FadeIn>

        <FadeIn delay={0.25}>
          <Card>
            <CardHeader>
              <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                Expected Contribution
              </h2>
            </CardHeader>
            <CardBody>
              <StaggerContainer className="space-y-3">
                {proposal.expected_contributions.map((item, i) => (
                  <StaggerItem key={i}>
                    <li className="flex items-start gap-3 list-none">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary-500 mt-2 shrink-0" />
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {item}
                      </p>
                    </li>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </CardBody>
          </Card>
        </FadeIn>

        <FadeIn delay={0.3}>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button variant="secondary" icon={FileCode}>
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
