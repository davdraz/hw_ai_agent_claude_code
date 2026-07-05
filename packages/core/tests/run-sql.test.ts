import { describe, expect, it } from "vitest";
import { assertSelectOnly, UnsafeSqlError } from "../src/tools/run-sql.js";

describe("assertSelectOnly", () => {
  it("should allow a plain SELECT query", () => {
    expect(() => assertSelectOnly("SELECT name FROM products LIMIT 10")).not.toThrow();
  });

  it("should allow a SELECT query with a trailing semicolon", () => {
    expect(() => assertSelectOnly("SELECT name FROM products LIMIT 10;")).not.toThrow();
  });

  it("should reject an empty query", () => {
    expect(() => assertSelectOnly("   ")).toThrow(UnsafeSqlError);
  });

  it("should reject a query that is not a SELECT", () => {
    expect(() => assertSelectOnly("DELETE FROM products")).toThrow(UnsafeSqlError);
  });

  it("should reject stacked statements", () => {
    expect(() => assertSelectOnly("SELECT 1; DROP TABLE products;")).toThrow(UnsafeSqlError);
  });

  it("should reject a SELECT that contains a forbidden keyword", () => {
    expect(() => assertSelectOnly("SELECT * FROM products WHERE 1=1 INTO backup")).toThrow(
      UnsafeSqlError,
    );
  });

  it("should be case-insensitive when checking for SELECT", () => {
    expect(() => assertSelectOnly("select name from products limit 5")).not.toThrow();
  });
});
