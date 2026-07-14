import { getReadonlyPool } from "./pool.js";

// Szándékosan GROUP BY + COUNT, nem a HF-spec szó szerinti SELECT DISTINCT category:
// ugyanazt a disztinkt listát adja, plusz kategóriánkénti darabszámmal (README "Saját tool" szakasz).
export const LIST_CATEGORIES_SQL = `
  SELECT category, COUNT(*)::int AS count
  FROM products
  GROUP BY category
  ORDER BY category
`;

export interface CategorySummary {
  category: string;
  count: number;
}

export async function listCategories(): Promise<CategorySummary[]> {
  const result = await getReadonlyPool().query<CategorySummary>(LIST_CATEGORIES_SQL);
  return result.rows;
}
