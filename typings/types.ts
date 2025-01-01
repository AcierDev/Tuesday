export type DayName =
  | "Sunday"
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday";

export type DaySchedule = {
  [day in DayName]: { id: string; done: boolean }[];
};

export type WeeklySchedules = {
  [weekKey: string]: DaySchedule;
};

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
  Tyler = "Tyler Blancett",
}

export enum ItemStatus {
  Hidden = "Hidden",
  New = "New",
  OnDeck = "On Deck",
  Wip = "Wip",
  Packaging = "Packaging",
  Shipping = "Shipping",
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
  Coastal = "Coastal Dream",
  Striped_Coastal = "Striped Coastal Dream",
  Tiled_Coastal = "Tiled Coastal Dream",
  Tidal = "Tidal",
  Oceanic_Harmony = "Oceanic Harmony",
  Striped_Oceanic_Harmony = "Striped Oceanic Harmony",
  Tiled_Oceanic_Harmony = "Tiled Oceanic Harmony",
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
  Twenty_By_Ten = "20 x 10",
  TwentyFour_By_Ten = "24 x 10",
  Twenty_By_Twelve = "20 x 12",
  TwentyFour_By_Twelve = "24 x 12",
  TwentyEight_By_Twelve = "28 x 12",
  TwentyEight_By_Sixteen = "28 x 16",
  ThirtyTwo_By_Sixteen = "32 x 16",
  ThirtySix_By_Sixteen = "36 x 16",
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
  id: string;
  field: string;
  value: string;
  newStatus: string;
};

export type ColumnVisibilitySettings = {
  [K in ItemStatus]: ColumnVisibility;
};

export type ColumnVisibility = Partial<Record<ColumnTitles, boolean>>;

export type StatusColors = {
  [key: string]: string;
};

export type OrderSettings = {
  automatronRules: AutomatronRule[];
  isAutomatronActive: boolean;
  columnVisibility: ColumnVisibilitySettings;
  dueBadgeDays: number;
  statusColors: StatusColors;
  groupingField: string;
  showCompletedOrders: boolean;
  showSortingIcons: boolean;
  recentEditHours?: number;
  idleTimeout: number;
  isIdleTimeoutEnabled: boolean;
  showIdentificationMenuForAdmins: boolean;
};

export type ShippingStatus =
  | "unshipped"
  | "pre_transit"
  | "in_transit"
  | "delivered";

export type BackboardRequirement = Record<ItemSizes, number>;

export type InventoryItem = {
  _id: number;
  name: string;
  quantity: number;
  restockQuantity: number;
  countType: string;
  countFrequency: CountFrequency;
  category: InventoryCategory;
  countHistory: InventoryCount[];
};

export type InventoryCount = {
  quantity: number;
  timestamp: Date;
};

export enum CountFrequency {
  Daily = "Daily",
  Weekly = "Weekly",
  Monthly = "Monthly",
}

export enum InventoryCategory {
  Operations = "Operations",
  Woodworking = "Woodworking",
  Assembly = "Assembly",
  Packaging = "Packaging",
  Misc = "Miscellaneous",
}

export enum LockedInventory {
  Boards = "Uncut Boards",
}

export interface SystemState {
  sensor1: IODevice;
  piston: IODevice;
  ejector: IODevice;
  riser: IODevice;
  lastUpdate: Date;
  isProcessing: boolean;
  lastPhotoPath: string | null;
  deviceConnected: boolean;
  isCapturingImage: boolean;
  lastEjectionResult?: {
    didEject: boolean;
    reason: string;
    details: any;
  };
}

export interface IODevice {
  active: boolean;
  pin: number;
}

export type Alert = {
  id: string;
  timestamp: Date;
  level: "warning" | "error";
  message: string;
  acknowledged: boolean;
};

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

export interface ImageMetadata {
  type: "image";
  url?: string;
  filename?: string;
  mimeType?: string;
  timestamp: string;
  size?: number;
  captureSuccess: boolean;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: "info" | "warning" | "error";
  message: string;
  source?: string;
}

export interface FileInfo {
  original_filename: string;
  stored_locations: {
    count_based: string;
    defect_types: string[];
  };
}

export interface BoundingBox {
  0: number; // x1
  1: number; // y1
  2: number; // x2
  3: number; // y2
}

export interface Prediction {
  bbox: BoundingBox;
  class_name: string;
  confidence: number;
  detection_id: string;
}

export interface AnalysisResults {
  data: {
    file_info: FileInfo;
    predictions: Prediction[];
  };
  success: boolean;
  timestamp: string;
}

export type ClassName =
  | "corner"
  | "crack"
  | "damage"
  | "edge"
  | "knot"
  | "router"
  | "side"
  | "tearout";

export interface ValidationErrors {
  [key: string]: string;
}

export interface SlaveSettings {
  pushTime: number;
  riserTime: number;
  ejectionTime: number;
  sensorDelayTime: number;
  analysisMode: boolean;
}

export interface GlobalSettings {
  requireMultipleDefects: boolean;
  minTotalArea: number;
  maxDefectsBeforeEject: number;
}

export type PerClassSettings = {
  [className in ClassName]: {
    enabled: boolean;
    minConfidence: number;
    minArea: number;
    maxCount: number;
  };
};

export type AdvancedSettings = {
  considerOverlap: boolean;
  regionOfInterest: Region;
  exclusionZones: Region[];
};

export interface EjectionSettings {
  globalSettings: GlobalSettings;
  perClassSettings: PerClassSettings;
  advancedSettings: AdvancedSettings;
}

export interface RouterSettings {
  slave: SlaveSettings;
  ejection: EjectionSettings;
}

export type PresetSettings = "High" | "Medium" | "Low";

export type MachineState = "IDLE" | "MOVING" | "HOMING" | "ERROR";

export interface Position {
  x: number;
  y: number;
}

export interface MachineStatus {
  state: MachineState;
  position: Position;
  speed: number;
  accel: number;
  error?: string;
}

export interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
  type: "roi" | "exclusion";
  id: string;
}

export interface AnalysisImage {
  timestamp: string;
  imageData: string; // Base64 encoded image
  path: string;
}

export interface SlaveState {
  status: string;
  router_state: string;
  push_cylinder: "ON" | "OFF";
  riser_cylinder: "ON" | "OFF";
  ejection_cylinder: "ON" | "OFF";
  sensor1: "ON" | "OFF";
  analysisMode: boolean;
}

export interface ExtendedState extends SlaveState {
  lastUpdate: Date;
  currentImageUrl: string | null;
  currentImageMetadata: ImageMetadata | null;
  currentAnalysis: AnalysisResults | null;
  isCapturing: boolean;
  isProcessing: boolean;
  isAnalyzing: boolean;
  settings: RouterSettings;
  uptime: string;
  cpuUsage: number;
  memoryUsage: number;
  temperature: number;
  ejectionDecision: boolean | null;
  currentCycleStats?: CycleStats;
  dailyStats?: DailyStats;
}

export interface CycleStats {
  cycleId: string;
  timestamp: string;
  duration: number;
  analysisTime?: number;
  captureTime?: number;
  ejectionDecision?: boolean;
  ejectionReasons?: string[];
  predictions?: PredictionStats[];
  defectsFound?: number;
  totalDefectArea?: number;
  defectStats?: DefectTypeStats;
  error?: string;
}

export interface TimeStats {
  min: number;
  max: number;
  avg: number;
  total: number;
}

export interface DailyStats {
  date: string;
  totalCycles: number;
  successfulCycles: number;
  failedCycles: number;
  analysisTime: TimeStats;
  captureTime: TimeStats;
  cycleTime: TimeStats;
  totalEjections: number;
  totalDefectsFound: number;
  defectsByType: DefectTypeStats;
  errors: Array<{
    timestamp: string;
    message: string;
  }>;
  ejectionRate: number;
  successRate: number;
  peakActivityHour: number;
  cyclesByHour: number[];
}

export interface DefectStats {
  count: number;
  totalArea: number;
  minArea: number;
  maxArea: number;
  avgArea: number;
  minConfidence: number;
  maxConfidence: number;
  avgConfidence: number;
}

export interface DefectTypeStats {
  corner?: DefectStats;
  crack?: DefectStats;
  damage?: DefectStats;
  edge?: DefectStats;
  knot?: DefectStats;
  router?: DefectStats;
  side?: DefectStats;
  tearout?: DefectStats;
}

export interface PredictionStats {
  class_name: ClassName;
  confidence: number;
  bbox: BoundingBox;
  area: number;
}

export interface SortedItems {
  [key: string]: Array<{
    day: DayName;
    item: Item;
  }>;
}
