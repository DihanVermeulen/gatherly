import type { Gift, GiftFilters, GiftSortField, GiftSortDir } from "types/gift";

export function filterGifts(gifts: Gift[], filters: GiftFilters): Gift[] {
  return gifts.filter((g) => {
    if (filters.recipient && !g.recipient.toLowerCase().includes(filters.recipient.toLowerCase()))
      return false;
    if (filters.occasion && !g.occasion.toLowerCase().includes(filters.occasion.toLowerCase()))
      return false;
    if (filters.status && g.status !== filters.status) return false;
    const budget = g.budget ?? 0;
    if (filters.budgetMin !== "" && budget < Number(filters.budgetMin)) return false;
    if (filters.budgetMax !== "" && budget > Number(filters.budgetMax)) return false;
    return true;
  });
}

export function sortGifts(
  gifts: Gift[],
  field: GiftSortField,
  dir: GiftSortDir
): Gift[] {
  const arr = [...gifts];
  const mul = dir === "asc" ? 1 : -1;
  arr.sort((a, b) => {
    let aVal: string | number | null = null;
    let bVal: string | number | null = null;
    switch (field) {
      case "name":
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
        break;
      case "recipient":
        aVal = a.recipient.toLowerCase();
        bVal = b.recipient.toLowerCase();
        break;
      case "dueDate":
        aVal = a.dueDate;
        bVal = b.dueDate;
        break;
      case "budget":
        aVal = a.budget ?? -1;
        bVal = b.budget ?? -1;
        break;
      case "createdAt":
        aVal = a.createdAt;
        bVal = b.createdAt;
        break;
      default:
        return 0;
    }
    if (aVal === null && bVal === null) return 0;
    if (aVal === null) return 1;
    if (bVal === null) return -1;
    if (aVal < bVal) return -1 * mul;
    if (aVal > bVal) return 1 * mul;
    return 0;
  });
  return arr;
}
