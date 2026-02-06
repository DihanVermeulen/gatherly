import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { GiftRegistryPage } from "./gift-registry";
import { GiftsProvider } from "contexts/GiftsContext";

function renderWithProviders() {
  return render(
    <MemoryRouter initialEntries={["/gift-registry"]}>
      <GiftsProvider>
        <GiftRegistryPage />
      </GiftsProvider>
    </MemoryRouter>
  );
}

describe("GiftRegistryPage", () => {
  it("renders screen title and primary sections (expected use)", () => {
    renderWithProviders();
    expect(screen.getByRole("heading", { name: /gift registry/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /add your gifts/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /registry list/i })).toBeInTheDocument();
  });

  it("shows Create First Gift CTA when no gifts exist (empty state)", () => {
    renderWithProviders();
    expect(screen.getByRole("button", { name: /create first gift/i })).toBeInTheDocument();
  });

  it("form has required fields and Add to Registry button", () => {
    renderWithProviders();
    expect(screen.getByRole("textbox", { name: /gift name/i })).toBeInTheDocument();
    expect(document.getElementById("gift-recipient")).toBeInTheDocument();
    expect(document.getElementById("gift-occasion")).toBeInTheDocument();
    expect(document.getElementById("gift-due-date")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add to registry/i })).toBeInTheDocument();
  });

  it("submit button is disabled when required fields are empty (failure/validation)", () => {
    renderWithProviders();
    const submit = screen.getByRole("button", { name: /add to registry/i });
    expect(submit).toBeDisabled();
  });
});
