import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { queryClient } from "lib/queryClient";
import { persister } from "lib/queryPersister";
import "styles/global.css";
import "./i18n";
import { RouterProvider } from "react-router";
import router from "routes";
import { AuthProvider } from "contexts/AuthContext";
import { EventsProvider } from "contexts/EventsContext";
import { GiftsProvider } from "contexts/GiftsContext";

function App() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister }}
      onSuccess={() => {
        queryClient.resumePausedMutations().then(() => {
          queryClient.invalidateQueries();
        });
      }}
    >
      <AuthProvider>
        <EventsProvider>
          <GiftsProvider>
            <div className="App">
              <RouterProvider router={router} />
            </div>
          </GiftsProvider>
        </EventsProvider>
      </AuthProvider>
    </PersistQueryClientProvider>
  );
}

export default App;
