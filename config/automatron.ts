import {
  AutomatronSettings,
  Column,
  ColumnTitles,
  ColumnValue,
  ItemStatus,
  ProgressStatus,
} from "../typings/types";

export const automatron: AutomatronSettings = {
  [ColumnTitles.Glued]: {
    [ProgressStatus.Done]: ItemStatus.Packaging,
    [ProgressStatus.Stuck]: ItemStatus.Wip,
    [ProgressStatus.Working_On_It]: ItemStatus.Wip,
    [ProgressStatus.Didnt_Start]: ItemStatus.Wip,
  },
  [ColumnTitles.Painted]: {
    [ProgressStatus.Done]: ItemStatus.Wip,
    [ProgressStatus.Stuck]: ItemStatus.Paint,
    [ProgressStatus.Working_On_It]: ItemStatus.Paint,
    [ProgressStatus.Didnt_Start]: ItemStatus.Paint,
  },
};
