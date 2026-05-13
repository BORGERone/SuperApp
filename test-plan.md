# E2E Test Plan — Trello-style Tasks tab

## Setup/access confirmation
- Local repo: `/home/ubuntu/repos/SuperApp` on PR branch `devin/1778666981-tasks-trello-tab`.
- Local testing path: run the Hono server on `localhost:3002` and the Vite client on `localhost:8080`.
- Auth: no external secrets required. The server seeds `admin/admin123` and `user/user123` when empty.
- Access state before execution: logged in as `admin`; browser is ready on the app shell, so login/setup steps are intentionally excluded from the executable plan.
- CI/review: PR has no configured CI checks; no human review comments are pending at plan time.

## Code evidence used for this plan
- Login form fields and successful redirect to `/drive`: `packages/client/src/features/auth/views/LoginView.tsx:18-45`, `packages/client/src/features/auth/views/LoginView.tsx:67-123`.
- Seeded test users: `packages/server/src/features/auth/routes/authRoutes.ts:152-180`.
- Tasks route: `packages/client/src/router.tsx:42-45`.
- Sidebar navigation item “Задачи” to `/tasks`: `packages/client/src/components/Sidebar.tsx:83-99`.
- Tasks page board/card/filter wiring: `packages/client/src/features/tasks/views/TasksView.tsx:18-99`, `packages/client/src/features/tasks/views/TasksView.tsx:128-220`.
- Kanban columns and drag/drop behavior: `packages/client/src/features/tasks/views/KanbanBoard.tsx:6-25`, `packages/client/src/features/tasks/views/KanbanBoard.tsx:63-76`, `packages/client/src/features/tasks/views/KanbanBoard.tsx:115-193`.
- Task card rendered values: `packages/client/src/features/tasks/components/TaskCard.tsx:47-110`.
- Drag/drop implementation detail: movement requires the card's `dragstart` to set `dataTransfer` and the target column's `drop` handler to read it. If a raw desktop pointer drag does not fire the browser's HTML5 data transfer events, retry once using browser-level Playwright `dragTo` against the visible card and Done column. Do not mutate localStorage or app internals to move the card.

## Primary flow: create, filter, move, and persist a Trello-style task

### Test 1 — Tasks tab renders real Kanban UI instead of placeholder
1. From the authenticated app shell, click the sidebar item labeled `Задачи`.
2. Expected assertions:
   - URL path is `/tasks`.
   - Page heading contains `Задачи`.
   - Board list contains demo board `Запуск SuperApp`.
   - Three column headers are visible exactly as `Todo`, `In Progress`, and `Done`.
   - Placeholder text `Страница задач в разработке...` is not visible.

### Test 2 — Creating a board and card updates the UI with exact entered values
1. In the “Новая доска” form, type board name `QA Board Devin` and description `Проверка Trello flow`, then click `Создать доску`.
2. In the new board’s `Todo` column, click `Добавить карточку`.
3. Fill card fields with:
   - Title: `QA drag card`
   - Description: `Проверка переноса и фильтра`
   - Assignee: `qa-user`
   - Priority: `Высокий`
   - Labels: `qa, e2e`
4. Click `Добавить`.
5. Expected assertions:
   - Active board header is `QA Board Devin`.
   - `Todo` count increases to `1`.
   - A card titled `QA drag card` appears in `Todo`.
   - The card shows assignee `qa-user`, labels `qa` and `e2e`, and priority label `Высокий`.

### Test 3 — Search/filter and drag/drop prove the board is interactive
1. Type `drag card` in the search input labeled by placeholder `Поиск карточек`.
2. Select `qa-user` in the assignee dropdown.
3. Expected assertions:
   - Card `QA drag card` remains visible.
   - Demo cards like `Подготовить макет доски задач` are hidden by the search/filter combination.
4. Drag `QA drag card` from `Todo` into `Done`.
5. Expected assertions:
   - `Done` count increases by `1`.
   - `QA drag card` appears under `Done` and is no longer under `Todo`.
   - If neither a desktop drag nor Playwright's browser-level `dragTo` triggers the HTML5 drop path, this drag/drop assertion must be reported as failed/untested rather than simulated through state edits.

### Test 4 — Local persistence survives refresh
1. Refresh the browser page while still on `/tasks`.
2. Expected assertions:
   - Board `QA Board Devin` is still selected or visible in the board list.
   - Card `QA drag card` is still visible under `Done`.
   - The card still shows assignee `qa-user` and labels `qa` and `e2e`.

## Evidence to collect
- Screen recording with annotations for each test.
- Screenshots after initial render, after card creation, after drag/drop, and after refresh.
