import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  FolderOpen,
  BarChart3,
  GitCompareArrows,
  ClipboardPen,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Sparkles,
  FileSearch,
} from "lucide-react";
import Card, { CardBody } from "../components/ui/Card";
import {
  PageTransition,
  FadeIn,
  StaggerContainer,
  StaggerItem,
  AnimatedCounter,
} from "../components/ui/animations";
import { getDashboard } from "../api/activity";

// Map activity type from API to icon + label
const ACTIVITY_META = {
  search: { icon: Search, label: "Research Search" },
  gap_analysis: { icon: BarChart3, label: "Gap Analysis" },
  proposal: { icon: ClipboardPen, label: "Proposal" },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} minute${mins > 1 ? "s" : ""} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

export default function DashboardPage() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const firstName = user?.full_name?.split(" ")[0] || "Researcher";

  const [stats, setStats] = useState({
    total_searches: 0,
    gaps_identified: 0,
    proposals_generated: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const data = await getDashboard();
        setStats(data.stats);
        setRecentActivity(data.recent_activity);
      } catch (err) {
        console.error("Dashboard fetch failed:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const statCards = [
    {
      label: "Total Searches",
      value: stats.total_searches,
      icon: Search,
      color: "bg-primary-100 text-primary-600",
    },
    {
      label: "Gaps Identified",
      value: stats.gaps_identified,
      icon: GitCompareArrows,
      color: "bg-amber-100 text-amber-600",
    },
    {
      label: "Proposals Generated",
      value: stats.proposals_generated,
      icon: ClipboardPen,
      color: "bg-emerald-100 text-emerald-600",
    },
  ];

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Research hero */}
        <FadeIn>
          <section className="relative isolate overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 px-6 py-8 text-white shadow-xl shadow-indigo-950/15 sm:px-9 sm:py-10 lg:px-12 lg:py-12">
            <div className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full bg-violet-400/20 blur-3xl" />
            <div className="pointer-events-none absolute bottom-[-7rem] left-[32%] h-64 w-64 rounded-full bg-blue-400/15 blur-3xl" />
            <div className="relative grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="max-w-2xl">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-medium tracking-wide text-indigo-100 backdrop-blur-sm">
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  YOUR RESEARCH WORKSPACE
                </div>
                <p className="mb-2 text-sm font-medium text-indigo-200">
                  Welcome back, {firstName}
                </p>
                <h1 className="max-w-xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-[3.25rem]">
                  From big questions to{" "}
                  <span className="bg-gradient-to-r from-cyan-200 via-blue-200 to-violet-200 bg-clip-text text-transparent">
                    research breakthroughs.
                  </span>
                </h1>
                <p className="mt-5 max-w-lg text-sm leading-6 text-indigo-100/80 sm:text-base sm:leading-7">
                  Discover the literature, uncover research gaps, and shape your
                  ideas into a paper—all in one focused workspace.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link
                    to="/research"
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-indigo-950 shadow-lg shadow-black/10 hover:-translate-y-0.5 hover:bg-indigo-50"
                  >
                    <Search className="h-4 w-4" />
                    Start researching
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                  <Link
                    to="/projects"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur hover:bg-white/15"
                  >
                    View my projects
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
                <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-indigo-100/70">
                  <span>Literature discovery</span>
                  <span>Research gap analysis</span>
                  <span>Paper generation</span>
                </div>
              </div>

              <div className="relative mx-auto w-full max-w-md lg:ml-auto">
                <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-cyan-400/20 to-violet-400/20 blur-2xl" />
                <div className="relative rounded-3xl border border-white/15 bg-white/[0.09] p-4 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-5">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-300/25 to-violet-300/25 text-cyan-100">
                        <BookOpen className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">
                          Research workflow
                        </p>
                        <p className="text-xs text-indigo-100/60">
                          From question to insight
                        </p>
                      </div>
                    </div>
                    <Sparkles className="h-4 w-4 text-amber-200" />
                  </div>
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/25 p-3.5">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-400/15 text-blue-200">
                        <FileSearch className="h-4 w-4" />
                      </span>
                      <span className="flex-1">
                        <span className="block text-xs font-semibold text-white">
                          Discover the literature
                        </span>
                        <span className="mt-1 block text-[10px] text-indigo-100/60">
                          Find relevant papers and sources
                        </span>
                      </span>
                      <span className="text-[10px] font-medium text-cyan-200">
                        01
                      </span>
                    </div>
                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/25 p-3.5">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-400/15 text-violet-200">
                        <BarChart3 className="h-4 w-4" />
                      </span>
                      <span className="flex-1">
                        <span className="block text-xs font-semibold text-white">
                          Reveal research gaps
                        </span>
                        <span className="mt-1 block text-[10px] text-indigo-100/60">
                          Spot opportunities for new work
                        </span>
                      </span>
                      <span className="text-[10px] font-medium text-violet-200">
                        02
                      </span>
                    </div>
                    <div className="flex items-center gap-3 rounded-2xl border border-indigo-200/15 bg-gradient-to-r from-indigo-400/15 to-violet-400/15 p-3.5">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-amber-200">
                        <Sparkles className="h-4 w-4" />
                      </span>
                      <span className="flex-1">
                        <span className="block text-xs font-semibold text-white">
                          Build your paper
                        </span>
                        <span className="mt-1 block text-[10px] text-indigo-100/60">
                          Turn insights into a structured draft
                        </span>
                      </span>
                      <ArrowUpRight className="h-4 w-4 text-indigo-100/70" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </FadeIn>

        {/* <CollaborationPanel
  projectId={project.id}
  currentUser={currentUser}
  token={token}
/> */}

        {/* Quick Actions */}
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StaggerItem>
            <Link to="/research">
              <Card hover className="h-full">
                <CardBody className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-primary-100 to-primary-200/50 rounded-xl">
                    <Search className="h-6 w-6 text-primary-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-800">
                      Start New Research
                    </h3>
                    <p className="text-sm text-slate-500">
                      Search papers and explore topics
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-slate-400" />
                </CardBody>
              </Card>
            </Link>
          </StaggerItem>

          <StaggerItem>
            <Link to="/projects">
              <Card hover className="h-full">
                <CardBody className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-violet-100 to-violet-200/50 rounded-xl">
                    <FolderOpen className="h-6 w-6 text-violet-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-800">
                      View Previous Projects
                    </h3>
                    <p className="text-sm text-slate-500">
                      Browse your saved papers and results
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-slate-400" />
                </CardBody>
              </Card>
            </Link>
          </StaggerItem>
        </StaggerContainer>

        {/* Stats */}
        <FadeIn delay={0.2}>
          <h2 className="text-lg font-semibold text-slate-800 mb-4">
            Your Activity
          </h2>
          <StaggerContainer
            className="grid grid-cols-1 sm:grid-cols-3 gap-4"
            staggerDelay={0.1}
          >
            {statCards.map(({ label, value, icon: Icon, color }) => (
              <StaggerItem key={label}>
                <Card>
                  <CardBody className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-800">
                        {loading ? "—" : <AnimatedCounter target={value} />}
                      </p>
                      <p className="text-sm text-slate-500">{label}</p>
                    </div>
                  </CardBody>
                </Card>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </FadeIn>

        {/* Recent Activity */}
        <FadeIn delay={0.35}>
          <Card>
            <CardBody>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-800">
                  Recent Activity
                </h2>
                {/* <Button variant="ghost" size="sm">View All</Button> */}
              </div>

              {loading ? (
                <p className="text-sm text-slate-400 text-center py-4">
                  Loading...
                </p>
              ) : recentActivity.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">
                  No activity yet. Start by searching a research topic!
                </p>
              ) : (
                <StaggerContainer className="space-y-3" staggerDelay={0.06}>
                  {recentActivity.map((item) => {
                    const meta = ACTIVITY_META[item.type] || {
                      icon: Search,
                      label: item.type,
                    };
                    const Icon = meta.icon;
                    return (
                      <StaggerItem key={item.id}>
                        <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50">
                          <div className="p-2 bg-slate-100 rounded-lg">
                            <Icon className="h-4 w-4 text-slate-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-700 truncate">
                              {item.title}
                            </p>
                            <p className="text-xs text-slate-400">
                              {meta.label}
                            </p>
                          </div>
                          <span className="text-xs text-slate-400 shrink-0">
                            {timeAgo(item.created_at)}
                          </span>
                        </div>
                      </StaggerItem>
                    );
                  })}
                </StaggerContainer>
              )}
            </CardBody>
          </Card>
        </FadeIn>
      </div>
    </PageTransition>
  );
}
