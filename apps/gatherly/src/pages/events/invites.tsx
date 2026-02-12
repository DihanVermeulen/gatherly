import { useEvents } from "contexts/EventsContext";
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import {
  Plus,
  QrCode,
  Copy,
  Trash2,
  ArrowLeft,
  Clock,
  UserCheck,
  X,
} from "lucide-react";
import { invitesApi, Invite } from "api/invites";
import { InviteQRCode } from "components/invite/InviteQRCode";
import { InviteLink } from "components/invite/InviteLink";

export const EventInvitesPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    state: { events },
  } = useEvents();

  const [event, setEvent] = useState<any>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrModalInvite, setQrModalInvite] = useState<Invite | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const foundEvent = events.find((e) => String(e.id) === id);
    if (foundEvent) {
      setEvent(foundEvent);

      // Check if this is a localStorage-only event (uses timestamp as ID)
      // PostgreSQL INTEGER max is 2147483647, timestamps are much larger
      const eventIdNum = parseInt(id, 10);
      if (eventIdNum > 2147483647) {
        setError(
          "Invites are only available for events synced with the server. This event exists only in local storage.",
        );
        setLoading(false);
      }
    }
  }, [id, events]);

  useEffect(() => {
    if (!id) return;

    // Don't try to load invites for localStorage-only events
    const eventIdNum = parseInt(id, 10);
    if (eventIdNum > 2147483647) {
      return; // Error already set in previous useEffect
    }

    loadInvites();
  }, [id]);

  const loadInvites = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const eventId = parseInt(id, 10);
      const response = await invitesApi.getInvites(eventId);
      setInvites(response.invites);
    } catch (err: any) {
      console.error("Failed to load invites:", err);
      setError(err.response?.data?.error || "Failed to load invites");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInvite = async () => {
    if (!id) return;

    const eventId = parseInt(id, 10);
    if (eventId > 2147483647) {
      setError("Invites are only available for events synced with the server.");
      return;
    }

    try {
      setGenerating(true);
      setError(null);
      const newInvite = await invitesApi.createInvite(eventId);
      setInvites([newInvite, ...invites]);
      // Optionally show QR code modal immediately
      setQrModalInvite(newInvite);
    } catch (err: any) {
      console.error("Failed to generate invite:", err);
      setError(err.response?.data?.error || "Failed to generate invite");
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async (inviteId: number) => {
    if (!id) return;

    const eventId = parseInt(id, 10);
    if (eventId > 2147483647) {
      setError("Invites are only available for events synced with the server.");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to revoke this invite? It will no longer be usable.",
    );
    if (!confirmed) return;

    try {
      await invitesApi.revokeInvite(eventId, inviteId);
      setInvites(invites.filter((inv) => inv.id !== inviteId));
    } catch (err: any) {
      console.error("Failed to revoke invite:", err);
      setError(err.response?.data?.error || "Failed to revoke invite");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 flex items-center gap-1">
            <Clock size={12} />
            Pending
          </span>
        );
      case "accepted":
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 flex items-center gap-1">
            <UserCheck size={12} />
            Accepted
          </span>
        );
      case "declined":
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            Declined
          </span>
        );
      default:
        return null;
    }
  };

  if (!event) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark p-6 text-center">
        <p className="text-slate-500">Event not found</p>
        <button
          onClick={() => navigate("/events")}
          className="mt-4 text-primary font-bold"
        >
          Back to Events
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 pb-32">
      {/* Header */}
      <div className="bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
        <div className="flex items-center justify-between p-4 max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/events/edit/${id}`)}
              className="hover:bg-slate-200 dark:hover:bg-slate-800 p-1 rounded-full transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h2 className="text-lg font-bold leading-tight tracking-tight">
                {event.name}
              </h2>
              <p className="text-xs text-slate-500">Invites</p>
            </div>
          </div>
          <button
            onClick={handleGenerateInvite}
            disabled={generating}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-400 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium"
          >
            <Plus size={18} />
            Generate
          </button>
        </div>
      </div>

      <main className="max-w-2xl mx-auto p-4">
        {/* Error message */}
        {error && (
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-400 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Loading state */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-slate-500">Loading invites...</p>
          </div>
        ) : invites && invites.length === 0 ? (
          /* Empty state */
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <p className="text-slate-500 mb-4">
              No invites yet. Generate one to share with participants.
            </p>
            <button
              onClick={handleGenerateInvite}
              disabled={generating}
              className="bg-primary hover:bg-primary/80 disabled:bg-slate-400 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors font-medium mx-auto"
            >
              <Plus size={18} />
              Generate Invite
            </button>
          </div>
        ) : (
          /* Invite list */
          <div className="space-y-3">
            {invites &&
              invites.map((invite) => (
                <div
                  key={invite.id}
                  className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusBadge(invite.status)}
                      </div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {invite.status === "accepted" && invite.participant_name
                          ? invite.participant_name
                          : "Waiting..."}
                      </p>
                      {invite.email && (
                        <p className="text-xs text-slate-500 truncate">
                          {invite.email}
                        </p>
                      )}
                      <p className="text-xs text-slate-400 mt-1">
                        Created {formatDate(invite.created_at)}
                      </p>
                      {invite.expires_at && (
                        <p className="text-xs text-slate-400">
                          Expires:{" "}
                          {new Date(invite.expires_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => setQrModalInvite(invite)}
                      className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm font-medium"
                    >
                      <QrCode size={16} />
                      QR Code
                    </button>
                    {invite.status === "pending" && (
                      <button
                        onClick={() => handleRevoke(invite.id)}
                        className="bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 px-3 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm font-medium"
                      >
                        <Trash2 size={16} />
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </main>

      {/* QR Code Modal */}
      {qrModalInvite && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setQrModalInvite(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Share Invite
              </h3>
              <button
                onClick={() => setQrModalInvite(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex justify-center mb-4">
              <InviteQRCode inviteUrl={qrModalInvite.invite_url} size={256} />
            </div>

            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 text-center">
              Scan this QR code or copy the link below
            </p>

            <InviteLink inviteUrl={qrModalInvite.invite_url} />

            <button
              onClick={() => setQrModalInvite(null)}
              className="w-full mt-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-2 rounded-lg transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventInvitesPage;
