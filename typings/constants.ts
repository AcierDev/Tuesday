import {
  ColumnTitles,
  ColumnTypes,
  ColumnVisibility,
  EmployeeNames,
  GenericColumnValue,
  ItemDesigns,
  ItemSizes,
  ItemStatus,
  RouterSettings,
} from "@/typings/types";

export const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const WORK_DAYS = DAYS_OF_WEEK.slice(0, 5);

export const COASTAL_COLORS: Record<number, { hex: string; name: string }> = {
  1: { hex: "#B0744A", name: "Santa Fe" },
  2: { hex: "#C18F6A", name: "Antique Brass" },
  3: { hex: "#D1AA8A", name: "Tan" },
  4: { hex: "#BEAF99", name: "Malta" },
  5: { hex: "#A9B4A5", name: "Bud" },
  6: { hex: "#92A099", name: "Pewter" },
  7: { hex: "#849290", name: "Oslo Gray" },
  8: { hex: "#6E7F83", name: "Sirocco" },
  10: { hex: "#77919D", name: "Gothic" },
  11: { hex: "#7C9DAD", name: "Gumbo" },
  12: { hex: "#567E8B", name: "Smalt Blue" },
  13: { hex: "#3E6974", name: "William" },
  14: { hex: "#194A51", name: "Blue Dianne" },
  15: { hex: "#1C424E", name: "Blue Dianne" },
  16: { hex: "#21394B", name: "Nile Blue" },
};

export const FADE_TO_FIVE_COLORS: Record<
  number,
  { hex: string; name: string }
> = {
  1: { hex: "#21394B", name: "Nile Blue" },
  2: { hex: "#1C424E", name: "Blue Dianne" },
  3: { hex: "#194A51", name: "Blue Dianne" },
  4: { hex: "#3E6974", name: "William" },
  5: { hex: "#567E8B", name: "Smalt Blue" },
  6: { hex: "#7C9DAD", name: "Gumbo" },
  7: { hex: "#77919D", name: "Gothic" },
  8: { hex: "#6E7F83", name: "Sirocco" },
  9: { hex: "#849290", name: "Oslo Gray" },
  10: { hex: "#92A099", name: "Pewter" },
  11: { hex: "#A9B4A5", name: "Bud" },
  12: { hex: "#92A099", name: "Pewter" },
  13: { hex: "#849290", name: "Oslo Gray" },
  14: { hex: "#6E7F83", name: "Sirocco" },
  15: { hex: "#77919D", name: "Gothic" },
  16: { hex: "#7C9DAD", name: "Gumbo" },
  17: { hex: "#567E8B", name: "Smalt Blue" },
  18: { hex: "#3E6974", name: "William" },
  19: { hex: "#194A51", name: "Blue Dianne" },
  20: { hex: "#1C424E", name: "Blue Dianne" },
  21: { hex: "#21394B", name: "Nile Blue" },
};

export const LAWYER_COLORS: Record<number, { hex: string; name: string }> = {
  1: { hex: "#C6CACA", name: "Santa Fe" },
  2: { hex: "#A0A5A7", name: "Antique Brass" },
  3: { hex: "#7F8486", name: "Tan" },
  8: { hex: "#6E7F83", name: "Sirocco" },
  10: { hex: "#77919D", name: "Gothic" },
  11: { hex: "#7C9DAD", name: "Gumbo" },
  12: { hex: "#567E8B", name: "Smalt Blue" },
  13: { hex: "#3E6974", name: "William" },
  14: { hex: "#194A51", name: "Blue Dianne" },
  15: { hex: "#1C424E", name: "Blue Dianne" },
  16: { hex: "#21394B", name: "Nile Blue" },
};

export const AMBER_COLORS: Record<number, { hex: string; name: string }> = {
  1: { hex: "#4F3426", name: "Saddle" },
  2: { hex: "#714531", name: "Old Copper" },
  3: { hex: "#824E37", name: "Ironstone" },
  4: { hex: "#92573D", name: "Potters Clay" },
  5: { hex: "#B46848", name: "Santa Fe" },
  6: { hex: "#AD7C68", name: "Coral Tree" },
  7: { hex: "#AA8778", name: "Sandrift" },
  8: { hex: "#A79187", name: "Sandrift" },
  9: { hex: "#A0A5A7", name: "Edward" },
  10: { hex: "#C0C3C4", name: "Silver Sand" },
  11: { hex: "#D0D2D3", name: "Quill Gray" },
  12: { hex: "#DFE1E2", name: "Bon Jour" },
  13: { hex: "#FFFFFF", name: "White" },
};

export const FOREST_COLORS: Record<number, { hex: string; name: string }> = {
  1: { hex: "#FFFFFF", name: "White" },
  2: { hex: "#E3E5E5", name: "Mercury" },
  3: { hex: "#C6CACA", name: "Pumice" },
  4: { hex: "#B3B8B9", name: "Bombay" },
  5: { hex: "#A0A5A7", name: "Edward" },
  6: { hex: "#A5ADA6", name: "Edward" },
  7: { hex: "#A9B4A5", name: "Bud" },
  8: { hex: "#7B8476", name: "Friar Gray" },
  9: { hex: "#4D5346", name: "Gray Asparagus" },
  10: { hex: "#414035", name: "Armadillo" },
  11: { hex: "#342D24", name: "Birch" },
  12: { hex: "#281A13", name: "Oil" },
  13: { hex: "#1A110D", name: "Crowshead" },
  14: { hex: "#000000", name: "Black" },
};

export const ELEMENTAL_COLORS: Record<number, { hex: string; name: string }> = {
  1: { hex: "#44484D", name: "Mako" },
  2: { hex: "#63686D", name: "Shuttle Gray" },
  3: { hex: "#72777C", name: "Pale Sky" },
  4: { hex: "#A0A5A7", name: "Edward" },
  5: { hex: "#B5B3A8", name: "Nomad" },
  6: { hex: "#CCC1AA", name: "Vanilla" },
  7: { hex: "#E4CEAC", name: "Pancho" },
  8: { hex: "#DCBD92", name: "Calico" },
  9: { hex: "#D2B084", name: "Tan" },
  10: { hex: "#C19763", name: "Twine" },
};

export const WINTER_COLORS: Record<number, { hex: string; name: string }> = {
  1: { hex: "#015D87", name: "Mako" },
  2: { hex: "#017ca7", name: "Shuttle Gray" },
  3: { hex: "#289ec4", name: "Pale Sky" },
  4: { hex: "#89c6df", name: "Edward" },
  5: { hex: "#b7dfe8", name: "Nomad" },
  6: { hex: "#89c6df", name: "Vanilla" },
  7: { hex: "#289ec4", name: "289ec4" },
  8: { hex: "#017ca7", name: "Calico" },
  9: { hex: "#015D87", name: "Tan" },
};

export const AUTUMN_COLORS: Record<number, { hex: string; name: string }> = {
  1: { hex: "#A82E33", name: "Mako" },
  2: { hex: "#C33A36", name: "Shuttle Gray" },
  3: { hex: "#E16F3E", name: "Pale Sky" },
  4: { hex: "#EC8430", name: "Edward" },
  5: { hex: "#F4A045", name: "Nomad" },
  6: { hex: "#EC8430", name: "Vanilla" },
  7: { hex: "#E16F3E", name: "289ec4" },
  8: { hex: "#C33A36", name: "Calico" },
  9: { hex: "#A82E33", name: "Tan" },
};

export const SAPHIRE_COLORS: Record<number, { hex: string; name: string }> = {
  1: { hex: "#D9ED92", name: "Mindaro" },
  2: { hex: "#99D98C", name: "Feijoa" },
  3: { hex: "#76C893", name: "De York" },
  4: { hex: "#52B69A", name: "Tradewind" },
  5: { hex: "#34A0A4", name: "Keppel" },
  6: { hex: "#168AAD", name: "Eastern Blue" },
  7: { hex: "#1A759F", name: "Matisse" },
  8: { hex: "#1E6091", name: "Matisse" },
  9: { hex: "#184E77", name: "Chathams Blue" },
};

export const SPECTRUM_COLORS: Record<number, { hex: string; name: string }> = {
  1: { hex: "#01717E", name: "Mindaro" },
  2: { hex: "#08808E", name: "Feijoa" },
  3: { hex: "#4DA6B2", name: "Feijoa" },
  4: { hex: "#7DC1CB", name: "De York" },
  5: { hex: "#A6D0D6", name: "Tradewind" },
  6: { hex: "#BEC1C3", name: "Keppel" },
  7: { hex: "#D4D8D7", name: "Eastern Blue" },
  8: { hex: "#BEC1C3", name: "Keppel" },
  9: { hex: "#BDB4D4", name: "Chathams Blue" },
  10: { hex: "#AFA5C7", name: "Matisse" },
  11: { hex: "#968DB8", name: "Matisse" },
  12: { hex: "#716998", name: "Chathams Blue" },
  13: { hex: "#4D426E", name: "Chathams Blue" },
};

export const ABYSS_COLORS: Record<number, { hex: string; name: string }> = {
  1: { hex: "#22394A", name: "Nile Blue" },
  2: { hex: "#3D5F72", name: "William" },
  3: { hex: "#4B7083", name: "Bismark" },
  4: { hex: "#5B8092", name: "Smalt Blue" },
  5: { hex: "#7C9DAD", name: "Gumbo" },
  6: { hex: "#9FB3B7", name: "Hit Gray" },
  7: { hex: "#B1BEBB", name: "Tower Gray" },
  8: { hex: "#C5C9C0", name: "Kangaroo" },
  9: { hex: "#EEE0CA", name: "Almond" },
  10: { hex: "#EFE5D3", name: "Parchment" },
  11: { hex: "#EEE0CA", name: "Almond" },
  12: { hex: "#C5C9C0", name: "Kangaroo" },
  13: { hex: "#B1BEBB", name: "Tower Gray" },
  14: { hex: "#9FB3B7", name: "Hit Gray" },
  15: { hex: "#7C9DAD", name: "Gumbo" },
  16: { hex: "#5B8092", name: "Smalt Blue" },
  17: { hex: "#4B7083", name: "Bismark" },
  18: { hex: "#3D5F72", name: "William" },
  19: { hex: "#22394A", name: "Nile Blue" },
};

export const MIRAGE_COLORS: Record<number, { hex: string; name: string }> = {
  1: { hex: "#708D9E", name: "Mindaro" },
  2: { hex: "#8095A0", name: "Feijoa" },
  3: { hex: "#80969D", name: "Feijoa" },
  4: { hex: "#90A0A6", name: "De York" },
  5: { hex: "#A6A69B", name: "Tradewind" },
  6: { hex: "#B1A290", name: "Keppel" },
  7: { hex: "#B3A491", name: "Eastern Blue" },
  8: { hex: "#A79582", name: "Matisse" },
  9: { hex: "#A18D7D", name: "Matisse" },
};

export const TIMBERLINE_COLORS: Record<number, { hex: string; name: string }> =
  {
    1: { hex: "#4F3426", name: "Saddle" },
    2: { hex: "#715243", name: "Tobacco Brown" },
    3: { hex: "#967A6A", name: "Almond Frost" },
    4: { hex: "#A58C7B", name: "Donkey Brown" },
    5: { hex: "#BBA595", name: "Thatch" },
    6: { hex: "#CBB9AB", name: "Vanilla" },
    7: { hex: "#D9CDC3", name: "Wafer" },
    8: { hex: "#CBB9AB", name: "Wafer" },
    9: { hex: "#BBA595", name: "Wafer" },
    10: { hex: "#A58C7B", name: "Wafer" },
    11: { hex: "#967A6A", name: "Wafer" },
    12: { hex: "#715243", name: "Wafer" },
    13: { hex: "#4F3426", name: "Wafer" },
  };

export const ALOE_COLORS: Record<number, { hex: string; name: string }> = {
  1: { hex: "#C6D5C9", name: "Sea Mist" },
  2: { hex: "#AAC2B3", name: "Spring Rain" },
  3: { hex: "#91AF9D", name: "Pewter" },
  4: { hex: "#7D9B89", name: "Spanish Green" },
  5: { hex: "#61826C", name: "Viridian Green" },
  6: { hex: "#4F6A56", name: "Finlandia" },
  7: { hex: "#3D5541", name: "Tom Thumb" },
};

export const AMETHYST_COLORS: Record<number, { hex: string; name: string }> = {
  1: { hex: "#b0d9e8", name: "Ocean Breeze" },
  2: { hex: "#80bfd7", name: "Aquarium Blue" },
  3: { hex: "#419ab7", name: "Cool Blue" },
  4: { hex: "#006985", name: "Deep Ocean" },
  5: { hex: "#6289c6", name: "Blue Lapis" },
  6: { hex: "#365496", name: "Twighlight Blue" },
  7: { hex: "#4e4e8c", name: "Scandenavian Blue" },
  8: { hex: "#413d6d", name: "Grape Gum" },
};

export const BRISKET_COLORS: Record<number, { hex: string; name: string }> = {
  1: { hex: "#F5E0BE", name: "Brisket 1" },
  2: { hex: "#E7BF95", name: "Brisket 2" },
  3: { hex: "#D99D6B", name: "Brisket 3" },
  4: { hex: "#CE8C68", name: "Brisket 4" },
  5: { hex: "#C37A65", name: "Brisket 5" },
  6: { hex: "#A46D67", name: "Brisket 6" },
  7: { hex: "#855F69", name: "Brisket 7" },
  8: { hex: "#76636F", name: "Brisket 8" },
  9: { hex: "#666775", name: "Brisket 9" },
  10: { hex: "#525E6D", name: "Brisket 10" },
  // 11: { hex: "#3E5565", name: "Brisket 11" },
  12: { hex: "#304758", name: "Brisket 12" },
  13: { hex: "#21394B", name: "Brisket 13" },
};

export const NEVADA_COLORS: Record<number, { hex: string; name: string }> = {
  1: { hex: "#F6EEDD", name: "Nevada 1" },
  2: { hex: "#EDD3B1", name: "Nevada 2" },
  3: { hex: "#E2A573", name: "Nevada 3" },
  4: { hex: "#D4743B", name: "Nevada 4" },
  5: { hex: "#BA5D32", name: "Nevada 5" },
  6: { hex: "#8D4628", name: "Nevada 6" },
  7: { hex: "#723B24", name: "Nevada 7" },
  8: { hex: "#573020", name: "Nevada 8" },
  9: { hex: "#41281B", name: "Nevada 9" },
  10: { hex: "#2B1F16", name: "Nevada 10" },
};

export const MINT_COLORS: Record<number, { hex: string; name: string }> = {
  1: { hex: "#0C6170", name: "Mint 1" },
  2: { hex: "#1D9497", name: "Blue Chill" },
  3: { hex: "#37BEB0", name: "Mint 3" },
  4: { hex: "#5ACDC4", name: "Downy" },
  5: { hex: "#81D9D4", name: "Bermuda" },
  6: { hex: "#ACE6E2", name: "Powder Blue" },
  7: { hex: "#DBF5F0", name: "Mint 7" },
  8: { hex: "#ACE6E2", name: "Powder Blue" },
  9: { hex: "#81D9D4", name: "Bermuda" },
  10: { hex: "#5ACDC4", name: "Downy" },
  11: { hex: "#37BEB0", name: "Mint 3" },
  12: { hex: "#1D9497", name: "Blue Chill" },
  13: { hex: "#0C6170", name: "Mint 1" },
};

export const DESIGN_COLORS: Record<
  ItemDesigns,
  Record<number, { hex: string; name: string }>
> = {
  [ItemDesigns.Coastal]: COASTAL_COLORS,
  [ItemDesigns.Striped_Coastal]: COASTAL_COLORS,
  [ItemDesigns.Tiled_Coastal]: COASTAL_COLORS,
  [ItemDesigns.Tidal]: LAWYER_COLORS,
  [ItemDesigns.Amber]: AMBER_COLORS,
  [ItemDesigns.Elemental]: ELEMENTAL_COLORS,
  [ItemDesigns.Sapphire]: SAPHIRE_COLORS,
  [ItemDesigns.Timberline]: TIMBERLINE_COLORS,
  [ItemDesigns.Striped_Timberline]: TIMBERLINE_COLORS,
  [ItemDesigns.Tiled_Timberline]: TIMBERLINE_COLORS,
  [ItemDesigns.Aloe]: ALOE_COLORS,
  [ItemDesigns.Oceanic_Harmony]: FADE_TO_FIVE_COLORS,
  [ItemDesigns.Striped_Oceanic_Harmony]: FADE_TO_FIVE_COLORS,
  [ItemDesigns.Tiled_Oceanic_Harmony]: FADE_TO_FIVE_COLORS,
  [ItemDesigns.Winter]: WINTER_COLORS,
  [ItemDesigns.Forest]: FOREST_COLORS,
  [ItemDesigns.Autumn]: AUTUMN_COLORS,
  [ItemDesigns.Mirage]: MIRAGE_COLORS,
  [ItemDesigns.Spectrum]: SPECTRUM_COLORS,
  [ItemDesigns.Abyss]: ABYSS_COLORS,
  [ItemDesigns.Amethyst]: AMETHYST_COLORS,
  [ItemDesigns.Brisket]: BRISKET_COLORS,
  [ItemDesigns.Nevada]: NEVADA_COLORS,
  [ItemDesigns.Mint]: MINT_COLORS,
};

export const DESIGN_COLOR_NAMES: Record<ItemDesigns, (number | string)[]> = {
  [ItemDesigns.Coastal]: [1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16],
  [ItemDesigns.Striped_Coastal]: [
    1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16,
  ],
  [ItemDesigns.Tiled_Coastal]: [
    1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16,
  ],
  [ItemDesigns.Tidal]: [8, 10, 11, 12, 13, 14, 15, 16, "L1", "L2", "L3"],
  [ItemDesigns.Oceanic_Harmony]: [5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16],
  [ItemDesigns.Striped_Oceanic_Harmony]: [
    5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16,
  ],
  [ItemDesigns.Tiled_Oceanic_Harmony]: [5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16],
  [ItemDesigns.Timberline]: [1, 2, 3, 4, 5, 6, 7],
  [ItemDesigns.Striped_Timberline]: [1, 2, 3, 4, 5, 6, 7],
  [ItemDesigns.Tiled_Timberline]: [1, 2, 3, 4, 5, 6, 7],
  [ItemDesigns.Aloe]: [1, 2, 3, 4, 5, 6, 7],
  [ItemDesigns.Amber]: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
  [ItemDesigns.Sapphire]: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  [ItemDesigns.Forest]: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
  [ItemDesigns.Abyss]: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  [ItemDesigns.Autumn]: [1, 2, 3, 4, 5],
  [ItemDesigns.Winter]: [1, 2, 3, 4, 5],
  [ItemDesigns.Elemental]: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  [ItemDesigns.Spectrum]: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  [ItemDesigns.Mirage]: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  [ItemDesigns.Amethyst]: [1, 2, 3, 4, 5, 6, 7, 8],
  [ItemDesigns.Brisket]: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  [ItemDesigns.Nevada]: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  [ItemDesigns.Mint]: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
};

export const SIZE_MULTIPLIERS: Record<ItemSizes, number> = {
  [ItemSizes.Fourteen_By_Seven]: 14 * 7,
  [ItemSizes.Sixteen_By_Six]: 16 * 6,
  [ItemSizes.Sixteen_By_Ten]: 16 * 10,
  [ItemSizes.Twenty_By_Ten]: 20 * 10,
  [ItemSizes.TwentyFour_By_Ten]: 24 * 10,
  [ItemSizes.Twenty_By_Twelve]: 20 * 12,
  [ItemSizes.TwentyFour_By_Twelve]: 24 * 12,
  [ItemSizes.TwentyEight_By_Twelve]: 28 * 12,
  [ItemSizes.TwentyEight_By_Sixteen]: 28 * 16,
  [ItemSizes.ThirtyTwo_By_Sixteen]: 32 * 16,
  [ItemSizes.ThirtySix_By_Sixteen]: 36 * 16,
};

export const BOX_COLORS: Record<
  ItemSizes,
  {
    color: string;
    count: number;
    hardwareBag: string;
    mountingRail: string;
  }
> = {
  [ItemSizes.Fourteen_By_Seven]: {
    color: "Orange",
    count: 1,
    hardwareBag: "5 black screws, 2 anchors + 2 bolts",
    mountingRail: '16", 18" or 20"',
  },
  [ItemSizes.Sixteen_By_Six]: {
    color: "Orange",
    count: 1,
    hardwareBag: "5 black screws, 2 anchors + 2 bolts",
    mountingRail: '16", 18" or 20"',
  },
  [ItemSizes.Sixteen_By_Ten]: {
    color: "Green",
    count: 1,
    hardwareBag: "10 black screws, 2 anchors + 2 bolts",
    mountingRail: '48"',
  },
  [ItemSizes.Twenty_By_Ten]: {
    color: "Green",
    count: 1,
    hardwareBag: "13 black screws, 3 anchors + 3 bolts",
    mountingRail: '48"',
  },
  [ItemSizes.TwentyFour_By_Ten]: {
    color: "Green",
    count: 1,
    hardwareBag: "15 black screws, 3 anchors + 3 bolts",
    mountingRail: '48"',
  },
  [ItemSizes.Twenty_By_Twelve]: {
    color: "Green Plus",
    count: 1,
    hardwareBag: "15 black screws, 3 anchors + 3 bolts",
    mountingRail: '48"',
  },
  [ItemSizes.TwentyFour_By_Twelve]: {
    color: "Blue and Green",
    count: 2,
    hardwareBag: "13 black screws, 5 anchors + 5 bolts",
    mountingRail: '48" + 30"',
  },
  [ItemSizes.TwentyEight_By_Twelve]: {
    color: "Purple",
    count: 3,
    hardwareBag: "13 black screws, 5 anchors + 5 bolts",
    mountingRail: '48" + 30"',
  },
  [ItemSizes.TwentyEight_By_Sixteen]: {
    color: "Purple",
    count: 3,
    hardwareBag: "13 black screws, 5 anchors + 5 bolts",
    mountingRail: '48" + 30"',
  },
  [ItemSizes.ThirtyTwo_By_Sixteen]: {
    color: "Purple",
    count: 4,
    hardwareBag: "20 black screws, 7 anchors + 7 bolts",
    mountingRail: '48"',
  },
  [ItemSizes.ThirtySix_By_Sixteen]: {
    color: "Purple",
    count: 4,
    hardwareBag: "20 black screws, 7 anchors + 7 bolts",
    mountingRail: '48"',
  },
};

export const backboardData = {
  [ItemSizes.Fourteen_By_Seven]: {
    panels: 1,
    instructions:
      '1x Using an uncut backboard, cut off as little as possible on the sides when adding the angle. H: 18 5/16"',
    width: 14,
    height: 18.3125,
    blankSize: 20,
  },
  [ItemSizes.Sixteen_By_Six]: {
    panels: 1,
    instructions:
      '1x Using an uncut backboard, cut off as little as possible on the sides when adding the angle. H: 18 5/16"',
    width: 16,
    height: 18.3125,
    blankSize: 20,
  },
  [ItemSizes.Sixteen_By_Ten]: {
    panels: 1,
    instructions:
      '1x Using an uncut backboard, cut off as little as possible on the sides when adding the angle.\nCut the H: 30 ¾"\nCut it in half with a straight cut (~24 ¼")',
    width: 16,
    height: 30.75,
    blankSize: 32,
  },
  [ItemSizes.Twenty_By_Ten]: {
    panels: 2,
    instructions: 'Panel 1: H: 30 ½" W: 30 ¾"\nPanel 2: H: 30 ½" W: 27 ¾"',
    width: 58.5,
    height: 30.5,
    blankSize: 32,
  },
  [ItemSizes.TwentyFour_By_Ten]: {
    panels: 2,
    instructions: '2x H: 30 ¾" W: 33 ¾"',
    width: 67.5,
    height: 30.75,
    blankSize: 32,
  },
  [ItemSizes.Twenty_By_Twelve]: {
    panels: 2,
    instructions: "2x H: 33 ¾ W: 33 ¾",
    width: 67.5,
    height: 33.75,
    blankSize: 32,
  },
  [ItemSizes.TwentyFour_By_Twelve]: {
    panels: 2,
    instructions: "2x H: 33 ¾ W: 33 ¾",
    width: 67.5,
    height: 33.75,
    blankSize: 36,
  },
  [ItemSizes.TwentyEight_By_Twelve]: {
    panels: 3,
    instructions: '3x H: 33 ¾ W: 27 ¾"',
    width: 83.25,
    height: 33.75,
    blankSize: 29,
  },
  [ItemSizes.TwentyEight_By_Sixteen]: {
    panels: 3,
    instructions: '3x H: 46 5/16" W: 27 ¾"',
    width: 83.25,
    height: 46.3125,
    blankSize: 29,
  },
  [ItemSizes.ThirtyTwo_By_Sixteen]: {
    panels: 4,
    instructions: '4x H: 46 5/16" W: 27 ¾"',
    width: 111,
    height: 46.3125,
    blankSize: 29,
  },
  [ItemSizes.ThirtySix_By_Sixteen]: {
    panels: 4,
    instructions: '4x H: 46 5/16" W: 27 ¾"',
    width: 111,
    height: 46.3125,
    blankSize: 29,
  },
};

export const ItemDesignImages: Record<ItemDesigns, string> = {
  [ItemDesigns.Coastal]: "/images/designs/coastal.webp?height=300&width=400",
  [ItemDesigns.Tidal]: "/images/designs/tidal.webp?height=300&width=400",
  [ItemDesigns.Oceanic_Harmony]:
    "/images/designs/ft5.webp?height=300&width=400",
  [ItemDesigns.Striped_Coastal]:
    "/images/designs/striped-coastal.webp?height=300&width=400",
  [ItemDesigns.Amber]: "/images/designs/amber.webp?height=300&width=400",
  [ItemDesigns.Sapphire]: "/images/designs/sapphire.webp?height=300&width=400",
  [ItemDesigns.Timberline]:
    "/images/designs/timberline.webp?height=300&width=400",
  [ItemDesigns.Winter]: "/images/designs/winter.webp?height=300&width=400",
  [ItemDesigns.Forest]: "/images/designs/forest.webp?height=300&width=400",
  [ItemDesigns.Autumn]: "/images/designs/autumn.webp?height=300&width=400",
  [ItemDesigns.Elemental]:
    "/images/designs/elemental.webp?height=300&width=400",
  [ItemDesigns.Abyss]: "/images/designs/abyss.webp?height=300&width=400",
  [ItemDesigns.Spectrum]: "/images/designs/spectrum.webp?height=300&width=400",
  [ItemDesigns.Aloe]: "/images/designs/aloe.webp?height=300&width=400",
  [ItemDesigns.Mirage]: "/images/designs/mirage.webp?height=300&width=400",
  [ItemDesigns.Tiled_Coastal]:
    "/images/designs/tiled-coastal.webp?height=300&width=400",
  [ItemDesigns.Striped_Oceanic_Harmony]:
    "/images/designs/striped-ft5.webp?height=300&width=400",
  [ItemDesigns.Tiled_Oceanic_Harmony]:
    "/images/designs/tiled-ft5.webp?height=300&width=400",
  [ItemDesigns.Striped_Timberline]:
    "/images/designs/striped-timberline.webp?height=300&width=400",
  [ItemDesigns.Tiled_Timberline]:
    "/images/designs/tiled-timberline.webp?height=300&width=400",
  [ItemDesigns.Amethyst]: "/images/designs/amethyst.webp?height=300&width=400",
  [ItemDesigns.Brisket]: "/images/designs/brisket.webp?height=300&width=400",
  [ItemDesigns.Nevada]: "/images/designs/nevada.webp?height=300&width=400",
  [ItemDesigns.Mint]: "/images/designs/mint.webp?height=300&width=400",
};

export const DesignBlends: Record<ItemDesigns, string[]> = {
  [ItemDesigns.Coastal]: Object.values(COASTAL_COLORS).map(
    (color) => color.hex
  ),
  [ItemDesigns.Striped_Coastal]: Object.values(COASTAL_COLORS).map(
    (color) => color.hex
  ),
  [ItemDesigns.Tiled_Coastal]: Object.values(COASTAL_COLORS).map(
    (color) => color.hex
  ),
  [ItemDesigns.Tidal]: Object.values(LAWYER_COLORS).map((color) => color.hex),
  [ItemDesigns.Oceanic_Harmony]: Object.values(FADE_TO_FIVE_COLORS).map(
    (color) => color.hex
  ),
  [ItemDesigns.Striped_Oceanic_Harmony]: Object.values(FADE_TO_FIVE_COLORS).map(
    (color) => color.hex
  ),
  [ItemDesigns.Tiled_Oceanic_Harmony]: Object.values(FADE_TO_FIVE_COLORS).map(
    (color) => color.hex
  ),
  [ItemDesigns.Timberline]: Object.values(TIMBERLINE_COLORS).map(
    (color) => color.hex
  ),
  [ItemDesigns.Striped_Timberline]: Object.values(TIMBERLINE_COLORS).map(
    (color) => color.hex
  ),
  [ItemDesigns.Tiled_Timberline]: Object.values(TIMBERLINE_COLORS).map(
    (color) => color.hex
  ),
  [ItemDesigns.Amber]: Object.values(AMBER_COLORS).map((color) => color.hex),
  [ItemDesigns.Sapphire]: Object.values(SAPHIRE_COLORS).map(
    (color) => color.hex
  ),
  [ItemDesigns.Winter]: Object.values(WINTER_COLORS).map((color) => color.hex),
  [ItemDesigns.Forest]: Object.values(FOREST_COLORS).map((color) => color.hex),
  [ItemDesigns.Autumn]: Object.values(AUTUMN_COLORS).map((color) => color.hex),
  [ItemDesigns.Elemental]: Object.values(ELEMENTAL_COLORS).map(
    (color) => color.hex
  ),
  [ItemDesigns.Abyss]: Object.values(ABYSS_COLORS).map((color) => color.hex),
  [ItemDesigns.Spectrum]: Object.values(SPECTRUM_COLORS).map(
    (color) => color.hex
  ),
  [ItemDesigns.Aloe]: Object.values(ALOE_COLORS).map((color) => color.hex),
  [ItemDesigns.Mirage]: Object.values(MIRAGE_COLORS).map((color) => color.hex),
  [ItemDesigns.Amethyst]: Object.values(AMETHYST_COLORS).map(
    (color) => color.hex
  ),
  [ItemDesigns.Brisket]: Object.values(BRISKET_COLORS).map(
    (color) => color.hex
  ),
  [ItemDesigns.Nevada]: Object.values(NEVADA_COLORS).map((color) => color.hex),
  [ItemDesigns.Mint]: Object.values(MINT_COLORS).map((color) => color.hex),
};

export const EMPLOYEE_INITIALS = ["AM", "BC", "AW", "BS", "TB"] as const;
export type EmployeeOption = (typeof EMPLOYEE_INITIALS)[number];
export const CREDIT_OPTIONS = ["AM", "BC", "AW"] as const;
export type CreditOption = (typeof CREDIT_OPTIONS)[number];

export const OPTION_IMAGES: Record<EmployeeOption, string> = {
  AM: "/images/pfp/alex.png",
  BC: "/images/pfp/chungus.jpeg",
  AW: "/images/pfp/akiva2-3.png",
  BS: "/images/pfp/bentzi.png",
  TB: "/images/pfp/stewie.png",
};

export const EMPLOYEE_MAP: Record<EmployeeOption, EmployeeNames> = {
  AM: EmployeeNames.Alex,
  BS: EmployeeNames.Bentzi,
  AW: EmployeeNames.Akiva,
  TB: EmployeeNames.Tyler,
};

export const INITIALS_MAP: Record<EmployeeNames, EmployeeOption> = {
  [EmployeeNames.Akiva]: "AW",
  [EmployeeNames.Alex]: "AM",
  [EmployeeNames.Bentzi]: "BS",
  [EmployeeNames.Tyler]: "TB",
};

export const CREDIT_COLORS: Record<EmployeeOption, string> = {
  AW: "bg-orange-500",
  AM: "bg-blue-500",
  BC: "bg-green-500",
  BS: "bg-red-500",
  TB: "bg-yellow-500",
};

export const STATUS_COLORS: Record<ItemStatus, string> = {
  [ItemStatus.New]: "gray-400", // Placeholder
  [ItemStatus.OnDeck]: "yellow-500",
  [ItemStatus.Wip]: "orange-600",
  [ItemStatus.Packaging]: "red-500",
  [ItemStatus.At_The_Door]: "lime-300",
  [ItemStatus.Done]: "green-600",
  [ItemStatus.Hidden]: "white/10",
};

export const STATUS_BORDER_COLORS: Record<ItemStatus, string> = {
  [ItemStatus.New]: "border-l-gray-400 dark:border-l-gray-500",
  [ItemStatus.OnDeck]: "border-l-yellow-500 dark:border-l-yellow-400",
  [ItemStatus.Wip]: "border-l-orange-600 dark:border-l-orange-600",
  [ItemStatus.Packaging]: "border-l-red-500 dark:border-l-red-500",
  [ItemStatus.At_The_Door]: "border-l-lime-300 dark:border-l-lime-500",
  [ItemStatus.Done]: "border-l-green-600 dark:border-l-green-500",
  [ItemStatus.Hidden]: "border-l-transparent dark:border-l-transparent",
};

export const DEFAULT_ROUTER_SETTINGS: RouterSettings = {
  slave: {
    pushTime: 1000,
    riserTime: 1000,
    ejectionTime: 1000,
    sensorDelayTime: 1000,
    analysisMode: false,
    flipperDelay: 300,
    flipperDuration: 500,
    flipperEnabled: true,
    servoAnalysisAngle: 10,
    servoIdleAngle: 80,
    servoPassAngle: 10,
    servoEjectAngle: 180,
    servoEnabled: true,
  },
  ejection: {
    globalSettings: {
      ejectionEnabled: false,
      requireMultipleDefects: false,
      minTotalArea: 100,
      maxDefectsBeforeEject: 5,
      globalConfidenceThreshold: 0.5,
    },
    perClassSettings: {
      corner: { enabled: true, minConfidence: 0.5, minArea: 100, maxCount: 3 },
      crack: { enabled: true, minConfidence: 0.5, minArea: 100, maxCount: 3 },
      damage: { enabled: true, minConfidence: 0.5, minArea: 100, maxCount: 3 },
      edge: { enabled: true, minConfidence: 0.5, minArea: 100, maxCount: 3 },
      knot: { enabled: true, minConfidence: 0.5, minArea: 100, maxCount: 3 },
      router: { enabled: true, minConfidence: 0.5, minArea: 100, maxCount: 3 },
      side: { enabled: true, minConfidence: 0.5, minArea: 100, maxCount: 3 },
      tearout: { enabled: true, minConfidence: 0.5, minArea: 100, maxCount: 3 },
    },
    advancedSettings: {
      considerOverlap: false,
      regionOfInterest: {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        type: "roi" as const,
        id: "roi",
      },
      exclusionZones: [],
    },
  },
};

export const EMPTY_WEEK_SCHEDULE = {
  Sunday: [],
  Monday: [],
  Tuesday: [],
  Wednesday: [],
  Thursday: [],
  Friday: [],
  Saturday: [],
};

export const DEFAULT_COLUMN_VISIBILITY: ColumnVisibility = {
  [ColumnTitles.Customer_Name]: true,
  [ColumnTitles.Design]: true,
  [ColumnTitles.Size]: true,
  [ColumnTitles.Due]: true,
};

export const ITEM_DEFAULT_VALUES: Record<ColumnTitles, GenericColumnValue> = {
  [ColumnTitles.Customer_Name]: {
    columnName: ColumnTitles.Customer_Name,
    type: ColumnTypes.Text,
    text: "",
  },
  [ColumnTitles.Design]: {
    columnName: ColumnTitles.Design,
    type: ColumnTypes.Dropdown,
    text: "",
  },
  [ColumnTitles.Size]: {
    columnName: ColumnTitles.Size,
    type: ColumnTypes.Dropdown,
    text: "",
  },
  [ColumnTitles.Due]: {
    columnName: ColumnTitles.Due,
    type: ColumnTypes.Date,
    text: "",
  },
  [ColumnTitles.Painted]: {
    columnName: ColumnTitles.Painted,
    type: ColumnTypes.Dropdown,
    text: "",
  },
  [ColumnTitles.Backboard]: {
    columnName: ColumnTitles.Backboard,
    type: ColumnTypes.Dropdown,
    text: "",
  },
  [ColumnTitles.Glued]: {
    columnName: ColumnTitles.Glued,
    type: ColumnTypes.Dropdown,
    text: "",
  },
  [ColumnTitles.Packaging]: {
    columnName: ColumnTitles.Packaging,
    type: ColumnTypes.Dropdown,
    text: "",
  },
  [ColumnTitles.Boxes]: {
    columnName: ColumnTitles.Boxes,
    type: ColumnTypes.Dropdown,
    text: "",
  },
  [ColumnTitles.Notes]: {
    columnName: ColumnTitles.Notes,
    type: ColumnTypes.Dropdown,
    text: "",
  },
  [ColumnTitles.Rating]: {
    columnName: ColumnTitles.Rating,
    type: ColumnTypes.Dropdown,
    text: "",
  },
  [ColumnTitles.Labels]: {
    columnName: ColumnTitles.Labels,
    type: ColumnTypes.Text,
    text: "",
  },
  [ColumnTitles.Shipping]: {
    columnName: ColumnTitles.Shipping,
    type: ColumnTypes.Text,
    text: "",
  },
};
