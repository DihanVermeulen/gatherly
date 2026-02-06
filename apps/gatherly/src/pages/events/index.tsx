import { useEvents } from "contexts/EventsContext";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";

export const EventsPage = () => {
  const { state: { events }, dispatch } = useEvents();
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
    dispatch({ type: 'ADD_EVENT', payload: event });
    setNewEventName("");
  };

  const deleteEvent = (id: string) => {
    dispatch({ type: 'DELETE_EVENT', payload: id });
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-red-800 mb-6">Events</h1>

      {/* Create Event Section */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-red-100">
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Enter event name..."
            value={newEventName}
            onChange={(e) => setNewEventName(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && createEvent()}
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-red-400"
          />
          <button
            onClick={createEvent}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Create Event
          </button>
        </div>
      </div>

      {/* Events Grid */}
      {events.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-100">
          <p className="text-gray-500 text-lg">
            No events yet. Create one to get started!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {events.map((event) => (
            <div
              key={event.id}
              className="bg-white rounded-lg shadow-sm border border-red-100 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-red-800">
                    {event.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {event.people?.length || 0} people
                  </p>
                </div>
                <button
                  onClick={() => deleteEvent(event.id)}
                  className="text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={20} />
                </button>
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => navigate(`/events/edit/${event.id}`)}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg transition-colors text-sm font-medium"
                >
                  Manage Event
                </button>
                {event.assignments && (
                  <button
                    onClick={() => navigate(`/events/${event.id}/gifts`)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition-colors text-sm font-medium"
                  >
                    View Gifts
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EventsPage;
