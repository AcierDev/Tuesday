import { create } from "zustand";
import { FileProgress } from "@/components/shipping/ViewLabel";

interface UploadProgressState {
  files: { [key: string]: FileProgress };
  completedFiles: Set<string>;
  updateFileProgress: (fileName: string, progress: FileProgress) => void;
  markFileComplete: (fileName: string) => void;
  removeFile: (fileName: string) => void;
  reset: () => void;
}

export const useUploadProgressStore = create<UploadProgressState>((set) => ({
  files: {},
  completedFiles: new Set(),

  updateFileProgress: (fileName: string, progress: FileProgress) =>
    set((state) => ({
      files: {
        ...state.files,
        [fileName]: progress,
      },
    })),

  markFileComplete: (fileName: string) =>
    set((state) => ({
      completedFiles: new Set(state.completedFiles).add(fileName),
    })),

  removeFile: (fileName: string) =>
    set((state) => {
      const { [fileName]: _, ...remainingFiles } = state.files;
      const newCompleted = new Set(state.completedFiles);
      newCompleted.delete(fileName);
      return {
        files: remainingFiles,
        completedFiles: newCompleted,
      };
    }),

  reset: () => set({ files: {}, completedFiles: new Set() }),
}));
