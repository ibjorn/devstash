export interface ItemTypeNavItem {
  id: string;
  // pluralized for display, e.g. "Snippets"; slug is its lowercase form for /items/[slug]
  name: string;
  slug: string;
  icon: string;
  color: string;
  count: number;
  // Pro-only system types (File, Image) get a PRO badge in the sidebar
  isPro: boolean;
}

export interface ItemTypeSummary {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface ItemSummary {
  id: string;
  title: string;
  description: string | null;
  isFavorite: boolean;
  isPinned: boolean;
  createdAt: Date;
  type: ItemTypeSummary;
  tags: string[];
}
