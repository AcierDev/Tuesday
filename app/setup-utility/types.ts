export type DesignCategory = "geometric" | "striped" | "tiled";

export interface Design {
  id: string;
  name: string;
  imageUrl: string;
  colors: string[];
  category: DesignCategory;
}

export interface ColorDistribution {
  totalPieces: number;
  colorCount: number;
  distribution: { color: string; count: number }[];
  adjustmentCount: number;
  adjustmentType: "add" | "subtract";
}
