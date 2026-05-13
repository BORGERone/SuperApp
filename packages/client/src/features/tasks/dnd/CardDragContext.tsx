import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

export interface CardDragState {
  draggingCardId: string | null;
  sourceColumnId: string | null;
  hoverColumnId: string | null;
  hoverIndex: number | null;
}

export interface CardDragApi extends CardDragState {
  beginDrag: (cardId: string, sourceColumnId: string) => void;
  setHover: (columnId: string, index: number) => void;
  clearHover: (columnId: string) => void;
  endDrag: () => void;
  readState: () => CardDragState;
}

const CardDragContext = createContext<CardDragApi | null>(null);

const EMPTY: CardDragState = {
  draggingCardId: null,
  sourceColumnId: null,
  hoverColumnId: null,
  hoverIndex: null,
};

export const CardDragProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<CardDragState>(EMPTY);
  // Зеркало state в ref: позволяет читать актуальное значение синхронно
  // между событиями dragstart → dragover → drop без ожидания ре-рендера React.
  const ref = useRef<CardDragState>(EMPTY);

  const apply = useCallback((next: CardDragState) => {
    ref.current = next;
    setState(next);
  }, []);

  const beginDrag = useCallback(
    (cardId: string, sourceColumnId: string) => {
      apply({ ...ref.current, draggingCardId: cardId, sourceColumnId });
    },
    [apply],
  );

  const setHover = useCallback(
    (columnId: string, index: number) => {
      if (ref.current.hoverColumnId === columnId && ref.current.hoverIndex === index) return;
      apply({ ...ref.current, hoverColumnId: columnId, hoverIndex: index });
    },
    [apply],
  );

  const clearHover = useCallback(
    (columnId: string) => {
      if (ref.current.hoverColumnId !== columnId) return;
      apply({ ...ref.current, hoverColumnId: null, hoverIndex: null });
    },
    [apply],
  );

  const endDrag = useCallback(() => {
    apply(EMPTY);
  }, [apply]);

  const readState = useCallback(() => ref.current, []);

  const value = useMemo<CardDragApi>(
    () => ({
      ...state,
      beginDrag,
      setHover,
      clearHover,
      endDrag,
      readState,
    }),
    [state, beginDrag, setHover, clearHover, endDrag, readState],
  );

  return <CardDragContext.Provider value={value}>{children}</CardDragContext.Provider>;
};

export const useCardDrag = (): CardDragApi => {
  const ctx = useContext(CardDragContext);
  if (!ctx) {
    throw new Error('useCardDrag должен использоваться внутри CardDragProvider');
  }
  return ctx;
};

export const CARD_DRAG_MIME = 'application/x-superapp-task-card';
