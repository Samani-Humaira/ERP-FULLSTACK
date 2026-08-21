import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Sparkles } from "lucide-react";
import Card, { CardBody } from "../components/ui/Card";
import Button from "../components/ui/Button";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import { PageTransition, FadeIn } from "../components/ui/animations";

export default function ResearchInputPage() {
  const navigate = useNavigate();

  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);

  const enhancedPrompt = useMemo(() => {
    const trimmed = topic.trim();
    if (!trimmed) return "";

    return `Search for recent academic research on "${trimmed}". Focus on current trends, key methodologies, notable authors, important findings, limitations, and future directions.`;
  }, [topic]);

  const handleSearch = (e) => {
    e.preventDefault();

    if (!topic.trim()) return;

    setLoading(true);

    setTimeout(() => {
      setLoading(false);

      // pass enhanced query to the paper search page
      navigate(`/papers?query=${encodeURIComponent(enhancedPrompt)}`);
    }, 1000);
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="max-w-3xl mx-auto mt-24">
          <Card>
            <CardBody className="py-16">
              <LoadingSpinner text="Searching for relevant papers..." />
            </CardBody>
          </Card>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="max-w-3xl mx-auto space-y-6">
        <FadeIn>
          <h1 className="text-2xl font-bold text-slate-800">Start Research</h1>
        </FadeIn>

        <FadeIn delay={0.1}>
          <Card>
            <CardBody className="p-6">
              <form onSubmit={handleSearch} className="space-y-5">
                <div>
                  <label className="text-sm font-medium">Research Topic</label>

                  <div className="relative">
                    <textarea
                      rows={4}
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g. AI in healthcare"
                      className="w-full border rounded-lg p-3"
                      required
                    />

                    <Sparkles className="absolute top-3 right-3 w-4 h-4" />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">
                    Enhanced Search Prompt
                  </label>

                  <textarea
                    rows={3}
                    value={enhancedPrompt}
                    readOnly
                    className="w-full border rounded-lg p-3 bg-slate-50 text-slate-700"
                    placeholder="Your enhanced search prompt will appear here as you type."
                  />

                  <p className="mt-2 text-sm text-slate-500">
                    This prompt refines your research topic into a more
                    effective search query.
                  </p>
                </div>

                <Button
                  type="submit"
                  icon={Search}
                  size="lg"
                  className="w-full"
                >
                  Search Papers
                </Button>
              </form>
            </CardBody>
          </Card>
        </FadeIn>
      </div>
    </PageTransition>
  );
}
