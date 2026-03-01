import { useEvents } from "contexts/EventsContext";
import {
  Calendar,
  CalendarOff,
  CheckCircle,
  Gift,
  MoreVertical,
  PartyPopper,
  Plus,
  Search,
  Settings,
  Share2,
  Trash2,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { CreateEventForm } from "components/events/CreateEventForm";
import { useAuth } from "contexts/AuthContext";

export const EventsPage = () => {
  const {
    state: { events },
    dispatch,
  } = useEvents();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.role === "participant" && user?.eventId) {
      navigate(`/events/${user.eventId}`);
    }
  }, [user, navigate]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    if (openMenuId) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openMenuId]);

  const handleCreateEvent = (name: string, description: string) => {
    dispatch({
      type: "ADD_EVENT",
      payload: {
        id: `temp-${Date.now()}`,
        name,
        // description,
        people: [],
        couples: [],
        assignments: null,
        coupleCrossing: false,
        gifts: {},
        date: new Date().toISOString(),
        participants: [],
        wishlists: [],
      },
    });
    setIsCreateFormOpen(false);
  };

  const deleteEvent = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this event?")) {
      dispatch({ type: "DELETE_EVENT", payload: id });
    }
  };

  return (
    <div
      id="events"
      className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 pb-24 font-sans"
    >
      <main className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="flex items-center justify-between px-4 pb-4 pt-6">
          <h2 className="text-2xl font-bold tracking-tight">My Events</h2>
          <button
            onClick={() => setIsCreateFormOpen(true)}
            className="flex items-center justify-center h-10 px-4 rounded-xl bg-primary-500 text-on-primary-0 gap-2 shadow-lg shadow-primary/20 transition-transform active:scale-95"
          >
            <Plus />
            <span className="text-sm font-bold truncate">New Event</span>
          </button>
        </div>

        {/* Search Bar (Simulated) */}
        <div className="px-4 py-3">
          <div className="flex w-full items-stretch rounded-xl h-11 shadow-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="flex items-center justify-center px-4 text-slate-400">
              <Search className="text-slate-400" />
            </div>
            <input
              className="flex-1 bg-transparent border-none focus:ring-0 px-4 py-3 text-sm placeholder:text-slate-400 font-medium"
              placeholder="Search events..."
            />
          </div>
        </div>

        {/* Event List */}
        <div className="flex flex-col gap-4 px-4 mt-2">
          {events.length === 0 ? (
            <div className="text-center py-12 flex flex-col justify-center items-center rounded-2xl border border-slate-100 dark:border-slate-800">
              <CalendarOff className="text-4xl text-slate-400 mb-2" />
              <p className="text-slate-500 font-medium">
                No events yet. Create one to get started!
              </p>
            </div>
          ) : (
            events.map((event) => (
              <div
                key={event.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 cursor-pointer hover:shadow-md transition-all group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1 min-w-0 pr-2">
                    <h3 className="text-lg font-bold mb-1 group-hover:text-primary transition-colors truncate">
                      {event.name}
                    </h3>
                    <div
                      className={`flex items-center gap-2 text-xs font-semibold px-2 py-1 rounded-full w-fit ${
                        event.assignments
                          ? "text-primary bg-primary/10"
                          : "text-blue-500 bg-blue-500/10"
                      }`}
                    >
                      <span className="text-[14px]">
                        {event.assignments ? <CheckCircle /> : <Calendar />}
                      </span>
                      {event.assignments ? "Codes Generated" : "Planning Phase"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* 3-dot menu */}
                    <div
                      className="relative"
                      ref={openMenuId === event.id ? menuRef : undefined}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(
                            openMenuId === event.id ? null : event.id,
                          );
                        }}
                        className="size-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        aria-label="Event options"
                      >
                        <MoreVertical size={18} />
                      </button>
                      {openMenuId === event.id && (
                        <div className="absolute right-0 top-10 z-50 min-w-[180px] bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-level-3 overflow-hidden">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(null);
                              navigate(`/events/edit/${event.id}`);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Settings size={15} className="text-slate-400" />
                            Configure Event
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); /* Share logic */
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Share2 size={15} className="text-slate-400" />
                            Share
                          </button>

                          <div className="h-px bg-slate-100 dark:bg-slate-800" />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(null);
                              deleteEvent(event.id, e);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 size={15} className="text-red-400" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-6">
                  <div className="flex flex-col items-center p-2 bg-background-light dark:bg-white/5 rounded-xl border border-slate-100 dark:border-slate-800/50">
                    <span className=" text-[20px] mb-1 opacity-60">
                      <Calendar />
                    </span>
                    <p className="text-[10px] font-bold opacity-50 uppercase">
                      Date
                    </p>
                    <p className="text-xs font-bold">
                      {new Date(event.date || Date.now()).toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric" },
                      )}
                    </p>
                  </div>
                  <div className="flex flex-col items-center p-2 bg-background-light dark:bg-white/5 rounded-xl border border-slate-100 dark:border-slate-800/50">
                    <span className="text-[20px] mb-1 opacity-60">
                      <Users />
                    </span>
                    <p className="text-[10px] font-bold opacity-50 uppercase">
                      Peeps
                    </p>
                    <p className="text-xs font-bold">
                      {event.people?.length || 0}
                    </p>
                  </div>
                  <div className="flex flex-col items-center p-2 bg-background-light dark:bg-white/5 rounded-xl border border-slate-100 dark:border-slate-800/50">
                    <span className="text-[20px] mb-1 opacity-60">
                      <Gift />
                    </span>
                    <p className="text-[10px] font-bold opacity-50 uppercase">
                      Gifts
                    </p>
                    <p className="text-xs font-bold">
                      {event.assignments
                        ? Object.keys(event.assignments).length
                        : 0}
                      /{event.people?.length || 0}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/events/${event.id}`);
                    }}
                    className="flex-1 py-2.5 bg-background-500 text-on-primary-0 rounded-xl text-sm font-bold shadow-sm active:scale-95 transition-transform"
                  >
                    View Event
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      <CreateEventForm
        isOpen={isCreateFormOpen}
        onClose={() => setIsCreateFormOpen(false)}
        onSubmit={handleCreateEvent}
      />
    </div>
  );
};

export default EventsPage;
