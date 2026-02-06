import { createBrowserRouter, Navigate } from "react-router";
import { MainLayout } from "layouts/MainLayout";
import { HomePage } from "pages/home";
import { EventsPage } from "pages/events";
import { EditEventPage } from "pages/events/edit";
import { EventGiftsPage } from "pages/events/gifts";
import { DecipherPage } from "pages/decipher";

export const router = createBrowserRouter([
  {
    element: <MainLayout />,
    children: [
      {
        path: "/",
        element: <Navigate to="/home" replace />,
      },
      {
        path: "/home",
        element: <HomePage />,
      },
      {
        path: "/events",
        element: <EventsPage />,
      },
      {
        path: "/events/edit/:id",
        element: <EditEventPage />,
      },
      {
        path: "/events/:id/gifts",
        element: <EventGiftsPage />,
      },
      {
        path: "/decipher",
        element: <DecipherPage />,
      },
    ],
  },
]);

export default router;