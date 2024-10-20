import { createContext, Dispatch, SetStateAction } from "react";
import { Board } from "../typings/types";

export const AllBoardsContext = createContext<Board[]>([]);
