import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FolderOpen,
  ArrowUpRight,
  CalendarDays,
  FileText,
  Plus,
} from "lucide-react";
import Card, { CardBody } from "../components/ui/Card";
import Button from "../components/ui/Button";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import {
  PageTransition,
  FadeIn,
  StaggerContainer,
  StaggerItem,
} from "../components/ui/animations";

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem("token");
        if (!token) {
          setError("Not authenticated. Please login first.");
          setLoading(false);
          return;
        }

        const res = await fetch("http://localhost:8000/api/v1/projects", {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || "Failed to fetch projects.");
        }

        const data = await res.json();
        setProjects(data.projects || data || []);
      } catch (err) {
        setError(err.message || "Failed to load projects.");
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  if (loading)
    return (
      <PageTransition>
        <LoadingSpinner text="Loading your projects..." />
      </PageTransition>
    );

  return (
    <PageTransition>
      <div className="mx-auto max-w-6xl space-y-7">
        <FadeIn>
          <div className="flex flex-col gap-5 rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700">
                <FolderOpen className="h-3.5 w-3.5" />
                YOUR WORKSPACE
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Your research projects
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Keep your saved papers, proposals, and research organized.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden rounded-xl bg-slate-50 px-4 py-2 text-center sm:block">
                <span className="block text-xl font-bold text-slate-900">
                  {projects.length}
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                  Projects
                </span>
              </span>
              <Button icon={Plus} onClick={() => navigate("/research")}>
                New Research
              </Button>
            </div>
          </div>
        </FadeIn>

        {error && (
          <FadeIn>
            <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              {error}
            </div>
          </FadeIn>
        )}

        {projects.length === 0 ? (
          <FadeIn>
            <Card className="overflow-hidden">
              <CardBody className="flex flex-col items-center px-6 py-14 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-primary-100 to-violet-100 text-primary-700">
                  <FolderOpen className="h-7 w-7" />
                </div>
                <h2 className="mt-5 text-lg font-semibold text-slate-900">
                  Your research library starts here
                </h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                  Search for a topic, explore relevant papers, then save your
                  research as a project to return to it anytime.
                </p>
                <Button
                  className="mt-6"
                  icon={Plus}
                  onClick={() => navigate("/research")}
                >
                  Start your first project
                </Button>
              </CardBody>
            </Card>
          </FadeIn>
        ) : (
          <StaggerContainer className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((p) => (
              <StaggerItem key={p.id}>
                <Card
                  hover
                  className="group h-full overflow-hidden border-slate-200/70"
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    navigate(`/projects/${p.id}`, { state: { project: p } })
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      navigate(`/projects/${p.id}`, { state: { project: p } });
                    }
                  }}
                >
                  <div className="h-1 bg-gradient-to-r from-primary-500 via-indigo-500 to-violet-500 opacity-70 transition-opacity group-hover:opacity-100" />
                  <CardBody className="flex h-full flex-col p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-50 to-violet-50 text-primary-700 ring-1 ring-primary-100/70">
                        <FileText className="h-5 w-5" />
                      </div>
                      {p.project_type && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          {p.project_type}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-5 line-clamp-2 text-base font-semibold leading-6 text-slate-900 group-hover:text-primary-700">
                      {p.title || "Untitled research project"}
                    </h3>
                    <p className="mt-2 line-clamp-3 min-h-[3.75rem] text-sm leading-5 text-slate-500">
                      {p.description ||
                        "Open this project to view its research, saved papers, and generated content."}
                    </p>
                    <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4">
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {p.created_at &&
                        !Number.isNaN(new Date(p.created_at).getTime())
                          ? new Date(p.created_at).toLocaleDateString(
                              undefined,
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              },
                            )
                          : "Saved project"}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary-700">
                        Open{" "}
                        <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </CardBody>
                </Card>
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}
      </div>
    </PageTransition>
  );
}
