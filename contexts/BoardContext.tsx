import { createContext } from "react";
import { Board } from "../typings/types";

export const BoardContext = createContext<Board>({} as Board);
