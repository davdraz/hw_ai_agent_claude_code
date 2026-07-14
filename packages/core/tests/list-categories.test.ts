import { describe, expect, it } from "vitest";
import { LIST_CATEGORIES_SQL } from "../src/tools/list-categories.js";
import { assertSelectOnly } from "../src/tools/run-sql.js";

describe("LIST_CATEGORIES_SQL", () => {
  it("should pass the same SELECT-only guard as run_sql (defense in depth)", () => {
    expect(() => assertSelectOnly(LIST_CATEGORIES_SQL)).not.toThrow();
  });

  it("should query the products table grouped by category", () => {
    expect(LIST_CATEGORIES_SQL).toContain("FROM products");
    expect(LIST_CATEGORIES_SQL).toContain("GROUP BY category");
  });
});
