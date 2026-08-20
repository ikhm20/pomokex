export type CategoryId = "work" | "study" | "personal";

export interface Category {
  id: CategoryId;
  name: string;
  hex: string;
  chipOn: string;
  dot: string;
}

export const CATEGORIES: Category[] = [
  {
    id: "work",
    name: "Работа",
    hex: "#ff6b4a",
    chipOn: "border-ember-500/45 bg-ember-500/12 text-ember-400",
    dot: "bg-ember-500",
  },
  {
    id: "study",
    name: "Учёба",
    hex: "#5ba8ff",
    chipOn: "border-lagoon-500/45 bg-lagoon-500/12 text-lagoon-400",
    dot: "bg-lagoon-500",
  },
  {
    id: "personal",
    name: "Личное",
    hex: "#3ecf9a",
    chipOn: "border-mint-500/45 bg-mint-500/12 text-mint-400",
    dot: "bg-mint-500",
  },
];

export const CAT_BY_ID: Record<CategoryId, Category> = {
  work: CATEGORIES[0],
  study: CATEGORIES[1],
  personal: CATEGORIES[2],
};

export function isCategoryId(v: unknown): v is CategoryId {
  return v === "work" || v === "study" || v === "personal";
}
