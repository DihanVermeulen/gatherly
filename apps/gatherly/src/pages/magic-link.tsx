import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { CheckCircle, AlertCircle, Loader } from "lucide-react";

type PageState = "redeeming" | "success" | "invalid" | "rate-limited";

export const MagicLinkPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { loginWithMagicLink, user } = useAuth();

  const [pageState, setPageState] = useState<PageState>("redeeming");

  useEffect(() => {
    if (!token) {
      navigate("/home");
      return;
    }

    const redeem = async () => {
      try {
        await loginWithMagicLink(token);
        setPageState("success");
      } catch (err: any) {
        const status = err.response?.status;
        if (status === 429) {
          setPageState("rate-limited");
        } else {
          setPageState("invalid");
        }
      }
    };

    redeem();
  }, [token, navigate, loginWithMagicLink]);

  if (pageState === "redeeming") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-xl p-6 text-center">
          <Loader
            className="animate-spin mx-auto mb-4 text-primary"
            size={48}
          />
          <h2 className="text-xl font-semibold mb-2">Signing You In</h2>
          <p className="">Please wait...</p>
        </div>
      </div>
    );
  }

  if (pageState === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-xl p-6 text-center">
          <AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
          <h2 className="text-xl font-semibold mb-2">Invalid Magic Link</h2>
          <p className=" mb-6">This magic link is invalid or has expired.</p>
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

  if (pageState === "rate-limited") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-xl p-6 text-center">
          <AlertCircle className="mx-auto mb-4 text-yellow-500" size={48} />
          <h2 className="text-xl font-semibold mb-2">Too Many Attempts</h2>
          <p className=" mb-6">Please try again later. Rate limit exceeded.</p>
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

  // Success state
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-xl p-6 text-center">
        <CheckCircle className="mx-auto mb-4 text-emerald-500" size={64} />
        <h2 className="text-2xl font-bold mb-2">
          {user?.eventName
            ? `Welcome to ${user.eventName}!`
            : "You're signed in!"}
        </h2>
        <p className=" mb-6">You now have access to your event.</p>
        <div className="space-y-3">
          <button
            onClick={() => navigate(`/events/${user?.eventId}`)}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-lg transition-colors font-medium"
          >
            View My Event
          </button>
          <button
            onClick={() => navigate("/home")}
            className="w-full bg-zinc-700 hover:bg-zinc-600 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    </div>
  );
};
