import { fetchTemplates } from "../lib/api";
import { useAsync } from "./useAsync";
import type { Category, Template } from "../types/invitation";

const NONE: never[] = [];

/** Templates and their categories. Shared by Manage Templates and the Create page. */
export function useTemplates() {
  const { data, loading, error } = useAsync(fetchTemplates);
  return {
    loading, error,
    templates: (data?.templates ?? NONE) as Template[],
    categories: (data?.categories ?? NONE) as Category[],
  };
}
