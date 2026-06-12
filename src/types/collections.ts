export interface CollectionTypeStat {
  id: string;
  name: string;
  icon: string;
  color: string;
  count: number;
}

export interface CollectionSummary {
  id: string;
  name: string;
  description: string | null;
  isFavorite: boolean;
  itemCount: number;
  // ordered by count desc; first entry is the collection's most-used type
  types: CollectionTypeStat[];
}
