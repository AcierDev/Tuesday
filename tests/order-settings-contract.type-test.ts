import type { OrderSettings } from "../typings/types";

type HasDueBadgeDays =
  "dueBadgeDays" extends keyof OrderSettings ? true : false;
const hasDueBadgeDays: HasDueBadgeDays = false;
void hasDueBadgeDays;
