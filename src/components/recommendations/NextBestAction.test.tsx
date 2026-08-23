import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NextBestAction } from "./NextBestAction";

const recommendation = {
  action: "Revise Damping",
  reason: "Your latest Physics assessment shows this is a weak area.",
  priority: "high" as const,
  estimatedTime: 10,
  category: "revision" as const,
};

describe("NextBestAction", () => {
  it("renders the recommendation and action metadata", () => {
    render(<NextBestAction recommendation={recommendation} />);

    expect(screen.getByRole("heading", { name: "Revise Damping" })).toBeInTheDocument();
    expect(screen.getByText(/latest Physics assessment/i)).toBeInTheDocument();
    expect(screen.getByText("High priority")).toBeInTheDocument();
    expect(screen.getByText("10 min")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /start now/i })).toBeInTheDocument();
  });

  it("renders a graceful empty state", () => {
    render(<NextBestAction recommendation={null} />);

    expect(screen.getByText(/next recommendation will appear here/i)).toBeInTheDocument();
  });
});
