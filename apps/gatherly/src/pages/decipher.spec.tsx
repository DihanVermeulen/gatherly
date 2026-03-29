import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DecipherPage } from "./decipher";

// DecipherPage uses the Container component which has no external deps
function renderPage() {
  return render(<DecipherPage />);
}

/** Encode a "person:receiver1,receiver2" string the same way the app does */
function encode(person: string, receivers: string[]): string {
  return btoa(`${person}:${receivers.join(",")}`);
}

describe("DecipherPage", () => {
  it("renders the heading (expected use)", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { name: /decipher your code/i })
    ).toBeInTheDocument();
  });

  it("renders the code textarea and decipher button (expected use)", () => {
    renderPage();
    expect(
      screen.getByPlaceholderText(/paste your secret code/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /decipher code/i })
    ).toBeInTheDocument();
  });

  it("does not show result before deciphering (expected use)", () => {
    renderPage();
    expect(screen.queryByText(/you are:/i)).not.toBeInTheDocument();
  });

  it("deciphers a valid code and shows person and receivers (expected use)", async () => {
    renderPage();
    const code = encode("Alice", ["Bob", "Charlie"]);
    await userEvent.type(
      screen.getByPlaceholderText(/paste your secret code/i),
      code
    );
    await userEvent.click(screen.getByRole("button", { name: /decipher code/i }));

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Charlie")).toBeInTheDocument();
  });

  it("deciphers a code with a single receiver (expected use)", async () => {
    renderPage();
    const code = encode("Dave", ["Eve"]);
    await userEvent.type(
      screen.getByPlaceholderText(/paste your secret code/i),
      code
    );
    await userEvent.click(screen.getByRole("button", { name: /decipher code/i }));

    expect(screen.getByText("Dave")).toBeInTheDocument();
    expect(screen.getByText("Eve")).toBeInTheDocument();
  });

  it("shows error message for an invalid code (failure case)", async () => {
    renderPage();
    await userEvent.type(
      screen.getByPlaceholderText(/paste your secret code/i),
      "not-valid-base64!!!"
    );
    await userEvent.click(screen.getByRole("button", { name: /decipher code/i }));

    expect(screen.getByText(/invalid code/i)).toBeInTheDocument();
    expect(
      screen.getByText(/check that you've copied the code correctly/i)
    ).toBeInTheDocument();
  });

  it("triggers decipher on Ctrl+Enter keypress (expected use)", async () => {
    renderPage();
    const code = encode("Frank", ["Grace"]);
    const textarea = screen.getByPlaceholderText(/paste your secret code/i);
    await userEvent.type(textarea, code);
    await userEvent.keyboard("{Control>}{Enter}{/Control}");

    expect(screen.getByText("Frank")).toBeInTheDocument();
  });
});
