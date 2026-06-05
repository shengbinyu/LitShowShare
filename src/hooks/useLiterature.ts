import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  literatureApi,
  categoryApi,
  tagApi,
  externalLinkApi,
  uploadApi,
} from '@/utils/api';
import type { Literature, ExternalLink, Category, Tag } from '@/utils/db';

// ============================================================
// Query Keys
// ============================================================

const keys = {
  literatures: ['literatures'] as const,
  literature: (id: string) => ['literatures', id] as const,
  categories: ['categories'] as const,
  tags: ['tags'] as const,
  externalLinks: (literatureId: string) =>
    ['externalLinks', literatureId] as const,
};

// ============================================================
// Query Hooks (reactive with React Query)
// ============================================================

/** Hook to get all literature records with real-time updates. */
export function useLiteratures(): Literature[] {
  const { data } = useQuery({
    queryKey: keys.literatures,
    queryFn: literatureApi.getAll,
  });
  return data ?? [];
}

/** Hook to get a single literature record by ID. */
export function useLiterature(id: string): Literature | undefined {
  const { data } = useQuery({
    queryKey: keys.literature(id),
    queryFn: () => literatureApi.getById(id),
    enabled: !!id,
  });
  return data;
}

/** Hook to get all external links for a specific literature record. */
export function useExternalLinks(literatureId: string): ExternalLink[] {
  const { data } = useQuery({
    queryKey: keys.externalLinks(literatureId),
    queryFn: () => externalLinkApi.getByLiterature(literatureId),
    enabled: !!literatureId,
  });
  return data ?? [];
}

/** Hook to get all categories with real-time updates. */
export function useCategories(): Category[] {
  const { data } = useQuery({
    queryKey: keys.categories,
    queryFn: categoryApi.getAll,
  });
  return data ?? [];
}

/** Hook to get all tags. */
export function useTags(): Tag[] {
  const { data } = useQuery({
    queryKey: keys.tags,
    queryFn: tagApi.getAll,
  });
  return data ?? [];
}

/** Hook to filter literature records by category. */
export function useLiteraturesByCategory(category: string): Literature[] {
  const literatures = useLiteratures();
  return literatures.filter((lit) => lit.category === category);
}

/** Hook to search literature records by a query string. */
export function useSearchLiteratures(query: string): Literature[] {
  const literatures = useLiteratures();
  if (!query || !query.trim()) return literatures;

  const lowerQuery = query.toLowerCase();
  return literatures.filter((lit) => {
    const searchFields = [
      lit.title,
      lit.abstract,
      ...lit.authors,
      ...lit.keywords,
    ];
    return searchFields.some((field) =>
      field?.toLowerCase().includes(lowerQuery),
    );
  });
}

// ============================================================
// Action Functions (imperative mutations)
// ============================================================

/** Add a new literature record to the database. */
export async function addLiterature(
  lit: Omit<Literature, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const result = await literatureApi.create(lit);
  return result.id;
}

/** Update an existing literature record. */
export async function updateLiterature(
  id: string,
  data: Partial<Literature>,
): Promise<void> {
  await literatureApi.update(id, data);
}

/** Delete a literature record and all its associated external links. */
export async function deleteLiterature(id: string): Promise<void> {
  await literatureApi.delete(id);
}

/** Add an external link to the database. */
export async function addExternalLink(
  link: Omit<ExternalLink, 'id'>,
): Promise<string> {
  const result = await externalLinkApi.create(link);
  return result.id;
}

/** Delete an external link by its ID. */
export async function deleteExternalLink(id: string): Promise<void> {
  await externalLinkApi.delete(id);
}

/** Batch import multiple literature records into the database. */
export async function importLiteratures(
  items: Omit<Literature, 'id' | 'createdAt' | 'updatedAt'>[],
): Promise<string[]> {
  const ids: string[] = [];
  for (const item of items) {
    const result = await literatureApi.create(item);
    ids.push(result.id);
  }
  return ids;
}

// ============================================================
// Category CRUD Functions
// ============================================================

/** Add a new category to the database. */
export async function addCategory(
  name: string,
  color: string,
  description: string = '',
): Promise<string> {
  const result = await categoryApi.create({ name, color, description });
  return result.id;
}

/** Update an existing category. */
export async function updateCategory(
  id: string,
  data: Partial<Category>,
): Promise<void> {
  await categoryApi.update(id, data);
}

/** Delete a category by ID. */
export async function deleteCategory(id: string): Promise<void> {
  await categoryApi.delete(id);
}

// ============================================================
// Tag CRUD Functions
// ============================================================

/** Add a new tag. */
export async function addTag(name: string): Promise<string> {
  const result = await tagApi.create(name);
  return result.id;
}

/** Delete a tag and remove it from all literature entries. */
export async function deleteTag(id: string): Promise<void> {
  await tagApi.delete(id);
}

/** Add a tag to a literature entry. */
export async function addTagToLiterature(
  literatureId: string,
  tagId: string,
): Promise<void> {
  await literatureApi.addTag(literatureId, tagId);
}

/** Remove a tag from a literature entry. */
export async function removeTagFromLiterature(
  literatureId: string,
  tagId: string,
): Promise<void> {
  await literatureApi.removeTag(literatureId, tagId);
}

// ============================================================
// Upload Functions
// ============================================================

/** Upload a PDF file and return the server path. */
export async function uploadPdf(
  file: File,
): Promise<{ path: string; fileName: string }> {
  return uploadApi.uploadPdf(file);
}

/** Get the full URL for a PDF file stored on the server. */
export function getPdfUrl(pdfPath: string): string {
  return uploadApi.getPdfUrl(pdfPath);
}

// ============================================================
// React Query Mutation Hooks (with automatic cache invalidation)
// ============================================================

/** Hook that provides literature mutations with cache invalidation. */
export function useLiteratureMutations() {
  const queryClient = useQueryClient();

  const invalidateLiteratures = () => {
    queryClient.invalidateQueries({ queryKey: keys.literatures });
  };

  const createMutation = useMutation({
    mutationFn: literatureApi.create,
    onSuccess: invalidateLiteratures,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Literature> }) =>
      literatureApi.update(id, data),
    onSuccess: (_data, variables) => {
      invalidateLiteratures();
      queryClient.invalidateQueries({ queryKey: keys.literature(variables.id) });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: literatureApi.delete,
    onSuccess: invalidateLiteratures,
  });

  const addTagMutation = useMutation({
    mutationFn: ({
      literatureId,
      tagId,
    }: {
      literatureId: string;
      tagId: string;
    }) => literatureApi.addTag(literatureId, tagId),
    onSuccess: (_data, variables) => {
      invalidateLiteratures();
      queryClient.invalidateQueries({
        queryKey: keys.literature(variables.literatureId),
      });
    },
  });

  const removeTagMutation = useMutation({
    mutationFn: ({
      literatureId,
      tagId,
    }: {
      literatureId: string;
      tagId: string;
    }) => literatureApi.removeTag(literatureId, tagId),
    onSuccess: (_data, variables) => {
      invalidateLiteratures();
      queryClient.invalidateQueries({
        queryKey: keys.literature(variables.literatureId),
      });
    },
  });

  return {
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    addTag: addTagMutation.mutateAsync,
    removeTag: removeTagMutation.mutateAsync,
  };
}

/** Hook that provides category mutations with cache invalidation. */
export function useCategoryMutations() {
  const queryClient = useQueryClient();

  const invalidateCategories = () => {
    queryClient.invalidateQueries({ queryKey: keys.categories });
  };

  const createMutation = useMutation({
    mutationFn: categoryApi.create,
    onSuccess: invalidateCategories,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Category> }) =>
      categoryApi.update(id, data),
    onSuccess: invalidateCategories,
  });

  const deleteMutation = useMutation({
    mutationFn: categoryApi.delete,
    onSuccess: invalidateCategories,
  });

  return {
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
  };
}

/** Hook that provides tag mutations with cache invalidation. */
export function useTagMutations() {
  const queryClient = useQueryClient();

  const invalidateTags = () => {
    queryClient.invalidateQueries({ queryKey: keys.tags });
  };

  const createMutation = useMutation({
    mutationFn: tagApi.create,
    onSuccess: () => {
      invalidateTags();
      queryClient.invalidateQueries({ queryKey: keys.literatures });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: tagApi.delete,
    onSuccess: () => {
      invalidateTags();
      queryClient.invalidateQueries({ queryKey: keys.literatures });
    },
  });

  return {
    create: createMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
  };
}

/** Hook that provides external link mutations with cache invalidation. */
export function useExternalLinkMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: externalLinkApi.create,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: keys.externalLinks(variables.literatureId),
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, literatureId }: { id: string; literatureId: string }) =>
      externalLinkApi.delete(id).then(() => literatureId),
    onSuccess: (literatureId) => {
      queryClient.invalidateQueries({
        queryKey: keys.externalLinks(literatureId),
      });
    },
  });

  return {
    create: createMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
  };
}
