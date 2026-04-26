import React, { createContext, useCallback, useContext, useState } from 'react';

type SetHeaderRight = (node: React.ReactNode) => void;

const SetHeaderRightCtx = createContext<SetHeaderRight | null>(null);
const HeaderRightCtx = createContext<React.ReactNode>(null);

export function StudioHeaderProvider({ children }: { children: React.ReactNode }) {
  const [right, setRight] = useState<React.ReactNode>(null);
  const setHeaderRight = useCallback((node: React.ReactNode) => {
    setRight(node);
  }, []);

  return (
    <SetHeaderRightCtx.Provider value={setHeaderRight}>
      <HeaderRightCtx.Provider value={right}>{children}</HeaderRightCtx.Provider>
    </SetHeaderRightCtx.Provider>
  );
}

export function useSetStudioHeaderRight() {
  return useContext(SetHeaderRightCtx);
}

export function useStudioHeaderRightSlot() {
  return useContext(HeaderRightCtx);
}
