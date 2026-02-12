import { createBrowserRouter, Navigate } from "react-router";
import { MainLayout } from "layouts/MainLayout";
import { HomePage } from "pages/home";
import { EventsPage } from "pages/events";
import { EditEventPage } from "pages/events/edit";
import { EventGiftsPage } from "pages/events/gifts";
import { WishlistPage } from "pages/events/wishlist";
import { DecipherPage } from "pages/decipher";
import { JoinPage } from "pages/join";
import { LoginPage } from "pages/auth/login";
import { RegisterPage } from "pages/auth/register";
import { ProtectedRoute } from "components/ProtectedRoute";

export const router = createBrowserRouter([
  {
    element: <MainLayout />,
    children: [
      // Public routes
      {
        path: "/",
        element: <Navigate to="/home" replace />,
      },
      {
        path: "/home",
        element: <HomePage />,
      },
      {
        path: "/login",
        element: <LoginPage />,
      },
      {
        path: "/register",
        element: <RegisterPage />,
      },
      {
        path: "/decipher",
        element: <DecipherPage />,
      },
      {
        path: "/join/:code",
        element: <JoinPage />,
      },
      // Protected routes
      {
        element: <ProtectedRoute />,
        children: [
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
            path: "/events/:eventId/wishlist/:participantId",
            element: <WishlistPage />,
          },
        ],
      },
    ],
  },
]);

export default router;