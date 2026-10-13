import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ExternalLink,
  ChevronDown,
  ChevronUp,
  GitCompareArrows,
  BookOpen,
  Search,
  ArrowRight,
  FileSearch,
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
    if (!query) {
      setLoading(false);
      return;
    }

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
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <FadeIn>
          <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-sm">
            <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700">
                  <BookOpen className="h-3.5 w-3.5" />
                  LITERATURE DISCOVERY
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Research papers
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  {query
                    ? `${papers.length} papers found for your search`
                    : "Search a topic to discover relevant literature."}
                </p>
              </div>
              <Button
                icon={GitCompareArrows}
                onClick={handleAnalyzeGap}
                disabled={papers.length === 0}
              >
                Analyze research gaps
              </Button>
            </div>
            {query && (
              <div className="flex items-start gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4 sm:px-8">
                <Search className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
                <p className="text-sm leading-6 text-slate-600">{query}</p>
              </div>
            )}
          </div>
        </FadeIn>

        {/* Papers */}
        <StaggerContainer className="space-y-4">
          {papers.map((paper, index) => {
            const isExpanded = expandedId === index;

            return (
              <StaggerItem key={index}>
                <Card className="overflow-hidden">
                  <CardBody className="p-5 sm:p-6">
                    <div className="flex items-start gap-4">
                      <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-50 to-violet-50 text-primary-700 ring-1 ring-primary-100/70 sm:flex">
                        <FileSearch className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <h2 className="max-w-3xl text-base font-semibold leading-6 text-slate-900 sm:text-lg">
                            {paper.title || "Untitled paper"}
                          </h2>
                          {paper.year && <Badge>{paper.year}</Badge>}
                        </div>
                        <p className="mt-2 text-sm text-slate-500">
                          {Array.isArray(paper.authors)
                            ? paper.authors.join(", ")
                            : paper.authors || "Author information unavailable"}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {paper.source && (
                            <Badge variant="primary">{paper.source}</Badge>
                          )}
                          <span className="text-xs text-slate-400">
                            Paper {index + 1}
                          </span>
                        </div>
                        <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                          {isExpanded
                            ? paper.abstract?.replace(/\\n/g, "\n") ||
                              "No abstract available."
                            : `${paper.abstract?.replace(/\\n/g, "\n").slice(0, 220) || "No abstract available."}${paper.abstract?.length > 220 ? "…" : ""}`}
                        </p>
                        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                          {paper.abstract && paper.abstract.length > 220 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setExpandedId(isExpanded ? null : index)
                              }
                              icon={isExpanded ? ChevronUp : ChevronDown}
                            >
                              {isExpanded ? "Show less" : "Read abstract"}
                            </Button>
                          )}
                          {paper.url && (
                            <a
                              href={paper.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-primary-700 hover:bg-primary-50"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              Open source
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </StaggerItem>
            );
          })}
        </StaggerContainer>

        {!loading && papers.length === 0 && (
          <FadeIn>
            <Card>
              <CardBody className="flex flex-col items-center px-6 py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
                  <BookOpen className="h-6 w-6" />
                </div>
                <h2 className="mt-4 text-lg font-semibold text-slate-900">
                  {query
                    ? "No papers found yet"
                    : "Start with a research topic"}
                </h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                  {query
                    ? "Try broadening your keywords or searching for a related topic."
                    : "Search academic literature to build your paper collection and analyze open research questions."}
                </p>
                <Button
                  className="mt-5"
                  icon={Search}
                  onClick={() => navigate("/research")}
                >
                  Search another topic <ArrowRight className="h-4 w-4" />
                </Button>
              </CardBody>
            </Card>
          </FadeIn>
        )}
      </div>
    </PageTransition>
  );
}
