import { useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { useEvents } from "contexts/EventsContext";
import { useEventByIdQuery } from "hooks/useEventQueries";
import { useAuth } from "contexts/AuthContext";
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Eye,
  Gift,
  MoreVertical,
  Plus,
  Users,
} from "lucide-react";

export const EventDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    state: { events },
  } = useEvents();
  const { data: fullEvent } = useEventByIdQuery(id || "");

  useEffect(() => {
    if (user?.role === "participant" && user?.eventId && id !== String(user.eventId)) {
      navigate(`/events/${user.eventId}`, { replace: true });
    }
  }, [user, id, navigate]);

  const event = fullEvent || events.find((e) => e.id === id);

  if (!event) {
    return (
      <div className="bg-background-light dark:bg-background-dark min-h-screen p-6 text-center">
        <p className="text-slate-500">Event not found</p>
        <button
          onClick={() => navigate(user?.role === "participant" && user?.eventId ? `/events/${user.eventId}` : "/events")}
          className="mt-4 text-primary font-bold"
        >
          Back to Events
        </button>
      </div>
    );
  }

  const participants =
    event.participantDetails && event.participantDetails.length > 0
      ? event.participantDetails
      : event.people.map((name, i) => ({ id: i, name }));

  const currentParticipant = event.participantDetails?.find(
    (p) => p.name === user?.name,
  );

  const hasAssignments = !!event.assignments;

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 pb-32 font-sans -mt-20">
      {/* Top App Bar */}
      <div className="bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center p-4 justify-between max-w-md mx-auto">
          <button
            onClick={() => navigate("/events")}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold">Event Details</h1>
          <button
            onClick={() => navigate(`/events/edit/${event.id}`)}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4">
        {/* Event Header */}
        <div className="mt-5 flex items-start gap-4">
          <div className="w-16 h-16 rounded-xl bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center text-orange-500 shrink-0 shadow-level-1">
            <Gift size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold leading-tight">{event.name}</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {participants.length}{" "}
              {participants.length === 1 ? "participant" : "participants"}
            </p>
            <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
              <Calendar size={12} />
              <span>
                {new Date(event.date || Date.now()).toLocaleDateString(
                  "en-US",
                  { month: "short", day: "numeric", year: "numeric" },
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-100 dark:border-slate-800 shadow-level-1 text-center">
            <div className="flex items-center justify-center mb-1 opacity-50">
              <Users size={14} />
            </div>
            <p className="text-[10px] font-bold opacity-50 uppercase tracking-wider">
              Members
            </p>
            <p className="text-lg font-bold mt-0.5">
              {event.people?.length || 0}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-100 dark:border-slate-800 shadow-level-1 text-center">
            <div className="flex items-center justify-center mb-1 opacity-50">
              <Gift size={14} />
            </div>
            <p className="text-[10px] font-bold opacity-50 uppercase tracking-wider">
              Gifts
            </p>
            <p className="text-lg font-bold mt-0.5">
              {hasAssignments ? Object.keys(event.assignments!).length : 0}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-100 dark:border-slate-800 shadow-level-1 text-center">
            <div className="flex items-center justify-center mb-1 opacity-50">
              <Calendar size={14} />
            </div>
            <p className="text-[10px] font-bold opacity-50 uppercase tracking-wider">
              Status
            </p>
            <p
              className={`text-sm font-bold mt-0.5 ${
                hasAssignments ? "text-primary" : "text-blue-500"
              }`}
            >
              {hasAssignments ? "Active" : "Planning"}
            </p>
          </div>
        </div>

        {/* Hero Section */}
        <div className="mt-4 rounded-2xl overflow-hidden relative h-44 bg-gradient-to-br from-slate-700 to-slate-900">
          <div className="absolute inset-0 flex items-center justify-center opacity-10">
            <Gift size={140} className="text-white" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/40 to-transparent" />
          <div className="absolute top-3 left-3">
            <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full backdrop-blur-sm border border-white/20">
              Top Secret
            </span>
          </div>
        </div>

        {/* Secret Assignment Section */}
        <div className="mt-4 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-level-1">
          <h3 className="text-base font-bold mb-1">Your Secret Assignment</h3>
          <p className="text-sm text-slate-500 mb-4 leading-relaxed">
            {hasAssignments
              ? "The draw is complete! Reveal who you are surprising this year."
              : "Assignments haven't been generated yet. Configure this event to generate secret codes."}
          </p>
          <button
            onClick={() => navigate("/decipher")}
            className="w-full flex items-center justify-center gap-2 bg-primary text-black font-bold py-3 rounded-xl shadow-sm shadow-primary/20 active:scale-95 transition-transform"
          >
            <Eye size={18} />
            View My Assignment
          </button>
        </div>

        {/* Participants Section */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold">Participants</h3>
            <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
              {participants.length} Joined
            </span>
          </div>
          <div className="space-y-2">
            {participants.map((participant, index) => (
              <div
                key={participant.id}
                className="flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-level-1"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                    {participant.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{participant.name}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">
                      {index === 0 ? "Organizer" : "Participant"}
                    </p>
                  </div>
                </div>
                {hasAssignments ? (
                  <CheckCircle size={18} className="text-primary shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
                )}
              </div>
            ))}
            {participants.length === 0 && (
              <p className="text-sm text-slate-400 italic px-2">
                No participants yet
              </p>
            )}
          </div>
        </div>
      </main>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 p-4 safe-area-bottom">
        <div className="sm:mx-auto md:ml-auto md:mr-0 flex gap-3">
          <button
            onClick={() =>
              navigate(`/events/${event.id}/wishlist/${currentParticipant?.id}`)
            }
            className="flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            View All Gifts
          </button>
          <button
            onClick={() =>
              currentParticipant
                ? navigate(
                    `/events/${event.id}/wishlist/${currentParticipant.id}`,
                  )
                : undefined
            }
            disabled={!currentParticipant}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm bg-primary text-black shadow-sm shadow-primary/20 active:scale-95 transition-transform ${!currentParticipant ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <Plus size={16} />
            Add My Gifts
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventDetailsPage;
