import { ItemUtil } from "@/utils/ItemUtil";
import { Group } from "@/typings/types";
import { BoxRequirement } from "@/typings/interfaces";

export function calculateBoxRequirements(
  group: Group
): Record<string, BoxRequirement> {
  return ItemUtil.getTotalBoxRequirements(group);
}
