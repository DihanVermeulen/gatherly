import { QueryClient, QueryClientProvider } from "react-query";
import "styles/global.css";
import "./i18n";
import { RouterProvider } from "react-router";
import router from "routes";
import { EventsProvider } from "contexts/EventsContext";
import { GiftsProvider } from "contexts/GiftsContext";

function App() {
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <EventsProvider>
        <GiftsProvider>
          <div className="App">
            <RouterProvider router={router} />
          </div>
        </GiftsProvider>
      </EventsProvider>
    </QueryClientProvider>
  );
}

export default App;
