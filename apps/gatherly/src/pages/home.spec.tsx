import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { HomePage } from "./home";

const mockNavigate = jest.fn();
jest.mock("react-router", () => ({
  ...jest.requireActual("react-router"),
  useNavigate: () => mockNavigate,
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>
  );
}

describe("HomePage", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it("renders the hero heading (expected use)", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { name: /gatherly made simple/i })
    ).toBeInTheDocument();
  });

  it("renders the Get Started button (expected use)", () => {
    renderPage();
    expect(
      screen.getByRole("button", { name: /get started/i })
    ).toBeInTheDocument();
  });

  it("navigates to /events when Get Started is clicked (expected use)", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /get started/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/events");
  });

  it("renders all three feature card headings (expected use)", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { name: /create events/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /manage couples/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /secret codes/i })
    ).toBeInTheDocument();
  });

  it("renders descriptive text for each feature (expected use)", () => {
    renderPage();
    expect(screen.getByText(/multiple gatherly events/i)).toBeInTheDocument();
    expect(screen.getByText(/mark couples/i)).toBeInTheDocument();
    expect(screen.getByText(/unique, encrypted codes/i)).toBeInTheDocument();
  });
});
