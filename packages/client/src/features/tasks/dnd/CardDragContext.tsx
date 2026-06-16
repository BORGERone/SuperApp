import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

// Определяем, работаем ли в Electron
const isElectron = typeof window !== 'undefined' && (window as any).electron !== undefined;

export interface CardDragState {
  draggingCardId: string | null;
  sourceColumnId: string | null;
  hoverColumnId: string | null;
  hoverIndex: number | null;
}

export interface CardDragApi extends CardDragState {
  beginDrag: (cardId: string, sourceColumnId: string, element: HTMLElement, offsetX?: number, offsetY?: number) => void;
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
  const ref = useRef<CardDragState>(EMPTY);
  const dragElementRef = useRef<HTMLElement | null>(null);
  const dragCloneRef = useRef<HTMLElement | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const apply = useCallback((next: CardDragState) => {
    ref.current = next;
    setState(next);
  }, []);

  const beginDrag = useCallback(
    (cardId: string, sourceColumnId: string, element: HTMLElement, offsetX = 0, offsetY = 0) => {
      // В Electron используем mouse events, в web - HTML5 drag API
      if (isElectron) {
        apply({ ...ref.current, draggingCardId: cardId, sourceColumnId });
        dragElementRef.current = element;
        dragOffsetRef.current = { x: offsetX, y: offsetY };
      } else {
        apply({ ...ref.current, draggingCardId: cardId, sourceColumnId });
      }
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
    dragElementRef.current = null;
    if (dragCloneRef.current) {
      dragCloneRef.current.remove();
      dragCloneRef.current = null;
    }
  }, [apply]);

  const readState = useCallback(() => ref.current, []);

  // Реализация drag and drop через mouse events для Electron
  useEffect(() => {
    if (!isElectron) return;

    const onMouseMove = (event: MouseEvent) => {
      if (!dragCloneRef.current || !ref.current.draggingCardId) return;

      // Перемещаем клон элемента
      const x = event.clientX - dragOffsetRef.current.x;
      const y = event.clientY - dragOffsetRef.current.y;
      dragCloneRef.current.style.left = `${x}px`;
      dragCloneRef.current.style.top = `${y}px`;

      // Временно скрываем клон для определения элемента под курсором
      dragCloneRef.current.style.display = 'none';

      // Определяем элемент под курсором
      const elementBelow = document.elementFromPoint(event.clientX, event.clientY);

      // Возвращаем отображение клона
      dragCloneRef.current.style.display = 'block';

      if (elementBelow) {
        // Находим ближайший элемент с data-column-id
        const columnElement = elementBelow.closest('[data-column-id]');
        if (columnElement) {
          const columnId = columnElement.getAttribute('data-column-id');
          const cardElements = columnElement.querySelectorAll('[data-card-id]');
          let targetIndex = 0;

          // Вычисляем индекс на основе позиции курсора
          for (let i = 0; i < cardElements.length; i++) {
            const card = cardElements[i];
            const rect = card.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            if (event.clientY < midpoint) {
              targetIndex = i;
              break;
            }
            targetIndex = i + 1;
          }

          if (columnId) {
            setHover(columnId, targetIndex);
          }
        }
      }
    };

    const onMouseUp = (event: MouseEvent) => {
      if (!dragElementRef.current || !ref.current.draggingCardId) return;

      // Временно скрываем клон для определения элемента под курсором
      if (dragCloneRef.current) {
        dragCloneRef.current.style.display = 'none';
      }

      // Находим элемент под курсором для drop
      const elementBelow = document.elementFromPoint(event.clientX, event.clientY);

      if (elementBelow) {
        const columnElement = elementBelow.closest('[data-column-id]');
        if (columnElement) {
          const targetColumnId = columnElement.getAttribute('data-column-id');
          // Вызываем drop через событие на window
          const dropEvent = new CustomEvent('electron-drop', {
            detail: {
              cardId: ref.current.draggingCardId,
              sourceColumnId: ref.current.sourceColumnId,
              targetColumnId,
              clientX: event.clientX,
              clientY: event.clientY,
            },
          });
          window.dispatchEvent(dropEvent);
        }
      }

      endDrag();
    };

    // Добавляем слушатели только если происходит перетаскивание
    if (ref.current.draggingCardId) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isElectron, state.draggingCardId, setHover, endDrag]);

  // Отдельный эффект для создания клона элемента
  useEffect(() => {
    if (!isElectron || !state.draggingCardId) return;

    // Создаем клон элемента для визуального отображения перетаскивания
    if (dragElementRef.current && !dragCloneRef.current) {
      const element = dragElementRef.current;
      const rect = element.getBoundingClientRect();

      const clone = element.cloneNode(true) as HTMLElement;
      clone.style.position = 'fixed';
      clone.style.left = `${rect.left}px`;
      clone.style.top = `${rect.top}px`;
      clone.style.width = `${rect.width}px`;
      clone.style.height = `${rect.height}px`;
      clone.style.pointerEvents = 'none';
      clone.style.opacity = '0.8';
      clone.style.zIndex = '9999';
      clone.style.boxShadow = '0 10px 40px rgba(0,0,0,0.3)';

      document.body.appendChild(clone);
      dragCloneRef.current = clone;
    }
  }, [isElectron, state.draggingCardId]);

  // Обработка electron-drop события для завершения перетаскивания
  useEffect(() => {
    const handleElectronDrop = () => {
      // Логика обрабатывается в TaskColumnView через onDropCard
    };

    window.addEventListener('electron-drop', handleElectronDrop as EventListener);
    return () => {
      window.removeEventListener('electron-drop', handleElectronDrop as EventListener);
    };
  }, []);

  // HTML5 drag and drop для web версии
  useEffect(() => {
    if (isElectron || !state.draggingCardId) return;
    const onWindowDragOver = (event: DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
        event.dataTransfer.effectAllowed = 'move';
      }
    };
    const onWindowDrop = (event: DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
    };
    const onWindowDragEnter = (event: DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.dropEffect = 'move';
      }
    };
    const onWindowDragLeave = (event: DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
    };

    window.addEventListener('dragover', onWindowDragOver, { passive: false });
    window.addEventListener('drop', onWindowDrop, { passive: false });
    window.addEventListener('dragenter', onWindowDragEnter, { passive: false });
    window.addEventListener('dragleave', onWindowDragLeave, { passive: false });

    return () => {
      window.removeEventListener('dragover', onWindowDragOver);
      window.removeEventListener('drop', onWindowDrop);
      window.removeEventListener('dragenter', onWindowDragEnter);
      window.removeEventListener('dragleave', onWindowDragLeave);
    };
  }, [state.draggingCardId]);

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
