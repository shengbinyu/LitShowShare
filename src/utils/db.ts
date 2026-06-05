// ============================================================
// Model Definitions
// ============================================================

/** Literature record representing an academic paper or article. */
export interface Literature {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  keywords: string[];
  publishDate: string;
  category: string | null;
  doi: string;
  journal: string;
  volume: string;
  number: string;
  pages: string;
  publisher: string;
  sourceFormat: 'ris' | 'bibtex' | 'manual';
  pdfPath: string;
  pdfFileName: string;
  cloudLink: string;
  tagIds: string[];
  createdAt: string;
  updatedAt: string;
}

/** External link attached to a literature record. */
export interface ExternalLink {
  id: string;
  literatureId: string;
  url: string;
  label: string;
  isValid: boolean;
  lastChecked: string;
}

/** Category for classifying literature entries. */
export interface Category {
  id: string;
  name: string;
  color: string;
  description: string;
}

/** Tag for flexible labeling of literature entries. */
export interface Tag {
  id: string;
  name: string;
}

/** Special value for filtering uncategorized literature */
export const UNCATEGORY_VALUE = '__uncategorized__';
