import { useEvents } from "contexts/EventsContext";
import {
  Calendar,
  CheckCircle,
  Gift,
  Group,
  PartyPopper,
  Users,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";

export const EventsPage = () => {
  const {
    state: { events },
    dispatch,
  } = useEvents();
  const [newEventName, setNewEventName] = useState("");
  const navigate = useNavigate();

  const createEvent = () => {
    if (!newEventName.trim()) return;
    const event = {
      id: Date.now().toString(),
      name: newEventName,
      people: [],
      couples: [],
      assignments: null,
      coupleCrossing: false,
      gifts: {},
      date: new Date().toISOString(),
      participants: [],
    };
    dispatch({ type: "ADD_EVENT", payload: event });
    setNewEventName("");
  };

  const deleteEvent = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this event?")) {
      dispatch({ type: "DELETE_EVENT", payload: id });
    }
  };

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen pb-24 font-sans">
      <main className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="flex items-center justify-between px-4 pb-4 pt-6">
          <h2 className="text-2xl font-bold tracking-tight">My Events</h2>
          <button
            onClick={() => {
              const name = prompt("Enter event name:");
              if (name) {
                const event = {
                  id: Date.now().toString(),
                  name: name,
                  people: [],
                  couples: [],
                  assignments: null,
                  coupleCrossing: false,
                  gifts: {},
                  date: new Date().toISOString(),
                  participants: [],
                };
                dispatch({ type: "ADD_EVENT", payload: event });
              }
            }}
            className="flex items-center justify-center h-10 px-4 rounded-full bg-primary text-background-dark gap-2 shadow-lg shadow-primary/20 transition-transform active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px] font-bold">
              add
            </span>
            <span className="text-sm font-bold truncate">New Event</span>
          </button>
        </div>

        {/* Search Bar (Simulated) */}
        <div className="px-4 py-3">
          <div className="flex w-full items-stretch rounded-xl h-11 shadow-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="flex items-center justify-center pl-4 text-slate-400">
              <span className="material-symbols-outlined">search</span>
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
            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
              <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">
                event_busy
              </span>
              <p className="text-slate-500 font-medium">
                No events yet. Create one to get started!
              </p>
            </div>
          ) : (
            events.map((event) => (
              <div
                key={event.id}
                onClick={() => navigate(`/events/edit/${event.id}`)}
                className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 cursor-pointer hover:shadow-md transition-all active:scale-[0.99] group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold mb-1 group-hover:text-primary transition-colors">
                      {event.name}
                    </h3>
                    <div
                      className={`flex items-center gap-2 text-xs font-semibold px-2 py-1 rounded-full w-fit ${
                        event.assignments
                          ? "text-primary bg-primary/10"
                          : "text-blue-500 bg-blue-500/10"
                      }`}
                    >
                      <span className=" text-[14px]">
                        {event.assignments ? <CheckCircle /> : <Calendar />}
                      </span>
                      {event.assignments ? "Codes Generated" : "Planning Phase"}
                    </div>
                  </div>
                  <div className="size-10 rounded-xl bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center text-orange-600 dark:text-orange-400">
                    <span className="">
                      <PartyPopper />
                    </span>
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
                      navigate(`/events/edit/${event.id}`);
                    }}
                    className="flex-1 py-2.5 bg-primary text-background-dark rounded-xl text-sm font-bold shadow-sm active:scale-95 transition-transform"
                  >
                    Manage
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); /* Share logic */
                    }}
                    className="flex-1 py-2.5 bg-white dark:bg-white/10 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold active:scale-95 transition-transform"
                  >
                    Share
                  </button>
                  <button
                    onClick={(e) => deleteEvent(event.id, e)}
                    className="size-11 flex items-center justify-center text-slate-400 hover:text-red-500 active:scale-95 transition-transform"
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default EventsPage;
