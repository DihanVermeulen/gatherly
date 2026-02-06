import { useNavigate } from "react-router";

export const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Hero Section */}
      <div className="text-center py-16 mb-12">
        <h1 className="text-5xl font-bold text-red-800 mb-4">
          gatherly Made Simple
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Create and manage your gatherly events with ease. Add participants,
          manage couples, and generate secret codes - all in one place.
        </p>
        <button
          onClick={() => navigate("/events")}
          className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-lg text-lg font-medium transition-colors shadow-lg hover:shadow-xl"
        >
          Get Started
        </button>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-red-100 p-6 hover:shadow-md transition-shadow">
          <div className="text-4xl mb-4">🎄</div>
          <h3 className="text-xl font-semibold text-red-800 mb-2">
            Create Events
          </h3>
          <p className="text-gray-600">
            Set up multiple gatherly events for different groups - family,
            friends, coworkers, and more.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-red-100 p-6 hover:shadow-md transition-shadow">
          <div className="text-4xl mb-4">💑</div>
          <h3 className="text-xl font-semibold text-red-800 mb-2">
            Manage Couples
          </h3>
          <p className="text-gray-600">
            Mark couples and choose whether they can buy gifts for each other.
            Perfect for family events!
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-red-100 p-6 hover:shadow-md transition-shadow">
          <div className="text-4xl mb-4">🔐</div>
          <h3 className="text-xl font-semibold text-red-800 mb-2">
            Secret Codes
          </h3>
          <p className="text-gray-600">
            Generate unique, encrypted codes for each participant. Share them
            easily and keep the surprise alive!
          </p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
