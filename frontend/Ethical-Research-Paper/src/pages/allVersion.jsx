
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export default function AllVersions() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVersions = async () => {
      if (!projectId) {
        return;
      }

      try {
        setLoading(true);

        const token = localStorage.getItem("token");

        const res = await fetch(
          `http://localhost:8000/api/v1/projects/${projectId}/versions`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!res.ok) {
          console.error("Failed to fetch versions");
          return;
        }

        const data = await res.json();

        const sortedVersions = [...data].sort(
          (a, b) =>
            new Date(b.created_at) -
            new Date(a.created_at),
        );

        setVersions(sortedVersions);
      } catch (error) {
        console.error(
          "Failed to fetch version history:",
          error,
        );
      } finally {
        setLoading(false);
      }
    };

    fetchVersions();
  }, [projectId]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* =====================================================
          TOP HEADER
          ===================================================== */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex h-16 items-center justify-between">
            {/* Left */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-lg
                  border
                  border-slate-200
                  bg-white
                  text-slate-500
                  transition
                  hover:border-slate-300
                  hover:bg-slate-50
                  hover:text-slate-700
                "
                aria-label="Go back"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19 12H5" />
                  <path d="M12 19l-7-7 7-7" />
                </svg>
              </button>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-semibold text-slate-900">
                    Version History
                  </h1>
                </div>

                <p className="text-xs text-slate-500">
                  Complete project change history
                </p>
              </div>
            </div>

            {/* Right */}
            {!loading && (
              <div
                className="
                  hidden
                  rounded-full
                  border
                  border-slate-200
                  bg-slate-50
                  px-3
                  py-1.5
                  text-xs
                  font-medium
                  text-slate-600
                  sm:block
                "
              >
                {versions.length}{" "}
                {versions.length === 1
                  ? "version"
                  : "versions"}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* =====================================================
          MAIN CONTENT
          ===================================================== */}
      <main className="mx-auto max-w-5xl px-6 py-8">
        {/* Page Intro */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <div
                  className="
                    flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-lg
                    bg-blue-50
                    text-blue-600
                  "
                >
                  <svg
                    width="19"
                    height="19"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.7 2.7L3 8" />
                    <path d="M3 3v5h5" />
                    <path d="M12 7v5l3 2" />
                  </svg>
                </div>

                <span className="text-sm font-medium text-blue-600">
                  Project Activity
                </span>
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                All Versions
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                View the complete history of changes made to
                this project, including who made each change
                and when it happened.
              </p>
            </div>
          </div>
        </div>

        {/* =================================================
            SUMMARY CARDS
            ================================================= */}
        {!loading && versions.length > 0 && (
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Total Versions */}
            <div
              className="
                rounded-xl
                border
                border-slate-200
                bg-white
                p-5
                shadow-sm
              "
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Total Versions
                  </p>

                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {versions.length}
                  </p>
                </div>

                <div
                  className="
                    flex
                    h-10
                    w-10
                    items-center
                    justify-center
                    rounded-lg
                    bg-blue-50
                    text-blue-600
                  "
                >
                  <svg
                    width="19"
                    height="19"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M4 6h16" />
                    <path d="M4 12h16" />
                    <path d="M4 18h10" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Latest Version */}
            <div
              className="
                rounded-xl
                border
                border-slate-200
                bg-white
                p-5
                shadow-sm
              "
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Latest Version
                  </p>

                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    v{versions.length}
                  </p>
                </div>

                <div
                  className="
                    flex
                    h-10
                    w-10
                    items-center
                    justify-center
                    rounded-lg
                    bg-emerald-50
                    text-emerald-600
                  "
                >
                  <svg
                    width="19"
                    height="19"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M5 12l4 4L19 6" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Latest Activity */}
            <div
              className="
                rounded-xl
                border
                border-slate-200
                bg-white
                p-5
                shadow-sm
              "
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Latest Activity
                  </p>

                  <p className="mt-2 truncate text-sm font-semibold text-slate-800">
                    {versions[0]?.created_at
                      ? new Date(
                          versions[0].created_at,
                        ).toLocaleDateString()
                      : "—"}
                  </p>
                </div>

                <div
                  className="
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-lg
                    bg-violet-50
                    text-violet-600
                  "
                >
                  <svg
                    width="19"
                    height="19"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================
            LOADING
            ================================================= */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="
                  animate-pulse
                  rounded-xl
                  border
                  border-slate-200
                  bg-white
                  p-5
                "
              >
                <div className="flex gap-4">
                  <div className="h-10 w-10 rounded-full bg-slate-200" />

                  <div className="flex-1">
                    <div className="h-4 w-24 rounded bg-slate-200" />
                    <div className="mt-3 h-4 w-3/4 rounded bg-slate-200" />
                    <div className="mt-2 h-3 w-1/3 rounded bg-slate-200" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* =================================================
            EMPTY STATE
            ================================================= */}
        {!loading && versions.length === 0 && (
          <div
            className="
              rounded-2xl
              border
              border-dashed
              border-slate-300
              bg-white
              px-6
              py-16
              text-center
            "
          >
            <div
              className="
                mx-auto
                flex
                h-14
                w-14
                items-center
                justify-center
                rounded-full
                bg-slate-100
                text-slate-500
              "
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M3 12a9 9 0 1 0 9-9" />
                <path d="M3 4v6h6" />
                <path d="M12 7v5l3 2" />
              </svg>
            </div>

            <h3 className="mt-4 text-base font-semibold text-slate-800">
              No versions yet
            </h3>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
              Changes saved to this project will appear here
              as version history.
            </p>

            <button
              type="button"
              onClick={() => navigate(-1)}
              className="
                mt-6
                rounded-lg
                bg-slate-900
                px-4
                py-2
                text-sm
                font-medium
                text-white
                transition
                hover:bg-slate-800
              "
            >
              Back to Project
            </button>
          </div>
        )}

        {/* =================================================
            VERSION HISTORY
            ================================================= */}
        {!loading && versions.length > 0 && (
          <section>
            {/* Section Header */}
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Change History
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Newest changes appear first
                </p>
              </div>
            </div>

            {/* Timeline */}
            <div className="relative">
              {/* Timeline Line */}
              <div
                className="
                  absolute
                  bottom-6
                  left-[19px]
                  top-6
                  hidden
                  w-px
                  bg-slate-200
                  sm:block
                "
              />

              <div className="space-y-4">
                {versions.map((version, index) => {
                  const versionNumber =
                    versions.length - index;

                  const userName =
                    version.user_name ||
                    version.user_email ||
                    version.user_id ||
                    "Unknown user";

                  return (
                    <div
                      key={version.id}
                      className="relative sm:pl-12"
                    >
                      {/* Timeline Dot */}
                      <div
                        className={`
                          absolute
                          left-0
                          top-5
                          hidden
                          h-10
                          w-10
                          items-center
                          justify-center
                          rounded-full
                          border-4
                          border-slate-50
                          sm:flex
                          ${
                            index === 0
                              ? "bg-blue-600 text-white"
                              : "bg-white text-slate-400 border-slate-100"
                          }
                        `}
                      >
                        {index === 0 ? (
                          <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <path d="M5 12l4 4L19 6" />
                          </svg>
                        ) : (
                          <span className="h-2 w-2 rounded-full bg-current" />
                        )}
                      </div>

                      {/* Version Card */}
                      <div
                        className="
                          group
                          rounded-xl
                          border
                          border-slate-200
                          bg-white
                          p-5
                          shadow-sm
                          transition
                          hover:border-slate-300
                          hover:shadow-md
                        "
                      >
                        {/* Card Top */}
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            {/* Badges */}
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className="
                                  inline-flex
                                  items-center
                                  rounded-md
                                  bg-blue-50
                                  px-2.5
                                  py-1
                                  text-xs
                                  font-semibold
                                  text-blue-700
                                "
                              >
                                v{versionNumber}
                              </span>

                              {index === 0 && (
                                <span
                                  className="
                                    inline-flex
                                    items-center
                                    gap-1.5
                                    rounded-md
                                    bg-emerald-50
                                    px-2.5
                                    py-1
                                    text-xs
                                    font-medium
                                    text-emerald-700
                                  "
                                >
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                  Latest
                                </span>
                              )}
                            </div>

                            {/* Commit Message */}
                            <h4
                              className="
                                mt-3
                                break-words
                                text-[15px]
                                font-semibold
                                leading-6
                                text-slate-800
                              "
                            >
                              {version.commit_message ||
                                "Updated project"}
                            </h4>
                          </div>

                          {/* Date */}
                          <div className="shrink-0 text-left sm:text-right">
                            <p className="text-xs font-medium text-slate-500">
                              {version.created_at
                                ? new Date(
                                    version.created_at,
                                  ).toLocaleDateString(
                                    undefined,
                                    {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    },
                                  )
                                : "Unknown date"}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              {version.created_at
                                ? new Date(
                                    version.created_at,
                                  ).toLocaleTimeString(
                                    undefined,
                                    {
                                      hour: "numeric",
                                      minute: "2-digit",
                                    },
                                  )
                                : ""}
                            </p>
                          </div>
                        </div>

                        {/* Divider */}
                        <div className="my-4 border-t border-slate-100" />

                        {/* User Information */}
                        <div className="flex items-center gap-3">
                          {/* Avatar */}
                          <div
                            className="
                              flex
                              h-9
                              w-9
                              shrink-0
                              items-center
                              justify-center
                              rounded-full
                              bg-slate-100
                              text-xs
                              font-semibold
                              uppercase
                              text-slate-600
                            "
                          >
                            {userName
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div className="min-w-0">
                            <p className="text-sm text-slate-600">
                              <span className="font-semibold text-slate-800">
                                {userName}
                              </span>{" "}
                              made this change
                            </p>

                            {version.user_email && (
                              <p className="mt-0.5 truncate text-xs text-slate-400">
                                {version.user_email}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}