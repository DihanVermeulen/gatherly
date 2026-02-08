import { QueryClient, QueryClientProvider } from "react-query";
import "styles/global.css";
import "./i18n";
import { RouterProvider } from "react-router";
import router from "routes";
import { AuthProvider } from "contexts/AuthContext";
import { EventsProvider } from "contexts/EventsContext";
import { GiftsProvider } from "contexts/GiftsContext";

function App() {
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <EventsProvider>
          <GiftsProvider>
            <div className="App">
              <RouterProvider router={router} />
            </div>
          </GiftsProvider>
        </EventsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
