import {
  BoardConfig,
  ColumnTitles,
  ColumnTypes,
  ItemDesigns,
  ItemSizes,
  ItemStatus,
  ProgressStatus,
} from "../typings/types";

export const boardConfig: BoardConfig = {
  columns: {
    "Customer Name": {
      title: ColumnTitles.Customer_Name,
      id: ColumnTitles.Customer_Name,
      type: ColumnTypes.Text,
      requiredForNewItem: true,
    },
    Design: {
      title: ColumnTitles.Design,
      id: ColumnTitles.Design,
      type: ColumnTypes.Dropdown,
      options: Object.values(ItemDesigns),
      requiredForNewItem: true,
    },
    Size: {
      title: ColumnTitles.Size,
      id: ColumnTitles.Size,
      type: ColumnTypes.Dropdown,
      options: Object.values(ItemSizes),
      requiredForNewItem: true,
    },
    Painted: {
      title: ColumnTitles.Painted,
      id: ColumnTitles.Painted,
      type: ColumnTypes.Dropdown,
      options: Object.values(ProgressStatus),
      requiredForNewItem: false,
    },
    Backboard: {
      title: ColumnTitles.Backboard,
      id: ColumnTitles.Backboard,
      type: ColumnTypes.Dropdown,
      options: Object.values(ProgressStatus),
      requiredForNewItem: false,
    },
    Glued: {
      title: ColumnTitles.Glued,
      id: ColumnTitles.Glued,
      type: ColumnTypes.Dropdown,
      options: Object.values(ProgressStatus),
      requiredForNewItem: false,
    },
    Packaging: {
      title: ColumnTitles.Packaging,
      id: ColumnTitles.Packaging,
      type: ColumnTypes.Dropdown,
      options: Object.values(ProgressStatus),
      requiredForNewItem: false,
    },
    Boxes: {
      title: ColumnTitles.Boxes,
      id: ColumnTitles.Boxes,
      type: ColumnTypes.Dropdown,
      options: Object.values(ProgressStatus),
      requiredForNewItem: false,
    },
    Notes: {
      title: ColumnTitles.Notes,
      id: ColumnTitles.Notes,
      type: ColumnTypes.Text,
      requiredForNewItem: false,
    },
    Rating: {
      title: ColumnTitles.Rating,
      id: ColumnTitles.Customer_Name,
      type: ColumnTypes.Number,
      requiredForNewItem: false,
    },
    Labels: {
      title: ColumnTitles.Labels,
      id: ColumnTitles.Due,
      type: ColumnTypes.Text,
      requiredForNewItem: true,
    },
    "Due Date": {
      title: ColumnTitles.Due,
      id: ColumnTitles.Due,
      type: ColumnTypes.Date,
      requiredForNewItem: true,
    }
  },

  // Map a group name to its overrides
  visibleColumnOverrides: {
    [ItemStatus.New]: [
      ColumnTitles.Customer_Name,
      ColumnTitles.Design,
      ColumnTitles.Size,
      ColumnTitles.Due,
    ],
    [ItemStatus.Paint]: [
      ColumnTitles.Customer_Name,
      ColumnTitles.Design,
      ColumnTitles.Size,
      ColumnTitles.Painted,
      ColumnTitles.Due,
    ],
    [ItemStatus.OnDeck]: [
      ColumnTitles.Customer_Name,
      ColumnTitles.Design,
      ColumnTitles.Size,
      ColumnTitles.Due,
      ColumnTitles.Glued,
      ColumnTitles.Notes,
      ColumnTitles.Rating,
    ],
    Wip: [
      ColumnTitles.Customer_Name,
      ColumnTitles.Design,
      ColumnTitles.Size,
      ColumnTitles.Glued,
      ColumnTitles.Backboard,
      ColumnTitles.Painted,
      ColumnTitles.Due,
    ],
    Packaging: [
      ColumnTitles.Customer_Name,
      ColumnTitles.Design,
      ColumnTitles.Size,
      ColumnTitles.Glued,
      ColumnTitles.Due,
    ],
    Shipping: [
      ColumnTitles.Customer_Name,
      ColumnTitles.Design,
      ColumnTitles.Size,
      ColumnTitles.Due,
    ],
  },
};
