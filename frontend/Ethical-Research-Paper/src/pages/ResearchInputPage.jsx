import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Sparkles,
  BookOpen,
  ArrowRight,
  Microscope,
  ShieldCheck,
  Lightbulb,
} from "lucide-react";
import Card, { CardBody } from "../components/ui/Card";
import Button from "../components/ui/Button";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import { PageTransition, FadeIn } from "../components/ui/animations";

export default function ResearchInputPage() {
  const navigate = useNavigate();

  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const suggestions = [
    "AI in healthcare",
    "Climate change adaptation",
    "Ethical machine learning",
  ];

  const enhancedPrompt = useMemo(() => {
    const trimmed = topic.trim();
    if (!trimmed) return "";

    return `Search for recent academic research on "${trimmed}".`;
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
      <div className="mx-auto max-w-5xl space-y-7">
        <FadeIn>
          <div className="flex items-center gap-3 text-sm font-medium text-primary-700">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-100">
              <Microscope className="h-4 w-4" />
            </span>
            Research workspace
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            What are you curious about?
          </h1>
          <p className="mt-2 max-w-2xl text-slate-500">
            Start with a topic. We’ll help you find relevant literature and map
            the questions worth exploring.
          </p>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.65fr)]">
            <Card className="overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-primary-500 via-indigo-500 to-violet-500" />
              <CardBody className="p-6 sm:p-8">
                <form onSubmit={handleSearch} className="space-y-6">
                  <div>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <label
                        htmlFor="research-topic"
                        className="text-sm font-semibold text-slate-800"
                      >
                        Your research topic
                      </label>
                      <span className="text-xs text-slate-400">
                        Be as specific as you like
                      </span>
                    </div>
                    <div className="relative">
                      <textarea
                        id="research-topic"
                        rows={4}
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="e.g. How can explainable AI improve early diagnosis in primary care?"
                        className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50/70 p-4 pr-12 text-sm leading-6 text-slate-800 shadow-inner shadow-slate-900/[0.02] placeholder:text-slate-400 focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary-100"
                        required
                      />
                      <Sparkles className="absolute right-4 top-4 h-4 w-4 text-violet-400" />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {suggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => setTopic(suggestion)}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/90 to-violet-50/70 p-4 sm:p-5">
                    <div className="flex items-center gap-2 text-sm font-semibold text-indigo-950">
                      <Sparkles className="h-4 w-4 text-violet-500" />
                      Search preview
                    </div>
                    <p className="mt-3 min-h-12 text-sm leading-6 text-indigo-900/75">
                      {enhancedPrompt ||
                        "Your focused academic search query will appear here as you type."}
                    </p>
                  </div>

                  <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <p className="inline-flex items-center gap-2 text-xs text-slate-400">
                      <ShieldCheck className="h-4 w-4 text-emerald-500" />
                      Your research remains organized in your workspace
                    </p>
                    <Button
                      type="submit"
                      icon={Search}
                      size="lg"
                      className="sm:min-w-52"
                    >
                      Find research papers
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </CardBody>
            </Card>

            <div className="space-y-4">
              <Card className="overflow-hidden border-indigo-100 bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 text-white">
                <CardBody className="p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-indigo-100">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <h2 className="mt-5 text-lg font-semibold">
                    From topic to insight
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-indigo-100/75">
                    Explore current literature, compare findings, and uncover
                    promising directions for your work.
                  </p>
                  <div className="mt-5 space-y-3">
                    {[
                      "Discover relevant papers",
                      "Analyze themes and limitations",
                      "Develop a research direction",
                    ].map((step, index) => (
                      <div
                        key={step}
                        className="flex items-center gap-3 text-xs text-indigo-100/85"
                      >
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 font-semibold text-white">
                          {index + 1}
                        </span>
                        {step}
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
              <div className="flex gap-3 rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p className="text-xs leading-5 text-amber-900/75">
                  <span className="font-semibold text-amber-950">Tip:</span>{" "}
                  Adding a population, method, or context can make your results
                  more focused.
                </p>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </PageTransition>
  );
}
