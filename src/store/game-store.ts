import { create } from "zustand";
import type { GameState } from "@/engine/types";
import { createInitialState } from "@/engine/state";

interface GameStore {
  game: GameState;
  setGame: (game: GameState) => void;
}

export const useGameStore = create<GameStore>((set) => ({
  game: createInitialState(),
  setGame: (game) => set({ game })
}));
