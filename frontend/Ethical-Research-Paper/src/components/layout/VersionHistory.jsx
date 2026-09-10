// // // // import React, { useEffect, useState } from "react";

// // // // export default function VersionHistory({
// // // //   projectId,
// // // //   newVersion,
// // // // }) {
// // // //   const [versions, setVersions] = useState([]);
// // // //   const [loading, setLoading] = useState(true);

// // // //   const fetchVersions = async () => {
// // // //     if (!projectId) {
// // // //       return;
// // // //     }

// // // //     try {
// // // //       setLoading(true);

// // // //       const token = localStorage.getItem("token");

// // // //       const res = await fetch(
// // // //         `http://localhost:8000/api/v1/projects/${projectId}/versions`,
// // // //         {
// // // //           headers: {
// // // //             Authorization: `Bearer ${token}`,
// // // //           },
// // // //         },
// // // //       );

// // // //       if (!res.ok) {
// // // //         console.error("Failed to fetch versions");
// // // //         return;
// // // //       }

// // // //       const data = await res.json();

// // // //       const sortedVersions = [...data].sort(
// // // //         (a, b) =>
// // // //           new Date(b.created_at) -
// // // //           new Date(a.created_at),
// // // //       );

// // // //       setVersions(sortedVersions);
// // // //     } catch (error) {
// // // //       console.error(
// // // //         "Failed to fetch version history:",
// // // //         error,
// // // //       );
// // // //     } finally {
// // // //       setLoading(false);
// // // //     }
// // // //   };

// // // //   // Initial load / project change
// // // //   useEffect(() => {
// // // //     fetchVersions();
// // // //   }, [projectId]);

// // // //   // Immediately add the version returned by Save
// // // //   useEffect(() => {
// // // //     if (!newVersion?.id) {
// // // //       return;
// // // //     }

// // // //     setVersions((prevVersions) => {
// // // //       // Avoid duplicate versions
// // // //       const alreadyExists = prevVersions.some(
// // // //         (version) =>
// // // //           String(version.id) ===
// // // //           String(newVersion.id),
// // // //       );

// // // //       if (alreadyExists) {
// // // //         return prevVersions;
// // // //       }

// // // //       // Put newest version at the top
// // // //       return [newVersion, ...prevVersions];
// // // //     });
// // // //   }, [newVersion]);

// // // //   if (loading) {
// // // //     return (
// // // //       <div className="mt-4">
// // // //         <h4 className="font-semibold text-lg">
// // // //           Version History 
// // // //         </h4>

// // // //         <p className="mt-2 text-sm text-slate-500">
// // // //           Loading history...
// // // //         </p>
// // // //       </div>
// // // //     );
// // // //   }

// // // //   return (
// // // //     <div className="mt-4">
// // // //       <div className="flex items-center justify-between">
// // // //         <h4 className="font-semibold text-lg">
// // // //           Version History 1
// // // //         </h4>

// // // //         <span className="text-xs text-slate-500">
// // // //           {versions.length}{" "}
// // // //           {versions.length === 1
// // // //             ? "version"
// // // //             : "versions"}
// // // //         </span>
// // // //       </div>

// // // //       {versions.length === 0 ? (
// // // //         <div className="mt-3 p-4 border rounded-lg bg-slate-50">
// // // //           <p className="text-sm text-slate-500">
// // // //             No changes have been saved yet.
// // // //           </p>
// // // //         </div>
// // // //       ) : (
// // // //         <div className="mt-3 space-y-3">
// // // //           {versions.slice(0, 3).map(
// // // //             (version, index) => {
// // // //               /*
// // // //                * Since the array is newest first:
// // // //                *
// // // //                * versions.length = total number of versions
// // // //                * index 0 = newest
// // // //                *
// // // //                * Example:
// // // //                * 3 versions:
// // // //                * newest -> Version 3
// // // //                * second -> Version 2
// // // //                * oldest -> Version 1
// // // //                */
// // // //               const versionNumber =
// // // //                 versions.length - index;

// // // //               return (
// // // //                 <div
// // // //                   key={version.id}
// // // //                   className="p-4 border rounded-lg bg-white"
// // // //                 >
// // // //                   <div className="flex items-start justify-between gap-3">
// // // //                     <div className="min-w-0">
// // // //                       <div className="flex items-center gap-2 flex-wrap">
// // // //                         <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
// // // //                           Version {versionNumber}
// // // //                         </span>

// // // //                         {index === 0 && (
// // // //                           <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
// // // //                             Latest
// // // //                           </span>
// // // //                         )}
// // // //                       </div>

// // // //                       <div className="mt-2 font-medium text-slate-800 break-words">
// // // //                         {version.commit_message}
// // // //                       </div>

// // // //                       <div className="mt-1 text-sm text-slate-600">
// // // //                         <span className="font-medium">
// // // //                           {version.user_name ||
// // // //                             version.user_email ||
// // // //                             version.user_id ||
// // // //                             "Unknown user"}
// // // //                         </span>{" "}
// // // //                         made this change
// // // //                       </div>
// // // //                     </div>
// // // //                   </div>

// // // //                   <div className="mt-2 text-xs text-slate-400">
// // // //                     {version.created_at
// // // //                       ? new Date(
// // // //                           version.created_at,
// // // //                         ).toLocaleString()
// // // //                       : "Unknown date"}
// // // //                   </div>
// // // //                 </div>
// // // //               );
// // // //             },
// // // //           )}
// // // //         </div>
// // // //       )}
// // // //     </div>
// // // //   );
// // // // }


// // // import React, { useEffect, useState } from "react";

// // // export default function VersionHistory({
// // //   projectId,
// // //   newVersion,
// // // }) {
// // //   const [versions, setVersions] = useState([]);
// // //   const [loading, setLoading] = useState(true);

// // //   const fetchVersions = async () => {
// // //     if (!projectId) {
// // //       return;
// // //     }

// // //     try {
// // //       setLoading(true);

// // //       const token = localStorage.getItem("token");

// // //       const res = await fetch(
// // //         `http://localhost:8000/api/v1/projects/${projectId}/versions`,
// // //         {
// // //           headers: {
// // //             Authorization: `Bearer ${token}`,
// // //           },
// // //         },
// // //       );

// // //       if (!res.ok) {
// // //         console.error("Failed to fetch versions");
// // //         return;
// // //       }

// // //       const data = await res.json();

// // //       const sortedVersions = [...data].sort(
// // //         (a, b) =>
// // //           new Date(b.created_at) -
// // //           new Date(a.created_at),
// // //       );

// // //       setVersions(sortedVersions);
// // //     } catch (error) {
// // //       console.error(
// // //         "Failed to fetch version history:",
// // //         error,
// // //       );
// // //     } finally {
// // //       setLoading(false);
// // //     }
// // //   };

// // //   // Initial load / project change
// // //   useEffect(() => {
// // //     fetchVersions();
// // //   }, [projectId]);

// // //   // Immediately fetch the saved version with user name/email
// // //   useEffect(() => {
// // //     if (!newVersion?.id || !projectId) {
// // //       return;
// // //     }

// // //     const addLatestVersion = async () => {
// // //       try {
// // //         const token = localStorage.getItem("token");

// // //         const res = await fetch(
// // //           `http://localhost:8000/api/v1/projects/${projectId}/versions`,
// // //           {
// // //             headers: {
// // //               Authorization: `Bearer ${token}`,
// // //             },
// // //           },
// // //         );

// // //         if (!res.ok) {
// // //           console.error("Failed to fetch latest version");
// // //           return;
// // //         }

// // //         const data = await res.json();

// // //         const latestVersion = data.find(
// // //           (version) =>
// // //             String(version.id) ===
// // //             String(newVersion.id),
// // //         );

// // //         if (!latestVersion) {
// // //           return;
// // //         }

// // //         setVersions((prevVersions) => {
// // //           // Remove the existing version if it already exists
// // //           const filteredVersions = prevVersions.filter(
// // //             (version) =>
// // //               String(version.id) !==
// // //               String(latestVersion.id),
// // //           );

// // //           // Put the latest version at the top
// // //           return [latestVersion, ...filteredVersions];
// // //         });
// // //       } catch (error) {
// // //         console.error(
// // //           "Failed to fetch latest version:",
// // //           error,
// // //         );
// // //       }
// // //     };

// // //     addLatestVersion();
// // //   }, [newVersion, projectId]);

// // //   if (loading) {
// // //     return (
// // //       <div className="mt-4">
// // //         <h4 className="font-semibold text-lg">
// // //           Version History
// // //         </h4>

// // //         <p className="mt-2 text-sm text-slate-500">
// // //           Loading history...
// // //         </p>
// // //       </div>
// // //     );
// // //   }

// // //   return (
// // //     <div className="mt-4">
// // //       <div className="flex items-center justify-between">
// // //         <h4 className="font-semibold text-lg">
// // //           Version History 1
// // //         </h4>

// // //         <span className="text-xs text-slate-500">
// // //           {versions.length}{" "}
// // //           {versions.length === 1
// // //             ? "version"
// // //             : "versions"}
// // //         </span>
// // //       </div>

// // //       {versions.length === 0 ? (
// // //         <div className="mt-3 p-4 border rounded-lg bg-slate-50">
// // //           <p className="text-sm text-slate-500">
// // //             No changes have been saved yet.
// // //           </p>
// // //         </div>
// // //       ) : (
// // //         <div className="mt-3 space-y-3">
// // //           {versions.slice(0, 3).map(
// // //             (version, index) => {
// // //               /*
// // //                * Since the array is newest first:
// // //                *
// // //                * versions.length = total number of versions
// // //                * index 0 = newest
// // //                *
// // //                * Example:
// // //                * 3 versions:
// // //                * newest -> Version 3
// // //                * second -> Version 2
// // //                * oldest -> Version 1
// // //                */
// // //               const versionNumber =
// // //                 versions.length - index;

// // //               return (
// // //                 <div
// // //                   key={version.id}
// // //                   className="p-4 border rounded-lg bg-white"
// // //                 >
// // //                   <div className="flex items-start justify-between gap-3">
// // //                     <div className="min-w-0">
// // //                       <div className="flex items-center gap-2 flex-wrap">
// // //                         <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
// // //                           Version {versionNumber}
// // //                         </span>

// // //                         {index === 0 && (
// // //                           <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
// // //                             Latest
// // //                           </span>
// // //                         )}
// // //                       </div>

// // //                       <div className="mt-2 font-medium text-slate-800 break-words">
// // //                         {version.commit_message}
// // //                       </div>

// // //                       <div className="mt-1 text-sm text-slate-600">
// // //                         <span className="font-medium">
// // //                           {version.user_name ||
// // //                             version.user_email ||
// // //                             version.user_id ||
// // //                             "Unknown user"}
// // //                         </span>{" "}
// // //                         made this change
// // //                       </div>
// // //                     </div>
// // //                   </div>

// // //                   <div className="mt-2 text-xs text-slate-400">
// // //                     {version.created_at
// // //                       ? new Date(
// // //                           version.created_at,
// // //                         ).toLocaleString()
// // //                       : "Unknown date"}
// // //                   </div>
// // //                 </div>
// // //               );
// // //             },
// // //           )}
// // //         </div>
// // //       )}
// // //     </div>
// // //   );
// // // }


// // import React, { useEffect, useState } from "react";

// // export default function VersionHistory({
// //   projectId,
// //   newVersion,
// // }) {
// //   const [versions, setVersions] = useState([]);
// //   const [loading, setLoading] = useState(true);
// //   const [showAllVersions, setShowAllVersions] = useState(false);

// //   const fetchVersions = async () => {
// //     if (!projectId) {
// //       return;
// //     }

// //     try {
// //       setLoading(true);

// //       const token = localStorage.getItem("token");

// //       const res = await fetch(
// //         `http://localhost:8000/api/v1/projects/${projectId}/versions`,
// //         {
// //           headers: {
// //             Authorization: `Bearer ${token}`,
// //           },
// //         },
// //       );

// //       if (!res.ok) {
// //         console.error("Failed to fetch versions");
// //         return;
// //       }

// //       const data = await res.json();

// //       const sortedVersions = [...data].sort(
// //         (a, b) =>
// //           new Date(b.created_at) -
// //           new Date(a.created_at),
// //       );

// //       setVersions(sortedVersions);
// //     } catch (error) {
// //       console.error(
// //         "Failed to fetch version history:",
// //         error,
// //       );
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   // Initial load / project change
// //   useEffect(() => {
// //     fetchVersions();
// //   }, [projectId]);

// //   // Immediately fetch the saved version with user name/email
// //   useEffect(() => {
// //     if (!newVersion?.id || !projectId) {
// //       return;
// //     }

// //     const addLatestVersion = async () => {
// //       try {
// //         const token = localStorage.getItem("token");

// //         const res = await fetch(
// //           `http://localhost:8000/api/v1/projects/${projectId}/versions`,
// //           {
// //             headers: {
// //               Authorization: `Bearer ${token}`,
// //             },
// //           },
// //         );

// //         if (!res.ok) {
// //           console.error("Failed to fetch latest version");
// //           return;
// //         }

// //         const data = await res.json();

// //         const latestVersion = data.find(
// //           (version) =>
// //             String(version.id) ===
// //             String(newVersion.id),
// //         );

// //         if (!latestVersion) {
// //           return;
// //         }

// //         setVersions((prevVersions) => {
// //           const filteredVersions = prevVersions.filter(
// //             (version) =>
// //               String(version.id) !==
// //               String(latestVersion.id),
// //           );

// //           return [latestVersion, ...filteredVersions];
// //         });
// //       } catch (error) {
// //         console.error(
// //           "Failed to fetch latest version:",
// //           error,
// //         );
// //       }
// //     };

// //     addLatestVersion();
// //   }, [newVersion, projectId]);

// //   if (loading) {
// //     return (
// //       <div className="mt-4">
// //         <h4 className="font-semibold text-lg">
// //           Version History
// //         </h4>

// //         <p className="mt-2 text-sm text-slate-500">
// //           Loading history...
// //         </p>
// //       </div>
// //     );
// //   }

// //   return (
// //     <>
// //       <div className="mt-4">
// //         <div className="flex items-center justify-between">
// //           <h4 className="font-semibold text-lg">
// //             Version History 1
// //           </h4>

// //           <div className="flex items-center gap-3">
// //             <span className="text-xs text-slate-500">
// //               {versions.length}{" "}
// //               {versions.length === 1
// //                 ? "version"
// //                 : "versions"}
// //             </span>

// //             {versions.length > 3 && (
// //               <button
// //                 type="button"
// //                 onClick={() =>
// //                   setShowAllVersions(true)
// //                 }
// //                 className="text-xs font-medium text-blue-600 hover:text-blue-700"
// //               >
// //                 View all
// //               </button>
// //             )}
// //           </div>
// //         </div>

// //         {versions.length === 0 ? (
// //           <div className="mt-3 p-4 border rounded-lg bg-slate-50">
// //             <p className="text-sm text-slate-500">
// //               No changes have been saved yet.
// //             </p>
// //           </div>
// //         ) : (
// //           <div className="mt-3 space-y-3">
// //             {versions.slice(0, 3).map(
// //               (version, index) => {
// //                 const versionNumber =
// //                   versions.length - index;

// //                 return (
// //                   <div
// //                     key={version.id}
// //                     className="p-4 border rounded-lg bg-white"
// //                   >
// //                     <div className="flex items-start justify-between gap-3">
// //                       <div className="min-w-0">
// //                         <div className="flex items-center gap-2 flex-wrap">
// //                           <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
// //                             Version {versionNumber}
// //                           </span>

// //                           {index === 0 && (
// //                             <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
// //                               Latest
// //                             </span>
// //                           )}
// //                         </div>

// //                         <div className="mt-2 font-medium text-slate-800 break-words">
// //                           {version.commit_message}
// //                         </div>

// //                         <div className="mt-1 text-sm text-slate-600">
// //                           <span className="font-medium">
// //                             {version.user_name ||
// //                               version.user_email ||
// //                               version.user_id ||
// //                               "Unknown user"}
// //                           </span>{" "}
// //                           made this change
// //                         </div>
// //                       </div>
// //                     </div>

// //                     <div className="mt-2 text-xs text-slate-400">
// //                       {version.created_at
// //                         ? new Date(
// //                             version.created_at,
// //                           ).toLocaleString()
// //                         : "Unknown date"}
// //                     </div>
// //                   </div>
// //                 );
// //               },
// //             )}
// //           </div>
// //         )}
// //       </div>

// //       {/* All Versions Modal */}
// //       {showAllVersions && (
// //         <div
// //           className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
// //           onClick={() =>
// //             setShowAllVersions(false)
// //           }
// //         >
// //           <div
// //             className="w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-xl bg-white shadow-xl"
// //             onClick={(e) => e.stopPropagation()}
// //           >
// //             {/* Modal Header */}
// //             <div className="flex items-center justify-between border-b px-5 py-4">
// //               <div>
// //                 <h3 className="text-lg font-semibold text-slate-800">
// //                   All Versions
// //                 </h3>

// //                 <p className="text-xs text-slate-500 mt-1">
// //                   {versions.length}{" "}
// //                   {versions.length === 1
// //                     ? "version"
// //                     : "versions"}
// //                 </p>
// //               </div>

// //               <button
// //                 type="button"
// //                 onClick={() =>
// //                   setShowAllVersions(false)
// //                 }
// //                 className="text-2xl leading-none text-slate-400 hover:text-slate-700"
// //               >
// //                 ×
// //               </button>
// //             </div>

// //             {/* Modal Content */}
// //             <div className="max-h-[65vh] overflow-y-auto p-5 space-y-3">
// //               {versions.map(
// //                 (version, index) => {
// //                   const versionNumber =
// //                     versions.length - index;

// //                   return (
// //                     <div
// //                       key={version.id}
// //                       className="p-4 border rounded-lg bg-white"
// //                     >
// //                       <div className="flex items-start justify-between gap-3">
// //                         <div className="min-w-0">
// //                           <div className="flex items-center gap-2 flex-wrap">
// //                             <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
// //                               Version {versionNumber}
// //                             </span>

// //                             {index === 0 && (
// //                               <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
// //                                 Latest
// //                               </span>
// //                             )}
// //                           </div>

// //                           <div className="mt-2 font-medium text-slate-800 break-words">
// //                             {version.commit_message}
// //                           </div>

// //                           <div className="mt-1 text-sm text-slate-600">
// //                             <span className="font-medium">
// //                               {version.user_name ||
// //                                 version.user_email ||
// //                                 version.user_id ||
// //                                 "Unknown user"}
// //                             </span>{" "}
// //                             made this change
// //                           </div>
// //                         </div>
// //                       </div>

// //                       <div className="mt-2 text-xs text-slate-400">
// //                         {version.created_at
// //                           ? new Date(
// //                               version.created_at,
// //                             ).toLocaleString()
// //                           : "Unknown date"}
// //                       </div>
// //                     </div>
// //                   );
// //                 },
// //               )}
// //             </div>

// //             {/* Modal Footer */}
// //             <div className="flex justify-end border-t px-5 py-3">
// //               <button
// //                 type="button"
// //                 onClick={() =>
// //                   setShowAllVersions(false)
// //                 }
// //                 className="px-4 py-2 text-sm font-medium text-slate-700 border rounded-lg hover:bg-slate-50"
// //               >
// //                 Close
// //               </button>
// //             </div>
// //           </div>
// //         </div>
// //       )}
// //     </>
// //   );
// // }



// import React, { useEffect, useState } from "react";

// export default function VersionHistory({
//   projectId,
//   newVersion,
// }) {
//   const [versions, setVersions] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [showAllVersions, setShowAllVersions] = useState(false);

//   const fetchVersions = async () => {
//     if (!projectId) {
//       return;
//     }

//     try {
//       setLoading(true);

//       const token = localStorage.getItem("token");

//       const res = await fetch(
//         `http://localhost:8000/api/v1/projects/${projectId}/versions`,
//         {
//           headers: {
//             Authorization: `Bearer ${token}`,
//           },
//         },
//       );

//       if (!res.ok) {
//         console.error("Failed to fetch versions");
//         return;
//       }

//       const data = await res.json();

//       const sortedVersions = [...data].sort(
//         (a, b) =>
//           new Date(b.created_at) -
//           new Date(a.created_at),
//       );

//       setVersions(sortedVersions);
//     } catch (error) {
//       console.error(
//         "Failed to fetch version history:",
//         error,
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Initial load / project change
//   useEffect(() => {
//     fetchVersions();
//   }, [projectId]);

//   // Immediately fetch the saved version with user name/email
//   useEffect(() => {
//     if (!newVersion?.id || !projectId) {
//       return;
//     }

//     const addLatestVersion = async () => {
//       try {
//         const token = localStorage.getItem("token");

//         const res = await fetch(
//           `http://localhost:8000/api/v1/projects/${projectId}/versions`,
//           {
//             headers: {
//               Authorization: `Bearer ${token}`,
//             },
//           },
//         );

//         if (!res.ok) {
//           console.error("Failed to fetch latest version");
//           return;
//         }

//         const data = await res.json();

//         const latestVersion = data.find(
//           (version) =>
//             String(version.id) ===
//             String(newVersion.id),
//         );

//         if (!latestVersion) {
//           return;
//         }

//         setVersions((prevVersions) => {
//           const filteredVersions = prevVersions.filter(
//             (version) =>
//               String(version.id) !==
//               String(latestVersion.id),
//           );

//           return [latestVersion, ...filteredVersions];
//         });
//       } catch (error) {
//         console.error(
//           "Failed to fetch latest version:",
//           error,
//         );
//       }
//     };

//     addLatestVersion();
//   }, [newVersion, projectId]);

//   if (loading) {
//     return (
//       <div className="mt-4">
//         <h4 className="font-semibold text-lg">
//           Version History
//         </h4>

//         <p className="mt-2 text-sm text-slate-500">
//           Loading history...
//         </p>
//       </div>
//     );
//   }

//   return (
//     <>
//       {/* Version History */}
//       <div className="mt-4">
//         <div className="flex items-center justify-between">
//           <h4 className="font-semibold text-lg">
//             Version History 1
//           </h4>

//           <div className="flex items-center gap-3">
//             <span className="text-xs text-slate-500">
//               {versions.length}{" "}
//               {versions.length === 1
//                 ? "version"
//                 : "versions"}
//             </span>

//             {versions.length > 3 && (
//               <button
//                 type="button"
//                 onClick={() =>
//                   setShowAllVersions(true)
//                 }
//                 className="text-xs font-medium text-blue-600 hover:text-blue-700"
//               >
//                 View all
//               </button>
//             )}
//           </div>
//         </div>

//         {versions.length === 0 ? (
//           <div className="mt-3 p-4 border rounded-lg bg-slate-50">
//             <p className="text-sm text-slate-500">
//               No changes have been saved yet.
//             </p>
//           </div>
//         ) : (
//           <div className="mt-3 space-y-3">
//             {versions.slice(0, 3).map(
//               (version, index) => {
//                 const versionNumber =
//                   versions.length - index;

//                 return (
//                   <div
//                     key={version.id}
//                     className="p-4 border rounded-lg bg-white"
//                   >
//                     <div className="flex items-start justify-between gap-3">
//                       <div className="min-w-0">
//                         <div className="flex items-center gap-2 flex-wrap">
//                           <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
//                             Version {versionNumber}
//                           </span>

//                           {index === 0 && (
//                             <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
//                               Latest
//                             </span>
//                           )}
//                         </div>

//                         <div className="mt-2 font-medium text-slate-800 break-words">
//                           {version.commit_message}
//                         </div>

//                         <div className="mt-1 text-sm text-slate-600">
//                           <span className="font-medium">
//                             {version.user_name ||
//                               version.user_email ||
//                               version.user_id ||
//                               "Unknown user"}
//                           </span>{" "}
//                           made this change
//                         </div>
//                       </div>
//                     </div>

//                     <div className="mt-2 text-xs text-slate-400">
//                       {version.created_at
//                         ? new Date(
//                             version.created_at,
//                           ).toLocaleString()
//                         : "Unknown date"}
//                     </div>
//                   </div>
//                 );
//               },
//             )}
//           </div>
//         )}
//       </div>

//       {/* All Versions Modal */}
//       {showAllVersions && (
//         <div
//           className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
//           onClick={() =>
//             setShowAllVersions(false)
//           }
//         >
//           <div
//             className="w-full max-w-2xl max-h-[70vh] rounded-xl bg-white shadow-2xl flex flex-col"
//             onClick={(e) => e.stopPropagation()}
//           >
//             {/* Modal Header */}
//             <div className="flex items-center justify-between border-b px-5 py-4 shrink-0">
//               <div>
//                 <h3 className="text-lg font-semibold text-slate-800">
//                   All Versions
//                 </h3>

//                 <p className="mt-1 text-xs text-slate-500">
//                   {versions.length}{" "}
//                   {versions.length === 1
//                     ? "version"
//                     : "versions"}
//                 </p>
//               </div>

//               <button
//                 type="button"
//                 onClick={() =>
//                   setShowAllVersions(false)
//                 }
//                 className="flex h-8 w-8 items-center justify-center rounded-full text-2xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700"
//               >
//                 ×
//               </button>
//             </div>

//             {/* Scrollable Versions */}
//             <div className="min-h-0 flex-1 overflow-y-auto p-5">
//               <div className="space-y-3">
//                 {versions.map(
//                   (version, index) => {
//                     const versionNumber =
//                       versions.length - index;

//                     return (
//                       <div
//                         key={version.id}
//                         className="p-4 border rounded-lg bg-white"
//                       >
//                         <div className="flex items-start justify-between gap-3">
//                           <div className="min-w-0">
//                             <div className="flex items-center gap-2 flex-wrap">
//                               <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
//                                 Version {versionNumber}
//                               </span>

//                               {index === 0 && (
//                                 <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
//                                   Latest
//                                 </span>
//                               )}
//                             </div>

//                             <div className="mt-2 font-medium text-slate-800 break-words">
//                               {version.commit_message}
//                             </div>

//                             <div className="mt-1 text-sm text-slate-600">
//                               <span className="font-medium">
//                                 {version.user_name ||
//                                   version.user_email ||
//                                   version.user_id ||
//                                   "Unknown user"}
//                               </span>{" "}
//                               made this change
//                             </div>
//                           </div>
//                         </div>

//                         <div className="mt-2 text-xs text-slate-400">
//                           {version.created_at
//                             ? new Date(
//                                 version.created_at,
//                               ).toLocaleString()
//                             : "Unknown date"}
//                         </div>
//                       </div>
//                     );
//                   },
//                 )}
//               </div>
//             </div>

//             {/* Modal Footer */}
//             <div className="flex justify-end border-t px-5 py-3 shrink-0">
//               <button
//                 type="button"
//                 onClick={() =>
//                   setShowAllVersions(false)
//                 }
//                 className="px-4 py-2 text-sm font-medium text-slate-700 border rounded-lg hover:bg-slate-50"
//               >
//                 Close
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </>
//   );
// }


import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function VersionHistory({
  projectId,
  newVersion,
}) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

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

  // Initial load / project change
  useEffect(() => {
    fetchVersions();
  }, [projectId]);

  // Immediately fetch the saved version with user name/email
  useEffect(() => {
    if (!newVersion?.id || !projectId) {
      return;
    }

    const addLatestVersion = async () => {
      try {
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
          console.error(
            "Failed to fetch latest version",
          );
          return;
        }

        const data = await res.json();

        const latestVersion = data.find(
          (version) =>
            String(version.id) ===
            String(newVersion.id),
        );

        if (!latestVersion) {
          return;
        }

        setVersions((prevVersions) => {
          const filteredVersions =
            prevVersions.filter(
              (version) =>
                String(version.id) !==
                String(latestVersion.id),
            );

          return [
            latestVersion,
            ...filteredVersions,
          ];
        });
      } catch (error) {
        console.error(
          "Failed to fetch latest version:",
          error,
        );
      }
    };

    addLatestVersion();
  }, [newVersion, projectId]);

  if (loading) {
    return (
      <div className="mt-4">
        <h4 className="text-lg font-semibold">
          Version History
        </h4>

        <p className="mt-2 text-sm text-slate-500">
          Loading history...
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold">
          Version History
        </h4>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            {versions.length}{" "}
            {versions.length === 1
              ? "version"
              : "versions"}
          </span>

          {versions.length > 3 && (
            <button
              type="button"
              onClick={() =>
                navigate(
                  `/projects/${projectId}/versions`,
                )
              }
              className="
                text-xs
                font-medium
                text-blue-600
                hover:text-blue-700
              "
            >
              View all
            </button>
          )}
        </div>
      </div>

      {/* No versions */}
      {versions.length === 0 ? (
        <div className="mt-3 rounded-lg border bg-slate-50 p-4">
          <p className="text-sm text-slate-500">
            No changes have been saved yet.
          </p>
        </div>
      ) : (
        /* Latest 3 versions */
        <div className="mt-3 space-y-3">
          {versions.slice(0, 3).map(
            (version, index) => {
              const versionNumber =
                versions.length - index;

              return (
                <div
                  key={version.id}
                  className="
                    rounded-lg
                    border
                    bg-white
                    p-4
                  "
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {/* Version badge */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="
                            inline-flex
                            items-center
                            rounded-full
                            bg-blue-100
                            px-2
                            py-1
                            text-xs
                            font-semibold
                            text-blue-700
                          "
                        >
                          Version {versionNumber}
                        </span>

                        {/* Latest */}
                        {index === 0 && (
                          <span
                            className="
                              inline-flex
                              items-center
                              rounded-full
                              bg-green-100
                              px-2
                              py-1
                              text-xs
                              font-medium
                              text-green-700
                            "
                          >
                            Latest
                          </span>
                        )}
                      </div>

                      {/* Commit message */}
                      <div
                        className="
                          mt-2
                          break-words
                          font-medium
                          text-slate-800
                        "
                      >
                        {version.commit_message}
                      </div>

                      {/* User */}
                      <div
                        className="
                          mt-1
                          text-sm
                          text-slate-600
                        "
                      >
                        <span className="font-medium">
                          {version.user_name ||
                            version.user_email ||
                            version.user_id ||
                            "Unknown user"}
                        </span>{" "}
                        made this change
                      </div>
                    </div>
                  </div>

                  {/* Date */}
                  <div className="mt-2 text-xs text-slate-400">
                    {version.created_at
                      ? new Date(
                          version.created_at,
                        ).toLocaleString()
                      : "Unknown date"}
                  </div>
                </div>
              );
            },
          )}
        </div>
      )}
    </div>
  );
}