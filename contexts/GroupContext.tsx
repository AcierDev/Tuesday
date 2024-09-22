import { Dispatch, SetStateAction, createContext } from "react";
import { Group } from "../typings/types";

export const GroupContext = createContext<{
  group: Group;
  //setGroup: Dispatch<SetStateAction<Group>>;
}>({
  group: {} as Group,
  //setGroup: () => {},
});
