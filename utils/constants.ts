import { ItemDesigns, ItemSizes } from '@/typings/types'

export const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const COASTAL_COLORS: Record<number, { hex: string; name: string }> = {
  1: { hex: '#B0744A', name: 'Santa Fe' },
  2: { hex: '#C18F6A', name: 'Antique Brass' },
  3: { hex: '#D1AA8A', name: 'Tan' },
  4: { hex: '#BEAF99', name: 'Malta' },
  5: { hex: '#A9B4A5', name: 'Bud' },
  6: { hex: '#92A099', name: 'Pewter' },
  7: { hex: '#849290', name: 'Oslo Gray' },
  8: { hex: '#6E7F83', name: 'Sirocco' },
  10: { hex: '#77919D', name: 'Gothic' },
  11: { hex: '#7C9DAD', name: 'Gumbo' },
  12: { hex: '#567E8B', name: 'Smalt Blue' },
  13: { hex: '#3E6974', name: 'William' },
  14: { hex: '#194A51', name: 'Blue Dianne' },
  15: { hex: '#1C424E', name: 'Blue Dianne' },
  16: { hex: '#21394B', name: 'Nile Blue' },
};

export const AMBER_COLORS: Record<number, { hex: string; name: string }> = {
  1: { hex: '#4F3426', name: 'Saddle' },
  2: { hex: '#714531', name: 'Old Copper' },
  3: { hex: '#824E37', name: 'Ironstone' },
  4: { hex: '#92573D', name: 'Potters Clay' },
  5: { hex: '#B46848', name: 'Santa Fe' },
  6: { hex: '#AD7C68', name: 'Coral Tree' },
  7: { hex: '#AA8778', name: 'Sandrift' },
  8: { hex: '#A79187', name: 'Sandrift' },
  9: { hex: '#A0A5A7', name: 'Edward' },
  10: { hex: '#C0C3C4', name: 'Silver Sand' },
  11: { hex: '#D0D2D3', name: 'Quill Gray' },
  12: { hex: '#DFE1E2', name: 'Bon Jour' },
  13: { hex: '#FFFFFF', name: 'White' },
};

export const ELEMENTAL_COLORS: Record<number, { hex: string; name: string }> = {
  1: { hex: '#44484D', name: 'Mako' },
  2: { hex: '#63686D', name: 'Shuttle Gray' },
  3: { hex: '#72777C', name: 'Pale Sky' },
  4: { hex: '#A0A5A7', name: 'Edward' },
  5: { hex: '#B5B3A8', name: 'Nomad' },
  6: { hex: '#CCC1AA', name: 'Vanilla' },
  7: { hex: '#E4CEAC', name: 'Pancho' },
  8: { hex: '#DCBD92', name: 'Calico' },
  9: { hex: '#D2B084', name: 'Tan' },
  10: { hex: '#C19763', name: 'Twine' },
};

export const SAPHIRE_COLORS: Record<number, { hex: string; name: string }> = {
  1: { hex: '#D9ED92', name: 'Mindaro' },
  2: { hex: '#B5E48C', name: 'Feijoa' },
  3: { hex: '#99D98C', name: 'Feijoa' },
  4: { hex: '#76C893', name: 'De York' },
  5: { hex: '#52B69A', name: 'Tradewind' },
  6: { hex: '#34A0A4', name: 'Keppel' },
  7: { hex: '#168AAD', name: 'Eastern Blue' },
  8: { hex: '#1A759F', name: 'Matisse' },
  9: { hex: '#1E6091', name: 'Matisse' },
  10: { hex: '#184E77', name: 'Chathams Blue' },
};

export const TIMBERLINE_COLORS: Record<number, { hex: string; name: string }> = {
  1: { hex: '#4F3426', name: 'Saddle' },
  2: { hex: '#715243', name: 'Tobacco Brown' },
  3: { hex: '#967A6A', name: 'Almond Frost' },
  4: { hex: '#A58C7B', name: 'Donkey Brown' },
  5: { hex: '#BBA595', name: 'Thatch' },
  6: { hex: '#CBB9AB', name: 'Vanilla' },
  7: { hex: '#D9CDC3', name: 'Wafer' },
};

export const ALOE_COLORS: Record<number, { hex: string; name: string }> = {
  1: { hex: '#3D5541', name: 'Tom Thumb' },
  2: { hex: '#4F6A56', name: 'Finlandia' },
  3: { hex: '#61826C', name: 'Viridian Green' },
  4: { hex: '#7D9B89', name: 'Spanish Green' },
  5: { hex: '#91AF9D', name: 'Pewter' },
  6: { hex: '#AAC2B3', name: 'Spring Rain' },
  7: { hex: '#C6D5C9', name: 'Sea Mist' },
};

export const DESIGN_COLORS: Record<ItemDesigns, (number | string)[]> = {
  [ItemDesigns.Coastal]: [1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16],
  [ItemDesigns.Lawyer]: [8, 10, 11, 12, 13, 14, 15, 16, 'L1', 'L2', 'L3'],
  [ItemDesigns.Fade_To_Five]: [5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16],
  [ItemDesigns.Timberline]: [1, 2, 3, 4, 5, 6, 7],
  [ItemDesigns.Aloe]: [1, 2, 3, 4, 5, 6, 7],
  [ItemDesigns.Amber]: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
  [ItemDesigns.Saphire]: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  [ItemDesigns.Forest]: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
  [ItemDesigns.Abyss]: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  [ItemDesigns.Autumn]: [1, 2, 3, 4, 5],
  [ItemDesigns.Winter]: [1, 2, 3, 4, 5],
  [ItemDesigns.Elemental]: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  [ItemDesigns.Spectrum]: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
};

export const SIZE_MULTIPLIERS: Record<ItemSizes, number> = {
  [ItemSizes.Fourteen_By_Seven]: 14 * 7,
  [ItemSizes.Sixteen_By_Six]: 16 * 6,
  [ItemSizes.Sixteen_By_Ten]: 16 * 10,
  [ItemSizes.Nineteen_By_Ten]: 19 * 10,
  [ItemSizes.TwentyTwo_By_Ten]: 22 * 10,
  [ItemSizes.Nineteen_By_Eleven]: 19 * 11,
  [ItemSizes.TwentyTwo_By_Eleven]: 22 * 11,
  [ItemSizes.TwentySeven_By_Eleven]: 27 * 11,
  [ItemSizes.TwentySeven_By_Fifteen]: 27 * 15,
  [ItemSizes.ThirtyOne_By_Fifteen]: 31 * 15,
  [ItemSizes.ThirtySix_By_Fifteen]: 36 * 15,
};


export const BOX_COLORS: Record<ItemSizes, { 
  color: string; 
  count: number;
  hardwareBag: string;
  mountingRail: string;
}> = {
  [ItemSizes.Fourteen_By_Seven]: { 
    color: 'Orange', 
    count: 1, 
    hardwareBag: '5 black screws, 2 anchors + 2 bolts',
    mountingRail: '16", 18" or 20"'
  },
  [ItemSizes.Sixteen_By_Six]: { 
    color: 'Orange', 
    count: 1, 
    hardwareBag: '5 black screws, 2 anchors + 2 bolts',
    mountingRail: '16", 18" or 20"'
  },
  [ItemSizes.Sixteen_By_Ten]: { 
    color: 'Green', 
    count: 1, 
    hardwareBag: '10 black screws, 2 anchors + 2 bolts',
    mountingRail: '48"'
  },
  [ItemSizes.Nineteen_By_Ten]: { 
    color: 'Green', 
    count: 1, 
    hardwareBag: '13 black screws, 3 anchors + 3 bolts',
    mountingRail: '48"'
  },
  [ItemSizes.Nineteen_By_Eleven]: { 
    color: 'Green', 
    count: 1, 
    hardwareBag: '13 black screws, 3 anchors + 3 bolts',
    mountingRail: '48"'
  },
  [ItemSizes.TwentyTwo_By_Ten]: { 
    color: 'Green', 
    count: 1, 
    hardwareBag: '15 black screws, 3 anchors + 3 bolts',
    mountingRail: '48"'
  },
  [ItemSizes.TwentyTwo_By_Eleven]: { 
    color: 'Green Plus', 
    count: 1, 
    hardwareBag: '15 black screws, 3 anchors + 3 bolts',
    mountingRail: '48"'
  },
  [ItemSizes.TwentySeven_By_Eleven]: { 
    color: 'Blue and Green', 
    count: 2, 
    hardwareBag: '13 black screws, 5 anchors + 5 bolts',
    mountingRail: '48" + 30"'
  },
  [ItemSizes.TwentySeven_By_Fifteen]: { 
    color: 'Purple', 
    count: 3, 
    hardwareBag: '13 black screws, 5 anchors + 5 bolts',
    mountingRail: '48" + 30"'
  },
  [ItemSizes.ThirtySix_By_Fifteen]: { 
    color: 'Purple', 
    count: 4, 
    hardwareBag: '20 black screws, 7 anchors + 7 bolts',
    mountingRail: '48"'
  },
};

export const backboardData = {
  [ItemSizes.Fourteen_By_Seven]: { panels: 1, instructions: "1x Using an uncut backboard, cut off as little as possible on the sides when adding the angle. H: 18 5/16\"", width: 14, height: 18.3125, blankSize: 20 },
  [ItemSizes.Sixteen_By_Six]: { panels: 1, instructions: "1x Using an uncut backboard, cut off as little as possible on the sides when adding the angle. H: 18 5/16\"", width: 16, height: 18.3125, blankSize: 20 },
  [ItemSizes.Sixteen_By_Ten]: { panels: 1, instructions: "1x Using an uncut backboard, cut off as little as possible on the sides when adding the angle.\nCut the H: 30 ¾\"\nCut it in half with a straight cut (~24 ¼\")", width: 16, height: 30.75, blankSize: 32 },
  [ItemSizes.Nineteen_By_Ten]: { panels: 2, instructions: "Panel 1: H: 30 ½\" W: 30 ¾\"\nPanel 2: H: 30 ½\" W: 27 ¾\"", width: 58.5, height: 30.5, blankSize: 32 },
  [ItemSizes.TwentyTwo_By_Ten]: { panels: 2, instructions: "2x H: 30 ¾\" W: 33 ¾\"", width: 67.5, height: 30.75, blankSize: 32 },
  [ItemSizes.Nineteen_By_Eleven]: { panels: 2, instructions: "2x H: 33 ¾ W: 33 ¾", width: 67.5, height: 33.75, blankSize: 32 },
  [ItemSizes.TwentyTwo_By_Eleven]: { panels: 2, instructions: "2x H: 33 ¾ W: 33 ¾", width: 67.5, height: 33.75, blankSize: 36 },
  [ItemSizes.TwentySeven_By_Eleven]: { panels: 3, instructions: "3x H: 33 ¾ W: 27 ¾\"", width: 83.25, height: 33.75, blankSize: 29 },
  [ItemSizes.TwentySeven_By_Fifteen]: { panels: 3, instructions: "3x H: 46 5/16\" W: 27 ¾\"", width: 83.25, height: 46.3125, blankSize: 29 },
  [ItemSizes.ThirtyOne_By_Fifteen]: { panels: 4, instructions: "4x H: 46 5/16\" W: 27 ¾\"", width: 111, height: 46.3125, blankSize: 29 },
  [ItemSizes.ThirtySix_By_Fifteen]: { panels: 4, instructions: "4x H: 46 5/16\" W: 27 ¾\"", width: 111, height: 46.3125, blankSize: 29 },
}