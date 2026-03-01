import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { invitesApi } from "../api/invites";
import { CheckCircle, AlertCircle, Loader } from "lucide-react";

type PageState =
  | "validating"
  | "valid"
  | "invalid"
  | "rate-limited"
  | "success";

export const JoinPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  const [pageState, setPageState] = useState<PageState>("validating");
  const [eventName, setEventName] = useState<string>("");
  const [eventId, setEventId] = useState<number>(0);
  const [inviteId, setInviteId] = useState<number>(0);
  const [participantName, setParticipantName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate invite on mount
  useEffect(() => {
    if (!code) {
      navigate("/home");
      return;
    }

    const validateInvite = async () => {
      try {
        const result = await invitesApi.validateInvite(code);
        setEventName(result.eventName);
        setEventId(result.eventId);
        setInviteId(result.inviteId);
        setPageState("valid");
      } catch (err: any) {
        if (err.response?.status === 429) {
          setPageState("rate-limited");
        } else if (
          err.response?.status === 404 ||
          err.response?.status === 400
        ) {
          setPageState("invalid");
        } else {
          setPageState("invalid");
          setError(err.response?.data?.message || "Failed to validate invite");
        }
      }
    };

    validateInvite();
  }, [code, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code || participantName.trim().length < 2) {
      setError("Please enter a name with at least 2 characters");
      return;
    }

    if (participantName.trim().length > 50) {
      setError("Name must be 50 characters or less");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const result = await invitesApi.acceptInvite(
        code,
        participantName.trim(),
        email.trim() || undefined,
      );
      setEventName(result.eventName);
      setEventId(result.eventId);
      setPageState("success");
    } catch (err: any) {
      if (err.response?.status === 429) {
        setPageState("rate-limited");
      } else {
        setError(err.response?.data?.message || "Failed to join event");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Validating state
  if (pageState === "validating") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-xl p-6 text-center">
          <Loader
            className="animate-spin mx-auto mb-4 text-emerald-500"
            size={48}
          />
          <h2 className="text-xl font-semibold mb-2">Validating Invite</h2>
          <p className="">Please wait...</p>
        </div>
      </div>
    );
  }

  // Invalid state
  if (pageState === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-xl p-6 text-center">
          <AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
          <h2 className="text-xl font-semibold mb-2">Invalid Invite</h2>
          <p className=" mb-6">
            {error || "This invite is invalid or has expired."}
          </p>
          <button
            onClick={() => navigate("/home")}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  // Rate limited state
  if (pageState === "rate-limited") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-xl p-6 text-center">
          <AlertCircle className="mx-auto mb-4 text-yellow-500" size={48} />
          <h2 className="text-xl font-semibold mb-2">Too Many Attempts</h2>
          <p className=" mb-6">Please try again later. Rate limit exceeded.</p>
          <button
            onClick={() => navigate("/home")}
            className="bg-secondary-0 text-on-secondary-0 px-6 py-2 rounded-lg transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  // Success state
  if (pageState === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-xl p-6 text-center">
          <CheckCircle className="mx-auto mb-4 text-emerald-500" size={64} />
          <h2 className="text-2xl font-bold mb-2">Welcome to {eventName}!</h2>
          {email.trim() ? (
            <p className=" mb-6">
              Check <strong>{email.trim()}</strong> for a magic link to sign in
              to {eventName}.
            </p>
          ) : (
            <p className=" mb-6">
              You've successfully joined the event. Ask the organizer for a
              magic link to sign in.
            </p>
          )}
          <div className="space-y-3">
            <button
              onClick={() => navigate("/events")}
              className="w-full bg-secondary-0 text-on-secondary-0 px-6 py-3 rounded-lg transition-colors font-medium"
            >
              View My Events
            </button>
            <button
              onClick={() => navigate("/home")}
              className="w-full bg-secondary-0 text-on-secondary-0 px-6 py-3 rounded-lg transition-colors"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Valid state - show join form
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-xl p-6">
        <h2 className="text-2xl font-bold mb-2 text-center">Join Event</h2>
        <p className=" mb-6 text-center">
          You've been invited to:{" "}
          <span className="text-primary-0 font-semibold">{eventName}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-zinc-300 mb-2"
            >
              Your Name
            </label>
            <input
              id="name"
              type="text"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              placeholder="Enter your name"
              minLength={2}
              maxLength={50}
              required
              className="w-full px-4 py-3 rounded-lg border border-zinc-600 focus:outline-none focus:border-primary transition-colors"
            />
            <p className="text-xs text-zinc-500 mt-1">
              {participantName.length}/50 characters
            </p>
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-zinc-300 mb-2"
            >
              Email (optional) — we'll send you a magic link to sign in
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              maxLength={255}
              className="w-full px-4 py-3 rounded-lg border border-zinc-600 focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || participantName.trim().length < 2}
            className="w-full bg-primary-500 hover:bg-primary/80 disabled:bg-zinc-600 disabled:cursor-not-allowed text-on-primary-0 px-6 py-3 rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader className="animate-spin" size={18} />
                <span>Joining...</span>
              </>
            ) : (
              <span>Join Event</span>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate("/home")}
            className=" hover:text-white transition-colors text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
