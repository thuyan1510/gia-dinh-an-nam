import collection from "./poems-collection.json";

export type Poem = (typeof collection.poems)[number];
// IDs do not reuse favorites/deep links of the replaced poems.
export const poems: Poem[] = collection.poems;
export const poemCategories = [
  "Tất cả",
  ...new Set(poems.map((p) => p.category)),
];
