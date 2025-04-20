/**
 * Extracts the model name from a model slug
 * Format of slug is typically provider:model (e.g., openai:gpt-4o-mini)
 *
 * @param slug The model slug to extract from
 * @returns The extracted model name, or the original slug if extraction fails
 */
export const extractModelFromSlug = (slug: string): string => {
  if (!slug) return "AI";
  const parts = slug.split(":");
  return parts.length > 1 ? parts[1] : slug;
};
