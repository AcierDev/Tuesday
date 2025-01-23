export type DayName =
  | "Sunday"
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday";

export type DailyTask = {
  id: string;
  done: boolean;
};

export type WeeklyTaskSchedule = {
  [day in DayName]: DailyTask[];
};

export type WeeklyScheduleData = {
  weekKey: string;
  schedule: WeeklyTaskSchedule;
};

export type Maybe<T> = T | null | undefined;

export type Board = {
  id: string;
  name: string;
  items_page: ItemsResponse;
  settings: Settings;
  weeklySchedules: any;
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
  visible: boolean;
  deleted: boolean;
  index: number;
  isScheduled?: boolean;
  shippingDetails?: ShippingDetails;
  tags?: {
    isDifficultCustomer?: boolean;
    isVertical?: boolean;
    hasCustomerMessage?: boolean;
  };
};

export type ShippingDetails = {
  name: string;
  company: string | null;
  street1: string;
  street2: string;
  street3: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string | null;
  residential: boolean;
  addressVerified: string;
  buyer_email?: string;
};

export type OrderTrackingInfo = {
  orderId: string;
  trackers: Tracker[];
};

export type Tracker = {
  id: string; // Unique identifier, begins with "trk_"
  object: "Tracker"; // Object type
  mode: "test" | "production"; // API mode
  tracking_code: string; // Tracking code provided by carrier
  status: TrackerStatus; // Current status of package
  status_detail: StatusDetail; // Additional status details
  signed_by: string | null; // Name of person who signed for package
  weight: number | null; // Weight in ounces
  est_delivery_date: string | null; // Estimated delivery date
  shipment_id: string | null; // Associated EasyPost Shipment ID
  carrier: string; // Name of carrier
  tracking_details: TrackingDetail[]; // Array of tracking events
  carrier_detail: CarrierDetail | null; // Additional carrier information
  public_url: string; // Public tracking URL
  fees: Fee[]; // Array of associated fees
  created_at: string; // Creation timestamp
  updated_at: string; // Last update timestamp
};

export type TrackerStatus =
  | "unknown"
  | "pre_transit"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "available_for_pickup"
  | "return_to_sender"
  | "failure"
  | "cancelled"
  | "error";

export type StatusDetail =
  | "address_correction"
  | "arrived_at_destination"
  | "arrived_at_facility"
  | "arrived_at_pickup_location"
  | "awaiting_information"
  | "cancelled"
  | "damaged"
  | "delayed"
  | "delivery_exception"
  | "departed_facility"
  | "departed_origin_facility"
  | "expired"
  | "failure"
  | "held"
  | "in_transit"
  | "label_created"
  | "lost"
  | "missorted"
  | "out_for_delivery"
  | "received_at_destination_facility"
  | "received_at_origin_facility"
  | "refused"
  | "return"
  | "status_update"
  | "transferred_to_destination_carrier"
  | "transit_exception"
  | "unknown"
  | "weather_delay";

export type TrackingDetail = {
  object: "TrackingDetail";
  message: string; // Summary of scan event
  description: string;
  status: TrackerStatus; // Status at time of scan
  status_detail: StatusDetail; // Additional status details
  datetime: string; // Timestamp of scan
  source: string; // Source of scan information
  carrier_code: string;
  tracking_location: TrackingLocation;
};

export type TrackingLocation = {
  object: "TrackingLocation";
  city: string | null; // City where scan occurred
  state: string | null; // State where scan occurred
  country: string | null; // Country where scan occurred
  zip: string | null; // Postal code where scan occurred
};

export type CarrierDetail = {
  object: "CarrierDetail";
  service: string | null; // Service level
  container_type: string | null; // Type of shipping container
  est_delivery_date_local: string | null; // Local estimated delivery date
  est_delivery_time_local: string | null; // Local estimated delivery time
  origin_location: string | null; // Origin location string
  origin_tracking_location: TrackingLocation | null;
  destination_location: string | null; // Destination location string
  destination_tracking_location: TrackingLocation | null;
  guaranteed_delivery_date: string | null;
  alternate_identifier: string | null;
  initial_delivery_attempt: string | null;
};

export type Fee = {
  object: "Fee";
  type: string;
  amount: string;
  charged: boolean;
  refunded: boolean;
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
  Shipping = "shipping",
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
  isAutomatronActive?: boolean;
  automatronRules?: AutomatronRule[];
};

export type AutomatronSettings = PartialRecord<
  ColumnTitles,
  PartialRecord<ProgressStatus | ItemDesigns | ItemSizes, ItemStatus>
>;

type PartialRecord<K extends keyof any, T> = {
  [P in K]?: T;
};

export type AutomatronRule = {
  field: ColumnTitles;
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

export interface PatternConfig {
  name: string;
  description?: string;
  timestamp: string;
}

export type ActivityType =
  | "update"
  | "create"
  | "delete"
  | "status_change"
  | "restore";

// First, let's define the change type to be used consistently
export type ActivityChange = {
  field: ColumnTitles | "status" | "deleted";
  oldValue?: string;
  newValue: string;
  isRestore?: boolean;
};

// Define the base activity interface first
export interface BaseActivity {
  id: string;
  itemId: string;
  timestamp: number;
  type: ActivityType;
  userName?: string;
  changes: ActivityChange[];
  metadata?: {
    customerName?: string;
    design?: string;
    size?: string;
  };
}

// Then define the full Activity interface extending BaseActivity
export interface Activity extends BaseActivity {
  _id: string;
  id: string;
}
