import { describe, it } from "vitest";

import { isEmail } from "./email";

describe("isEmail", () => {
  // Valid email addresses
  it("should return true for standard email addresses", ({ expect }) => {
    expect(isEmail("user@example.com")).toBe(true);
    expect(isEmail("firstname.lastname@example.com")).toBe(true);
    expect(isEmail("email@subdomain.example.com")).toBe(true);
    expect(isEmail("firstname+lastname@example.com")).toBe(true);
    expect(isEmail("email@example-one.com")).toBe(true);
  });

  it("should return true for email addresses with uncommon but valid characters", ({ expect }) => {
    expect(isEmail("firstname-lastname@example.com")).toBe(true);
    expect(isEmail("user.name+tag+sorting@example.com")).toBe(true);
    expect(isEmail("x@example.com")).toBe(true);
    expect(isEmail("1234567890@example.com")).toBe(true);
  });

  // Invalid email addresses
  it("should return false for email addresses without @ symbol", ({ expect }) => {
    expect(isEmail("plainaddress")).toBe(false);
    expect(isEmail("example.com")).toBe(false);
  });

  it("should return false for email addresses with incorrect domain format", ({ expect }) => {
    expect(isEmail("user@")).toBe(false);
    expect(isEmail("user@domain")).toBe(false); // Missing TLD
    expect(isEmail("user@.com")).toBe(false);
    expect(isEmail("email@123.123.123.123")).toBe(false); // IP address as domain is not considered valid per IETF standards
  });

  it("should return false for email addresses with special characters in wrong positions", ({ expect }) => {
    expect(isEmail(".user@example.com")).toBe(false); // Leading dot in local part
    expect(isEmail("user.@example.com")).toBe(false); // Trailing dot in local part
    expect(isEmail("user@example..com")).toBe(false); // Double dots in domain
    expect(isEmail("_______@example.com")).toBe(false); // Underscores-only local part is not valid
  });

  it("should return false for email addresses with invalid formatting", ({ expect }) => {
    expect(isEmail("user@example_domain.com")).toBe(false); // Underscore in domain
    expect(isEmail("user@example.com.")).toBe(false); // Trailing dot in domain
    expect(isEmail("user@-example.com")).toBe(false); // Leading hyphen in domain
  });

  it("should return false for empty strings or strings with only whitespace", ({ expect }) => {
    expect(isEmail("")).toBe(false);
    expect(isEmail(" ")).toBe(false);
    expect(isEmail("\t")).toBe(false);
    expect(isEmail("\n")).toBe(false);
  });

  it("should handle strings with leading/trailing whitespace", ({ expect }) => {
    expect(isEmail(" user@example.com ")).toBe(true);
    expect(isEmail("\tuser@example.com\t")).toBe(true);
    expect(isEmail("\nuser@example.com\n")).toBe(true);
  });

  it("should return false for invalid inputs", ({ expect }) => {
    expect(isEmail("user@example@example.com")).toBe(false); // Multiple @ symbols
    expect(isEmail("user name@example.com")).toBe(false); // Space in local part
    expect(isEmail("user@exam ple.com")).toBe(false); // Space in domain
  });
});
