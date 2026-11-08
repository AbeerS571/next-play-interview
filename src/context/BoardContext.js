import { createContext, useContext } from 'react';

// Provided by BoardPage: { user, members, labels, membersById, labelsById, openTask }
export const BoardContext = createContext(null);

export function useBoard() {
  return useContext(BoardContext);
}
