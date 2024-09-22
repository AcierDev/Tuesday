import { Dispatch, SetStateAction, createContext } from "react";
import { Board } from "../typings/types";

export const AllBoardsContext = createContext<Board[]>([]);
