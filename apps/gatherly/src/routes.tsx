import { createBrowserRouter, Navigate } from "react-router";
import { MainLayout } from "layouts/MainLayout";
import { HomePage } from "pages/home";
import { EventsPage } from "pages/events";
import { EditEventPage } from "pages/events/edit";
import { EventDetailsPage } from "pages/events/details";
import { EventGiftsPage } from "pages/events/gifts";
import { EventInvitesPage } from "pages/events/invites";
import { WishlistPage } from "pages/events/wishlist";
import { DecipherPage } from "pages/decipher";
import { JoinPage } from "pages/join";
import { MagicLinkPage } from "pages/magic-link";
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
      {
        path: "/magic-link/:token",
        element: <MagicLinkPage />,
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
            path: "/events/:id",
            element: <EventDetailsPage />,
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
          {
            path: "/events/:id/invites",
            element: <EventInvitesPage />,
          },
        ],
      },
    ],
  },
]);

export default router;