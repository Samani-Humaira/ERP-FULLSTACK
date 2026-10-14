// import React, { useState, useEffect } from "react";

// export default function TeamPanel({
//   projectId,
//   members = [],
//   onAddMember,
//   client,
//   user,
// }) {
//   const [email, setEmail] = useState("");
//   const [invites, setInvites] = useState([]);
//   const [message, setMessage] = useState("");
//   const [notificationsOpen, setNotificationsOpen] = useState(false);
//   const [notifications, setNotifications] = useState([]);

//   useEffect(() => {
//     const fetchInvites = async () => {
//       const token = localStorage.getItem("token");
//       const res = await fetch(
//         `http://localhost:8000/api/v1/projects/${projectId}/invites`,
//         {
//           headers: { Authorization: `Bearer ${token}` },
//         },
//       );
//       if (res.ok) setInvites(await res.json());
//     };
//     fetchInvites();
//     const fetchNotifications = async () => {
//       const token = localStorage.getItem("token");
//       if (!token) return;
//       try {
//         const r = await fetch(
//           "http://localhost:8000/api/v1/users/me/notifications",
//           { headers: { Authorization: `Bearer ${token}` } },
//         );
//         if (r.ok) setNotifications(await r.json());
//       } catch (e) {}
//     };
//     fetchNotifications();
//   }, [projectId]);

//   const addMember = async () => {
//     if (!email.trim()) return;
//     // If the input looks like an email address, send an invite email instead of directly adding
//     const token = localStorage.getItem("token");
//     if (email.includes("@")) {
//       const res = await fetch(
//         `http://localhost:8000/api/v1/projects/${projectId}/invite`,
//         {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//             Authorization: `Bearer ${token}`,
//           },
//           body: JSON.stringify({ emails: [email], role: "editor" }),
//         },
//       );
//       if (res.ok) {
//         setMessage("Invite sent");
//         setTimeout(() => setMessage(""), 3000);
//         const body = await res.json();
//         // If backend returned invite links, add them to the local invites list immediately
//         try {
//           if (body?.sent && Array.isArray(body.sent)) {
//             const newInvites = body.sent.map((s) => {
//               const link = s.link;
//               let tokenVal = null;
//               try {
//                 tokenVal = link
//                   ? new URL(link).searchParams.get("invite_token")
//                   : null;
//               } catch (e) {
//                 tokenVal = null;
//               }
//               return {
//                 id:
//                   s.invite_id ||
//                   (tokenVal ? tokenVal.slice(0, 8) : `${Date.now()}`),
//                 project_id: projectId,
//                 email: s.email,
//                 role: s.role,
//                 token: tokenVal,
//                 created_by: null,
//                 created_at: new Date().toISOString(),
//                 accepted: false,
//                 accepted_at: null,
//                 link: s.link,
//               };
//             });
//             setInvites((prev) => [...newInvites, ...prev]);
//           }
//         } catch (e) {
//           // fallback: refresh invites from server
//           const invRes = await fetch(
//             `http://localhost:8000/api/v1/projects/${projectId}/invites`,
//             { headers: { Authorization: `Bearer ${token}` } },
//           );
//           if (invRes.ok) setInvites(await invRes.json());
//         }
//         setEmail("");
//       }
//     } else if (onAddMember) {
//       await onAddMember({
//         user_id: email,
//         email,
//         full_name: email,
//         role: "viewer",
//       });
//       setEmail("");
//     } else {
//       const res = await fetch(
//         `http://localhost:8000/api/v1/projects/${projectId}/members`,
//         {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//             Authorization: `Bearer ${token}`,
//           },
//           body: JSON.stringify({
//             user_id: email,
//             email,
//             full_name: email,
//             role: "viewer",
//           }),
//         },
//       );
//       if (res.ok) {
//         const created = await res.json();
//         client?.send({ type: "member_added", payload: created });
//         setEmail("");
//       }
//     }
//   };

//   const revoke = async (inviteId) => {
//     const token = localStorage.getItem("token");
//     const res = await fetch(
//       `http://localhost:8000/api/v1/projects/${projectId}/invites/${inviteId}`,
//       {
//         method: "DELETE",
//         headers: { Authorization: `Bearer ${token}` },
//       },
//     );
//     if (res.ok) {
//       setInvites((i) => i.filter((x) => x.id !== inviteId));
//       setMessage("Invite revoked");
//       setTimeout(() => setMessage(""), 3000);
//     }
//   };

//   return (
//     <div className="mt-4">
//       <div className="flex items-center justify-between">
//         <h4 className="font-semibold">Team</h4>
//         <button
//           onClick={() => setNotificationsOpen((s) => !s)}
//           className="text-sm text-blue-600 underline"
//         >
//           Notifications
//         </button>
//       </div>
//       {notificationsOpen && (
//         <div className="mt-2 p-2 border rounded bg-white text-sm">
//           <h5 className="font-semibold">Notifications</h5>
//           {notifications.filter(
//             (n) => n.type === "invite" && n.payload?.project_id === projectId,
//           ).length === 0 && (
//             <div className="text-xs text-slate-500">
//               No notifications for this project.
//             </div>
//           )}
//           <ul className="mt-2 space-y-2">
//             {notifications
//               .filter(
//                 (n) =>
//                   n.type === "invite" && n.payload?.project_id === projectId,
//               )
//               .map((n) => (
//                 <li key={n.id} className="p-2 border rounded">
//                   <div className="text-sm">
//                     Invite to join project • {n.payload?.role}
//                   </div>
//                   <div className="mt-2 space-x-2">
//                     <button
//                       onClick={async () => {
//                         const token = localStorage.getItem("token");
//                         const res = await fetch(
//                           `http://localhost:8000/api/v1/projects/${projectId}/invites/${n.payload?.invite_id}/respond`,
//                           {
//                             method: "POST",
//                             headers: {
//                               "Content-Type": "application/json",
//                               Authorization: `Bearer ${token}`,
//                             },
//                             body: JSON.stringify({ action: "accept" }),
//                           },
//                         );
//                         if (res.ok) {
//                           setMessage("Invite accepted");
//                           setTimeout(() => setMessage(""), 2000);
//                           setNotifications((prev) =>
//                             prev.filter((x) => x.id !== n.id),
//                           );
//                           // refresh members if possible
//                           try {
//                             const memRes = await fetch(
//                               `http://localhost:8000/api/v1/projects/${projectId}/members`,
//                               { headers: { Authorization: `Bearer ${token}` } },
//                             );
//                             if (memRes.ok) {
//                               const m =
//                                 await memRes.json(); /* optional: update parent via ws */
//                             }
//                           } catch (e) {}
//                         }
//                       }}
//                       className="px-2 py-1 bg-green-600 text-white rounded text-xs"
//                     >
//                       Accept
//                     </button>
//                     <button
//                       onClick={async () => {
//                         const token = localStorage.getItem("token");
//                         const res = await fetch(
//                           `http://localhost:8000/api/v1/projects/${projectId}/invites/${n.payload?.invite_id}/respond`,
//                           {
//                             method: "POST",
//                             headers: {
//                               "Content-Type": "application/json",
//                               Authorization: `Bearer ${token}`,
//                             },
//                             body: JSON.stringify({ action: "reject" }),
//                           },
//                         );
//                         if (res.ok) {
//                           setMessage("Invite rejected");
//                           setTimeout(() => setMessage(""), 2000);
//                           setNotifications((prev) =>
//                             prev.filter((x) => x.id !== n.id),
//                           );
//                         }
//                       }}
//                       className="px-2 py-1 bg-red-500 text-white rounded text-xs"
//                     >
//                       Reject
//                     </button>
//                   </div>
//                 </li>
//               ))}
//           </ul>
//         </div>
//       )}
//       <ul className="mt-2 space-y-2">
//         {members.map((m) => (
//           <li key={m.user_id} className="p-2 border rounded bg-white text-sm">
//             {m.email || m.user_id} • {m.role}
//           </li>
//         ))}
//       </ul>
//       <div className="mt-2 flex gap-2">
//         <input
//           value={email}
//           onChange={(e) => setEmail(e.target.value)}
//           className="flex-1 p-2 border rounded"
//           placeholder="user email or id"
//         />
//         <button
//           onClick={addMember}
//           className="px-3 py-2 bg-slate-800 text-white rounded"
//         >
//           Add
//         </button>
//       </div>
//       {message && <div className="mt-2 text-sm text-green-600">{message}</div>}
//       {invites.length > 0 && (
//         <div className="mt-3">
//           <h5 className="font-semibold">Pending Invites</h5>
//           <ul className="mt-2 space-y-2">
//             {invites.map((inv) => (
//               <li key={inv.id} className="p-2 border rounded bg-white text-sm">
//                 <div className="flex justify-between items-center">
//                   <div>
//                     <div>
//                       {inv.email} • {inv.role}{" "}
//                       {inv.accepted ? "(accepted)" : ""}
//                     </div>
//                     {inv.token && !inv.accepted && (
//                       <div className="mt-1 text-xs text-slate-600">
//                         <span className="mr-2">Invite link:</span>
//                         <a
//                           href={`${window.location.origin}/projects/${projectId}?invite_token=${inv.token}`}
//                           target="_blank"
//                           rel="noreferrer"
//                           className="underline text-blue-600"
//                         >
//                           Open
//                         </a>
//                         <button
//                           onClick={() => {
//                             navigator.clipboard.writeText(
//                               `${window.location.origin}/projects/${projectId}?invite_token=${inv.token}`,
//                             );
//                             setMessage("Link copied");
//                             setTimeout(() => setMessage(""), 2000);
//                           }}
//                           className="ml-2 px-2 py-0.5 text-xs bg-slate-200 rounded"
//                         >
//                           Copy
//                         </button>
//                       </div>
//                     )}
//                   </div>
//                   <div>
//                     {!inv.accepted && (
//                       <button
//                         onClick={() => revoke(inv.id)}
//                         className="px-2 py-1 text-sm bg-red-500 text-white rounded"
//                       >
//                         Revoke
//                       </button>
//                     )}
//                   </div>
//                 </div>
//               </li>
//             ))}
//           </ul>
//         </div>
//       )}
//     </div>
//   );
// }

import React, { useState, useEffect } from "react";

export default function TeamPanel({
  projectId,
  members = [],
  onAddMember,
  onRemoveMember,
  ownerId,
  client,
  user,
}) {
  const [email, setEmail] = useState("");
  const [invites, setInvites] = useState([]);
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const isProjectOwner = String(user?.id || "") === String(ownerId || "");

  useEffect(() => {
    const fetchInvites = async () => {
      const token = localStorage.getItem("token");

      if (!token) return;

      try {
        const res = await fetch(
          `http://localhost:8000/api/v1/projects/${projectId}/invites`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (res.ok) {
          const data = await res.json();
          setInvites(data);
        }
      } catch (error) {
        console.error("Failed to fetch invites:", error);
      }
    };

    const fetchNotifications = async () => {
      const token = localStorage.getItem("token");

      if (!token) return;

      try {
        const res = await fetch(
          "http://localhost:8000/api/v1/users/me/notifications",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (res.ok) {
          setNotifications(await res.json());
        }
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      }
    };

    fetchInvites();
    fetchNotifications();
  }, [projectId]);

  const showMessage = (text, duration = 3000, isError = false) => {
    setMessage(text);
    setMessageIsError(isError);

    setTimeout(() => {
      setMessage("");
    }, duration);
  };

  const addMember = async () => {
    if (!email.trim()) return;

    const token = localStorage.getItem("token");

    if (!token) {
      showMessage("You must be logged in.");
      return;
    }

    // Email address → send invitation
    if (email.includes("@")) {
      try {
        const res = await fetch(
          `http://localhost:8000/api/v1/projects/${projectId}/invite`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              emails: [email],
              role: "editor",
            }),
          },
        );

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.detail || "Failed to send invitation.");
        }

        const body = await res.json();

        // Keep only invitations that were successfully persisted by the API.
        if (Array.isArray(body?.sent)) {
          const newInvites = body.sent
            .filter((invite) => invite.invite_id)
            .map((s) => {
              const link = s.link;

              let tokenVal = null;

              try {
                tokenVal = link
                  ? new URL(link).searchParams.get("invite_token")
                  : null;
              } catch (error) {
                tokenVal = null;
              }

              return {
                id: String(s.invite_id),

                project_id: projectId,
                email: s.email,
                role: s.role || "editor",
                token: tokenVal,
                created_by: null,
                created_at: new Date().toISOString(),

                // New invite is pending
                accepted: false,
                accepted_at: null,

                link: s.link,
              };
            });

          setInvites((prev) => [...newInvites, ...prev]);

          const failed = body.sent.find((invite) => !invite.sent);
          if (failed) {
            showMessage(
              failed.error ||
                "Invitation saved, but email delivery failed. Check the SMTP configuration.",
              6000,
              true,
            );
          } else if (newInvites.length) {
            showMessage("Invitation sent successfully.");
          } else {
            showMessage("Invitation could not be saved.", 6000);
          }
        } else {
          // Reload invitations if the server response has no per-address results.
          const invRes = await fetch(
            `http://localhost:8000/api/v1/projects/${projectId}/invites`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );

          if (invRes.ok) {
            setInvites(await invRes.json());
          }
          showMessage(
            "Invitation request completed; refresh to verify its status.",
            6000,
          );
        }

        setEmail("");
      } catch (error) {
        console.error("Failed to send invite:", error);
        showMessage(error.message || "Failed to send invite.", 5000, true);
      }

      return;
    }

    // Non-email → add existing member
    if (onAddMember) {
      await onAddMember({
        user_id: email,
        email,
        full_name: email,
        role: "viewer",
      });

      setEmail("");
      return;
    }

    // Fallback direct member creation
    try {
      const res = await fetch(
        `http://localhost:8000/api/v1/projects/${projectId}/members`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            user_id: email,
            email,
            full_name: email,
            role: "viewer",
          }),
        },
      );

      if (!res.ok) {
        throw new Error("Failed to add member.");
      }

      const created = await res.json();

      client?.send({
        type: "member_added",
        payload: created,
      });

      setEmail("");
    } catch (error) {
      console.error("Failed to add member:", error);
      showMessage(error.message || "Failed to add member.");
    }
  };

  const revoke = async (inviteId) => {
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(
        `http://localhost:8000/api/v1/projects/${projectId}/invites/${inviteId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.detail || `Failed to revoke invite (HTTP ${res.status}).`,
        );
      }

      // Remove from local state immediately
      setInvites((prev) => prev.filter((invite) => invite.id !== inviteId));

      showMessage("Invite revoked");
    } catch (error) {
      console.error("Failed to revoke invite:", error);
      showMessage(error.message || "Failed to revoke invite.", 5000, true);
    }
  };

  const removeMember = async (member) => {
    if (!isProjectOwner || !member?.user_id) return;
    const memberName = member.full_name || member.email || "this collaborator";
    if (!window.confirm(`Remove ${memberName} from this project?`)) return;

    const token = localStorage.getItem("token");
    try {
      const res = await fetch(
        `http://localhost:8000/api/v1/projects/${projectId}/members/${member.user_id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.detail ||
            `Failed to remove collaborator (HTTP ${res.status}).`,
        );
      }

      onRemoveMember?.(member.user_id);
      showMessage(`${memberName} was removed from the project.`);
    } catch (error) {
      console.error("Failed to remove collaborator:", error);
      showMessage(
        error.message || "Failed to remove collaborator.",
        5000,
        true,
      );
    }
  };

  const acceptInvite = async (notification) => {
    const token = localStorage.getItem("token");

    const inviteId = notification.payload?.invite_id;

    if (!inviteId) {
      showMessage("Invalid invitation.");
      return;
    }

    try {
      const res = await fetch(
        `http://localhost:8000/api/v1/projects/${projectId}/invites/${inviteId}/respond`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            action: "accept",
          }),
        },
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));

        throw new Error(errorData.detail || "Failed to accept invitation.");
      }

      /*
       * IMPORTANT:
       * Immediately update the invite locally.
       *
       * This makes accepted === true.
       * Because Pending Invites filters accepted invites out,
       * the invite will disappear immediately without refresh.
       */
      setInvites((prev) =>
        prev.map((invite) =>
          String(invite.id) === String(inviteId)
            ? {
                ...invite,
                accepted: true,
                accepted_at: new Date().toISOString(),
              }
            : invite,
        ),
      );

      // Remove notification immediately
      setNotifications((prev) =>
        prev.filter(
          (notificationItem) => notificationItem.id !== notification.id,
        ),
      );

      showMessage("Invite accepted", 2000);

      // Refresh members
      try {
        const memRes = await fetch(
          `http://localhost:8000/api/v1/projects/${projectId}/members`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (memRes.ok) {
          const updatedMembers = await memRes.json();

          /*
           * If the parent controls members, ideally the parent should
           * refresh its members state here.
           *
           * We don't directly modify the members prop because props
           * are controlled by the parent.
           */
          console.log("Updated members:", updatedMembers);
        }
      } catch (error) {
        console.error("Failed to refresh members:", error);
      }
    } catch (error) {
      console.error("Failed to accept invite:", error);
      showMessage(error.message || "Failed to accept invitation.");
    }
  };

  const rejectInvite = async (notification) => {
    const token = localStorage.getItem("token");

    const inviteId = notification.payload?.invite_id;

    if (!inviteId) {
      showMessage("Invalid invitation.");
      return;
    }

    try {
      const res = await fetch(
        `http://localhost:8000/api/v1/projects/${projectId}/invites/${inviteId}/respond`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            action: "reject",
          }),
        },
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));

        throw new Error(errorData.detail || "Failed to reject invitation.");
      }

      // Remove notification
      setNotifications((prev) =>
        prev.filter(
          (notificationItem) => notificationItem.id !== notification.id,
        ),
      );

      // If this invite exists locally, remove it from pending invites
      setInvites((prev) =>
        prev.filter((invite) => String(invite.id) !== String(inviteId)),
      );

      showMessage("Invite rejected", 2000);
    } catch (error) {
      console.error("Failed to reject invite:", error);
      showMessage(error.message || "Failed to reject invitation.");
    }
  };

  /*
   * ONLY invitations that have NOT been accepted
   * are considered pending.
   */
  const pendingInvites = invites.filter((invite) => invite.accepted !== true);

  const projectNotifications = notifications.filter(
    (notification) =>
      notification.type === "invite" &&
      notification.payload?.project_id === projectId,
  );

  return (
    <div className="mt-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">Team 1</h4>

        <button
          onClick={() => setNotificationsOpen((state) => !state)}
          className="text-sm text-blue-600 underline"
        >
          Notifications
        </button>
      </div>

      {/* Notifications */}
      {notificationsOpen && (
        <div className="mt-2 p-2 border rounded bg-white text-sm">
          <h5 className="font-semibold">Notifications</h5>

          {projectNotifications.length === 0 && (
            <div className="text-xs text-slate-500">
              No notifications for this project.
            </div>
          )}

          <ul className="mt-2 space-y-2">
            {projectNotifications.map((notification) => (
              <li key={notification.id} className="p-2 border rounded">
                <div className="text-sm">
                  Invite to join project • {notification.payload?.role}
                </div>

                <div className="mt-2 space-x-2">
                  {/* ACCEPT */}
                  <button
                    onClick={() => acceptInvite(notification)}
                    className="px-2 py-1 bg-green-600 text-white rounded text-xs"
                  >
                    Accept
                  </button>

                  {/* REJECT */}
                  <button
                    onClick={() => rejectInvite(notification)}
                    className="px-2 py-1 bg-red-500 text-white rounded text-xs"
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Current Team Members */}
      <ul className="mt-2 space-y-2">
        {members.map((member) => (
          <li
            key={member.user_id}
            className="flex items-center justify-between gap-3 p-2 border rounded bg-white text-sm"
          >
            <span>
              {member.full_name || member.email || member.user_id}
              {member.full_name && member.email
                ? ` (${member.email})`
                : ""} • {member.role}
            </span>
            {isProjectOwner && String(member.user_id) !== String(ownerId) && (
              <button
                type="button"
                onClick={() => removeMember(member)}
                className="shrink-0 rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
              >
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>

      {/* Add Member */}
      <div className="mt-2 flex gap-2">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 p-2 border rounded"
          placeholder="user email or id"
        />

        <button
          onClick={addMember}
          className="px-3 py-2 bg-slate-800 text-white rounded"
        >
          Add
        </button>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mt-2 text-sm ${messageIsError ? "text-red-600" : "text-green-600"}`}
        >
          {message}
        </div>
      )}

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <div className="mt-3">
          <h5 className="font-semibold">Pending Invites</h5>

          <ul className="mt-2 space-y-2">
            {pendingInvites.map((invite) => (
              <li
                key={invite.id}
                className="p-2 border rounded bg-white text-sm"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div>
                      {invite.email} • {invite.role}
                    </div>

                    {/* Invite link */}
                    {invite.token && (
                      <div className="mt-1 text-xs text-slate-600">
                        <span className="mr-2">Invite link:</span>

                        <a
                          href={
                            invite.link ||
                            `${window.location.origin}/projects/${projectId}?invite_token=${invite.token}`
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="underline text-blue-600"
                        >
                          Open
                        </a>

                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(
                              invite.link ||
                                `${window.location.origin}/projects/${projectId}?invite_token=${invite.token}`,
                            );

                            showMessage("Link copied", 2000);
                          }}
                          className="ml-2 px-2 py-0.5 text-xs bg-slate-200 rounded"
                        >
                          Copy
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Revoke */}
                  <div>
                    <button
                      onClick={() => revoke(invite.id)}
                      className="px-2 py-1 text-sm bg-red-500 text-white rounded"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* No pending invites */}
      {pendingInvites.length === 0 && (
        <div className="mt-3 text-sm text-slate-500">No pending invites.</div>
      )}
    </div>
  );
}
