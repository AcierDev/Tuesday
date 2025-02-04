import { ItemUtil } from "@/utils/ItemUtil";
import { Group } from "@/typings/types";
import { BackboardRequirement } from "@/typings/types";

export function BackboardCalculations(group: Group): BackboardRequirement {
  return ItemUtil.getTotalBackboardRequirements(group);
}
