import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ExternalLink,
  ChevronDown,
  ChevronUp,
  GitCompareArrows,
} from "lucide-react";

import Card, { CardBody } from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import { logActivity } from "../api/activity";

import {
  PageTransition,
  FadeIn,
  StaggerContainer,
  StaggerItem,
} from "../components/ui/animations";

export default function PapersPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [papers, setPapers] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);

  const query = new URLSearchParams(location.search).get("query") || "";

  useEffect(() => {
    if (!query) return;

    const fetchPapers = async () => {
      try {
        setLoading(true);

        const res = await fetch(
          `http://localhost:8000/api/v1/search?query=${encodeURIComponent(
            query,
          )}&top_n=10`,
        );

        const data = await res.json();
        setPapers(data.papers || []);

        // Log ONCE after papers are set — not during enrichment/fetching
        if (data.papers?.length > 0) {
          await logActivity("search", query);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPapers();
  }, [query]);

  // Navigate to gap analysis — pass query + papers via location state
  const handleAnalyzeGap = () => {
    navigate("/gap-analysis", {
      state: {
        query,
        papers,
      },
    });
  };

  if (loading) {
    return (
      <PageTransition>
        <LoadingSpinner text="Fetching papers..." />
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <FadeIn>
          <div className="flex justify-between">
            <div>
              <h1 className="text-2xl font-bold">Retrieved Papers</h1>
              <p className="text-slate-500">{papers.length} papers found</p>
            </div>

            <Button
              icon={GitCompareArrows}
              onClick={handleAnalyzeGap}
              disabled={papers.length === 0}
            >
              Analyze Research Gap 
            </Button>
          </div>
        </FadeIn>

        {/* Papers */}
        <StaggerContainer className="space-y-4">
          {papers.map((paper, index) => {
            const isExpanded = expandedId === index;

            return (
              <StaggerItem key={index}>
                <Card>
                  <CardBody className="p-5">
                    <div className="space-y-3">
                      {/* Title + Year */}
                      <div className="flex justify-between">
                        <h3 className="font-semibold">{paper.title}</h3>
                        <Badge>{paper.year}</Badge>
                      </div>

                      {/* Authors */}
                      <p className="text-sm text-slate-500">
                        {paper.authors?.join(", ")}
                      </p>

                      {/* Source */}
                      <Badge variant="primary">{paper.source}</Badge>

                      {/* Abstract */}
                      <p className="text-sm whitespace-pre-wrap">
                        {isExpanded
                          ? paper.abstract?.replace(/\\n/g, "\n")
                          : paper.abstract
                              ?.replace(/\\n/g, "\n")
                              .slice(0, 150) + "..."}
                      </p>

                      {/* Buttons */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setExpandedId(isExpanded ? null : index)
                          }
                          icon={isExpanded ? ChevronUp : ChevronDown}
                        >
                          {isExpanded ? "Show Less" : "View Details"}
                        </Button>

                        {paper.url && (
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={ExternalLink}
                            onClick={() => window.open(paper.url, "_blank")}
                          >
                            Open Paper
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </div>
    </PageTransition>
  );
}
