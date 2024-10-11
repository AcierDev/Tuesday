import { WeeklySchedules } from "@/components/weekly-schedule/UseWeeklySchedule";
import { CuttingData } from "./interfaces";

export type Maybe<T> = T | null | undefined;

export type Board = {
  id: string;
  name: string;
  items_page: ItemsResponse;
  settings: Settings;
  weeklySchedules: WeeklySchedules;
};

export type Group = {
  id: string;
  title: string;
  items: Item[];
};

export type Column = {
  title: ColumnTitles;
  type: ColumnTypes;
  id: string;
  options?: columnOptions;
};

export type ItemsResponse = {
  cursor: string;
  items: Item[];
};

export type Item = {
  id: string;
  values: ColumnValue[];
  createdAt: number;
  completedAt?: number;
  status: ItemStatus;
  vertical?: boolean;
  visible: boolean;
  deleted: boolean;
  isScheduled?: boolean;
  shippingDetails: Address;
};

export type ColumnValue = ColorColumnValue | GenericColumnValue;

export type ColorColumnValue = {
  text?: ItemDesigns;
  type: ColumnTypes.Dropdown;
  columnName: ColumnTitles.Design;
  lastModifiedTimestamp?: number;
  credit?: EmployeeNames[];
};

export type GenericColumnValue = {
  text?: string;
  type: ColumnTypes;
  columnName: ColumnTitles;
  lastModifiedTimestamp?: number;
  credit?: EmployeeNames[];
};

export enum EmployeeNames {
  Alex = "Alex Morrell",
  Ben = "Ben Clark",
  Bentzi = "Ben Steele",
  Akiva = "Akiva Weil",
  Paris = "Paris Carver",
  Dylan = "Dylan Carver",
  Tyler = "Tyler Blancett"
}

export enum ItemStatus {
  Hidden = "Hidden",
  New = "New",
  OnDeck = "On Deck",
  Wip = "Wip",
  Packaging = "Packaging",
  At_The_Door = "At The Door",
  Done = "Done",
}

export enum ProgressStatus {
  Done = "Done",
  Working_On_It = "Working on it",
  Stuck = "Stuck",
  Didnt_Start = "Didn't Start",
}

export enum ColumnTitles {
  Customer_Name = "Customer Name",
  Design = "Design",
  Size = "Size",
  Due = "Due Date",
  Painted = "Painted",
  Backboard = "Backboard",
  Glued = "Glued",
  Packaging = "Packaging",
  Boxes = "Boxes",
  Notes = "Notes",
  Rating = "Rating",
  Labels = "Labels",
}

export enum ColumnTypes {
  Dropdown = "dropdown",
  Text = "text",
  Number = "number",
  Date = "date",
}

export enum ItemDesigns {
  Coastal = "Coastal",
  Striped_Coastal = "Striped Coastal",
  Tiled_Coastal = "Tiled Coastal",
  Lawyer = "Lawyer",
  Fade_To_Five = "Fade To Five",
  Striped_Fade_To_Five = "Striped Fade To Five",
  Tiled_Fade_To_Five = "Tiled Fade To Five",
  Timberline = "Timberline",
  Striped_Timberline = "Striped Timberline",
  Tiled_Timberline = "Tiled Timberline",
  Amber = "Amber",
  Sapphire = "Sapphire",
  Winter = "Winter",
  Forest = "Forest",
  Autumn = "Autumn",
  Elemental = "Elemental",
  Abyss = "Abyss",
  Spectrum = "Spectrum",
  Aloe = "Aloe",
  Mirage = "Mirage",
}

export enum ItemSizes {
  Fourteen_By_Seven = "14 x 7",
  Sixteen_By_Six = "16 x 6",
  Sixteen_By_Ten = "16 x 10",
  Nineteen_By_Ten = "19 x 10",
  TwentyTwo_By_Ten = "22 x 10",
  Nineteen_By_Eleven = "19 x 11",
  TwentyTwo_By_Eleven = "22 x 11",
  TwentySeven_By_Eleven = "27 x 11",
  TwentySeven_By_Fifteen = "27 x 15",
  ThirtyOne_By_Fifteen = "31 x 15",
  ThirtySix_By_Fifteen = "36 x 15",
}

export type BoardConfig = {
  columns: Record<ColumnTitles, Column & { requiredForNewItem: boolean }>;
  visibleColumnOverrides: Partial<Record<ItemStatus, ColumnTitles[]>>;
};

export type PaintConfig = Record<ItemDesigns, string[]>;

export enum GroupFilters {
  Status = "Status",
  Design = "Design",
}

export type columnOptions = ProgressStatus[] | ItemDesigns[] | ItemSizes[];

export type ItemSortFuncs = Record<
  ColumnTitles,
  (items: Item[], ascending: boolean) => Item[]
>;

export type Settings = {
  automatronSettings: AutomatronSettings;
};

export type AutomatronSettings = PartialRecord<
  ColumnTitles,
  PartialRecord<ProgressStatus | ItemDesigns | ItemSizes, ItemStatus>
>;

type PartialRecord<K extends keyof any, T> = {
  [P in K]?: T;
};

export type AutomatronRule = {
  id: string
  field: string
  value: string
  newStatus: string
}

export type ColumnVisibility = {
  [key: string]: {
    [key: string]: boolean
  }
}

export type StatusColors = {
  [key: string]: string
}

export type OrderSettings = {
  automatronRules: AutomatronRule[]
  isAutomatronActive: boolean
  columnVisibility: ColumnVisibility
  dueBadgeDays: number
  statusColors: StatusColors
  groupingField: string
  showCompletedOrders: boolean
  showSortingIcons: boolean
  recentEditHours?: number
}

export type ShippingStatus = 'unshipped' | 'pre_transit' | 'in_transit' | 'delivered'

export type BackboardRequirement = Record<ItemSizes, number>;