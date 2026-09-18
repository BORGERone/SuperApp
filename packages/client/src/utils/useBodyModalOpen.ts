// Управление CSS-классом `has-modal-open` на `document.body` с использованием
// счетчика ссылок. Каждый модал, который должен скрыть тайтлбар (или другие
// глобальные элементы), вызывает `useBodyModalOpen()` в эффекте. Класс
// `has-modal-open` ставится при первом открытом модале и снимается, только
// когда счетчик возвращается к нулю.
//
// Без этого, если внутри одного модала открыть другой и потом его закрыть,
// эффект уборки дочерней модалки уберет класс — и тайтлбар вернется,
// несмотря на то, что родительская модалка все еще открыта.

import { useEffect } from 'react';

let openCount = 0;

function applyClass() {
  if (typeof document === 'undefined') return;
  if (openCount > 0) {
    document.body.classList.add('has-modal-open');
  } else {
    document.body.classList.remove('has-modal-open');
  }
}

export function useBodyModalOpen(open: boolean = true) {
  useEffect(() => {
    if (!open) return;
    openCount += 1;
    applyClass();
    return () => {
      openCount = Math.max(0, openCount - 1);
      applyClass();
    };
  }, [open]);
}
