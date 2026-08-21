import React, { useState, useEffect } from "react";

export default function TeamPanel({
  projectId,
  members = [],
  onAddMember,
  client,
  user,
}) {
  const [email, setEmail] = useState("");
  const [invites, setInvites] = useState([]);
  const [message, setMessage] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const fetchInvites = async () => {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `http://localhost:8000/api/v1/projects/${projectId}/invites`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.ok) setInvites(await res.json());
    };
    fetchInvites();
    const fetchNotifications = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const r = await fetch(
          "http://localhost:8000/api/v1/users/me/notifications",
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (r.ok) setNotifications(await r.json());
      } catch (e) {}
    };
    fetchNotifications();
  }, [projectId]);

  const addMember = async () => {
    if (!email.trim()) return;
    // If the input looks like an email address, send an invite email instead of directly adding
    const token = localStorage.getItem("token");
    if (email.includes("@")) {
      const res = await fetch(
        `http://localhost:8000/api/v1/projects/${projectId}/invite`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ emails: [email], role: "editor" }),
        },
      );
      if (res.ok) {
        setMessage("Invite sent");
        setTimeout(() => setMessage(""), 3000);
        const body = await res.json();
        // If backend returned invite links, add them to the local invites list immediately
        try {
          if (body?.sent && Array.isArray(body.sent)) {
            const newInvites = body.sent.map((s) => {
              const link = s.link;
              let tokenVal = null;
              try {
                tokenVal = link
                  ? new URL(link).searchParams.get("invite_token")
                  : null;
              } catch (e) {
                tokenVal = null;
              }
              return {
                id:
                  s.invite_id ||
                  (tokenVal ? tokenVal.slice(0, 8) : `${Date.now()}`),
                project_id: projectId,
                email: s.email,
                role: s.role,
                token: tokenVal,
                created_by: null,
                created_at: new Date().toISOString(),
                accepted: false,
                accepted_at: null,
                link: s.link,
              };
            });
            setInvites((prev) => [...newInvites, ...prev]);
          }
        } catch (e) {
          // fallback: refresh invites from server
          const invRes = await fetch(
            `http://localhost:8000/api/v1/projects/${projectId}/invites`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          if (invRes.ok) setInvites(await invRes.json());
        }
        setEmail("");
      }
    } else if (onAddMember) {
      await onAddMember({
        user_id: email,
        email,
        full_name: email,
        role: "viewer",
      });
      setEmail("");
    } else {
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
      if (res.ok) {
        const created = await res.json();
        client?.send({ type: "member_added", payload: created });
        setEmail("");
      }
    }
  };

  const revoke = async (inviteId) => {
    const token = localStorage.getItem("token");
    const res = await fetch(
      `http://localhost:8000/api/v1/projects/${projectId}/invites/${inviteId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (res.ok) {
      setInvites((i) => i.filter((x) => x.id !== inviteId));
      setMessage("Invite revoked");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">Team</h4>
        <button
          onClick={() => setNotificationsOpen((s) => !s)}
          className="text-sm text-blue-600 underline"
        >
          Notifications
        </button>
      </div>
      {notificationsOpen && (
        <div className="mt-2 p-2 border rounded bg-white text-sm">
          <h5 className="font-semibold">Notifications</h5>
          {notifications.filter(
            (n) => n.type === "invite" && n.payload?.project_id === projectId,
          ).length === 0 && (
            <div className="text-xs text-slate-500">
              No notifications for this project.
            </div>
          )}
          <ul className="mt-2 space-y-2">
            {notifications
              .filter(
                (n) =>
                  n.type === "invite" && n.payload?.project_id === projectId,
              )
              .map((n) => (
                <li key={n.id} className="p-2 border rounded">
                  <div className="text-sm">
                    Invite to join project • {n.payload?.role}
                  </div>
                  <div className="mt-2 space-x-2">
                    <button
                      onClick={async () => {
                        const token = localStorage.getItem("token");
                        const res = await fetch(
                          `http://localhost:8000/api/v1/projects/${projectId}/invites/${n.payload?.invite_id}/respond`,
                          {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({ action: "accept" }),
                          },
                        );
                        if (res.ok) {
                          setMessage("Invite accepted");
                          setTimeout(() => setMessage(""), 2000);
                          setNotifications((prev) =>
                            prev.filter((x) => x.id !== n.id),
                          );
                          // refresh members if possible
                          try {
                            const memRes = await fetch(
                              `http://localhost:8000/api/v1/projects/${projectId}/members`,
                              { headers: { Authorization: `Bearer ${token}` } },
                            );
                            if (memRes.ok) {
                              const m =
                                await memRes.json(); /* optional: update parent via ws */
                            }
                          } catch (e) {}
                        }
                      }}
                      className="px-2 py-1 bg-green-600 text-white rounded text-xs"
                    >
                      Accept
                    </button>
                    <button
                      onClick={async () => {
                        const token = localStorage.getItem("token");
                        const res = await fetch(
                          `http://localhost:8000/api/v1/projects/${projectId}/invites/${n.payload?.invite_id}/respond`,
                          {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({ action: "reject" }),
                          },
                        );
                        if (res.ok) {
                          setMessage("Invite rejected");
                          setTimeout(() => setMessage(""), 2000);
                          setNotifications((prev) =>
                            prev.filter((x) => x.id !== n.id),
                          );
                        }
                      }}
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
      <ul className="mt-2 space-y-2">
        {members.map((m) => (
          <li key={m.user_id} className="p-2 border rounded bg-white text-sm">
            {m.email || m.user_id} • {m.role}
          </li>
        ))}
      </ul>
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
      {message && <div className="mt-2 text-sm text-green-600">{message}</div>}
      {invites.length > 0 && (
        <div className="mt-3">
          <h5 className="font-semibold">Pending Invites</h5>
          <ul className="mt-2 space-y-2">
            {invites.map((inv) => (
              <li key={inv.id} className="p-2 border rounded bg-white text-sm">
                <div className="flex justify-between items-center">
                  <div>
                    <div>
                      {inv.email} • {inv.role}{" "}
                      {inv.accepted ? "(accepted)" : ""}
                    </div>
                    {inv.token && !inv.accepted && (
                      <div className="mt-1 text-xs text-slate-600">
                        <span className="mr-2">Invite link:</span>
                        <a
                          href={`${window.location.origin}/projects/${projectId}?invite_token=${inv.token}`}
                          target="_blank"
                          rel="noreferrer"
                          className="underline text-blue-600"
                        >
                          Open
                        </a>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(
                              `${window.location.origin}/projects/${projectId}?invite_token=${inv.token}`,
                            );
                            setMessage("Link copied");
                            setTimeout(() => setMessage(""), 2000);
                          }}
                          className="ml-2 px-2 py-0.5 text-xs bg-slate-200 rounded"
                        >
                          Copy
                        </button>
                      </div>
                    )}
                  </div>
                  <div>
                    {!inv.accepted && (
                      <button
                        onClick={() => revoke(inv.id)}
                        className="px-2 py-1 text-sm bg-red-500 text-white rounded"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
