import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PasswordStrengthIndicator } from "./PasswordStrengthIndicator";

describe("PasswordStrengthIndicator", () => {
  describe("Password strength calculation", () => {
    it('displays "No password" for empty password', () => {
      render(<PasswordStrengthIndicator password="" />);
      expect(screen.getByText("No password")).toBeInTheDocument();
    });

    it('displays "Weak" for password with only one requirement met', () => {
      render(<PasswordStrengthIndicator password="abc" />);
      expect(screen.getByText("Weak")).toBeInTheDocument();
    });

    it('displays "Fair" for password with 2 requirements met', () => {
      // "abcdefgh" meets 2 requirements: 8+ chars and lowercase
      render(<PasswordStrengthIndicator password="abcdefgh" />);
      expect(screen.getByText("Fair")).toBeInTheDocument();
    });

    it('displays "Good" for password with 3 requirements met', () => {
      // "abcdefghA" meets 3 requirements: 8+ chars, lowercase, and uppercase
      render(<PasswordStrengthIndicator password="abcdefghA" />);
      expect(screen.getByText("Good")).toBeInTheDocument();
    });

    it('displays "Strong" for password with all requirements met', () => {
      render(<PasswordStrengthIndicator password="Abc123def" />);
      expect(screen.getByText("Strong")).toBeInTheDocument();
    });
  });

  describe("Password requirements checklist", () => {
    it("shows all requirements as unmet for empty password", () => {
      render(<PasswordStrengthIndicator password="" />);

      const checkmarks = screen.queryAllByTestId("check-icon");
      const xMarks = screen.queryAllByText(
        /At least 8 characters|One uppercase letter|One lowercase letter|One number/
      );

      expect(checkmarks).toHaveLength(0);
      expect(xMarks).toHaveLength(4);
    });

    it("marks length requirement as met when password is 8+ characters", () => {
      render(<PasswordStrengthIndicator password="abcdefgh" />);

      const lengthRequirement = screen.getByText("At least 8 characters");
      expect(lengthRequirement.previousElementSibling?.tagName).toBe("svg");
      // Check that the text is not muted (requirement is met)
      expect(lengthRequirement).toHaveClass("text-foreground");
    });

    it("marks uppercase requirement as met when password contains uppercase", () => {
      render(<PasswordStrengthIndicator password="abcdefgH" />);

      const uppercaseRequirement = screen.getByText("One uppercase letter");
      expect(uppercaseRequirement).toHaveClass("text-foreground");
    });

    it("marks lowercase requirement as met when password contains lowercase", () => {
      render(<PasswordStrengthIndicator password="ABCDEFGH" />);

      const lowercaseRequirement = screen.getByText("One lowercase letter");
      // Should be muted since no lowercase
      expect(lowercaseRequirement).toHaveClass("text-muted-foreground");
    });

    it("marks number requirement as met when password contains number", () => {
      render(<PasswordStrengthIndicator password="abcdefg1" />);

      const numberRequirement = screen.getByText("One number");
      expect(numberRequirement).toHaveClass("text-foreground");
    });

    it("marks all requirements as met for strong password", () => {
      render(<PasswordStrengthIndicator password="Abc123def" />);

      const requirements = ["At least 8 characters", "One uppercase letter", "One lowercase letter", "One number"];

      requirements.forEach((req) => {
        const element = screen.getByText(req);
        expect(element).toHaveClass("text-foreground");
      });
    });
  });

  describe("Accessibility", () => {
    it("has aria-live region for dynamic updates", () => {
      const { container } = render(<PasswordStrengthIndicator password="test" />);

      const liveRegion = container.querySelector('[aria-live="polite"]');
      expect(liveRegion).toBeInTheDocument();
    });

    it("has accessible progress bar with proper ARIA attributes", () => {
      render(<PasswordStrengthIndicator password="Abc123def" />);

      // Progress bar should have aria attributes
      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveAttribute("aria-valuenow", "100");
      expect(progressBar).toHaveAttribute("aria-valuemin", "0");
      expect(progressBar).toHaveAttribute("aria-valuemax", "100");
    });

    it("updates progress bar aria-label based on strength", () => {
      const { rerender } = render(<PasswordStrengthIndicator password="" />);
      expect(screen.getByLabelText("Password strength: No password")).toBeInTheDocument();

      rerender(<PasswordStrengthIndicator password="abc" />);
      expect(screen.getByLabelText("Password strength: Weak")).toBeInTheDocument();

      rerender(<PasswordStrengthIndicator password="Abc123def" />);
      expect(screen.getByLabelText("Password strength: Strong")).toBeInTheDocument();
    });
  });

  describe("Visual styling", () => {
    it("applies correct color class for weak password", () => {
      // "abc" meets only 1 requirement (lowercase)
      render(<PasswordStrengthIndicator password="abc" />);

      const strengthLabel = screen.getByText("Weak");
      expect(strengthLabel).toHaveClass("text-destructive");
    });

    it("applies correct color class for fair password", () => {
      // "abcdefgh" meets 2 requirements (8+ chars, lowercase)
      render(<PasswordStrengthIndicator password="abcdefgh" />);

      const strengthLabel = screen.getByText("Fair");
      expect(strengthLabel).toHaveClass("text-orange-500");
    });

    it("applies correct color class for good password", () => {
      // "abcdefghA" meets 3 requirements (8+ chars, lowercase, uppercase)
      render(<PasswordStrengthIndicator password="abcdefghA" />);

      const strengthLabel = screen.getByText("Good");
      expect(strengthLabel).toHaveClass("text-yellow-600");
    });

    it("applies correct color class for strong password", () => {
      render(<PasswordStrengthIndicator password="Abc123def" />);

      const strengthLabel = screen.getByText("Strong");
      expect(strengthLabel).toHaveClass("text-green-600");
    });
  });
});
