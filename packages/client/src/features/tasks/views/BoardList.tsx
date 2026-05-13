import React from 'react';
import { FolderKanban, Plus, Trash2 } from 'lucide-react';
import { BoardDraft, TaskBoard } from '../models/tasksModel';

interface BoardListProps {
  boards: TaskBoard[];
  activeBoardId: string;
  boardDraft: BoardDraft;
  currentUser: string;
  isAdmin: boolean;
  onBoardDraftChange: (draft: BoardDraft) => void;
  onCreateBoard: () => void;
  onSelectBoard: (boardId: string) => void;
  onDeleteBoard: (boardId: string) => void;
}

export const BoardList: React.FC<BoardListProps> = ({
  boards,
  activeBoardId,
  boardDraft,
  currentUser,
  isAdmin,
  onBoardDraftChange,
  onCreateBoard,
  onSelectBoard,
  onDeleteBoard,
}) => (
  <aside className="glass-card flex h-fit w-full flex-col gap-4 rounded-3xl p-5 lg:w-80">
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-indigo-500">Boards</p>
      <h2 className="mt-1 text-2xl font-bold text-gray-900">Доски задач</h2>
    </div>

    <div className="space-y-2">
      {boards.map(board => {
        const isActive = board.id === activeBoardId;
        const canDelete = boards.length > 1 && (isAdmin || board.owner === currentUser);

        return (
          <div
            key={board.id}
            className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition-all ${
              isActive
                ? 'border-indigo-200 bg-indigo-50/90 shadow-md'
                : 'border-white/60 bg-white/55 hover:border-indigo-100 hover:bg-white/90'
            }`}
          >
            <span className="mt-0.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 p-2 text-white shadow-lg">
              <FolderKanban size={18} />
            </span>
            <button
              type="button"
              onClick={() => onSelectBoard(board.id)}
              className="min-w-0 flex-1 text-left"
            >
              <span className="block truncate text-sm font-bold text-gray-900">{board.name}</span>
              <span className="mt-1 line-clamp-2 block text-xs text-gray-500">{board.description || 'Без описания'}</span>
              <span className="mt-2 block text-[11px] font-semibold text-gray-400">
                {board.members.length} участников
              </span>
            </button>
            {canDelete && (
              <button
                type="button"
                onClick={event => {
                  event.stopPropagation();
                  onDeleteBoard(board.id);
                }}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600"
                aria-label="Удалить доску"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        );
      })}
    </div>

    <div className="rounded-2xl border border-dashed border-indigo-200 bg-white/45 p-4">
      <h3 className="mb-3 text-sm font-bold text-gray-800">Новая доска</h3>
      <div className="space-y-3">
        <input
          value={boardDraft.name}
          onChange={event => onBoardDraftChange({ ...boardDraft, name: event.target.value })}
          placeholder="Название доски"
          className="glass-input w-full rounded-xl px-3 py-2 text-sm"
        />
        <textarea
          value={boardDraft.description}
          onChange={event => onBoardDraftChange({ ...boardDraft, description: event.target.value })}
          placeholder="Описание"
          rows={3}
          className="glass-input w-full resize-none rounded-xl px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={onCreateBoard}
          disabled={!boardDraft.name.trim()}
          className="btn-glass inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={16} />
          Создать доску
        </button>
      </div>
    </div>
  </aside>
);
