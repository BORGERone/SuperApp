# AI Guide - SuperApp

## 🎯 Концепция проекта

**SuperApp** - это кроссплатформенное приложение с архитектурой MVVM (Model-View-ViewModel), объединяющее три основных функциональных блока:
- **Сетевой диск** (уже реализовано)
- **Почта** (планируется)
- **Доски задач** (планируется)

### MVVM Архитектура
- **Model:** Данные и бизнес-логика (API, хранение данных)
- **View:** UI компоненты (HTML/CSS, React/Vue компоненты)
- **ViewModel:** Связующее звено между Model и View (состояние, команды)

## 📋 Требования

### Совместимость
- **Десктоп (клиент):** Windows 7 и выше (критическое требование!)
- **Мобильные (клиент):** Android (поддержка Apple не требуется)
- **Сервер:** Windows 10 и выше
- Кроссплатформенность - единая кодовая база для всех клиентских платформ

### Архитектурные принципы
- MVVM (Model-View-ViewModel)
- Модульная структура
- Переиспользуемые компоненты
- Простая навигация между модулями
- Кроссплатформенность

## 🏗️ Текущая архитектура

### Технологический стек (текущий)
- **Frontend:** HTML, CSS (vanilla), JavaScript (ES6 modules)
- **Build tool:** Vite
- **Desktop framework:** Tauri (требует замены на Electron для Win7)
- **Animations:** Lottie (dotlottie-web)

### Рекомендуемый стек для кроссплатформенности и MVVM
- **Frontend Framework:** React 19 + TypeScript (для реализации MVVM)
- **Mobile Framework:** React Native (Android) или Capacitor (Android)
- **Desktop:** Electron 22 (Windows 7+) + React 19 + TypeScript
- **Runtime:** Bun (вместо Node.js)
- **Monorepo:** Bun Workspaces
- **State Management:** Zustand для UI, TanStack Query для данных
- **Styling:** Tailwind CSS v4
- **UI Components:** Radix UI, Lucide-react (иконки)
- **Validation:** Zod для валидации данных между клиентом и сервером
- **Authentication:** JWT (Access/Refresh tokens)
- **Routing:** React Router
- **Build tool:** Vite
- **Architecture:** Feature-based (разделение по функциональным модулям)
- **Server Framework:** Hono (вместо Express)

### Архитектура приложения
**Клиент-серверная архитектура:**
- **Клиент:** Десктоп (Windows 7+) и Android приложение
- **Сервер:** Отдельная программа для Windows 10+
- **Связь:** HTTP/REST API или WebSocket
- **Текущее состояние:** Все работает через localhost для теста
- **Целевое состояние:** Клиент подключается к удаленному серверу

### Файловая структура (текущая)
```
SuperApp/
├── index.html          # Главный HTML файл
├── main.js            # Основная логика приложения
├── style.css          # Все стили
├── package.json       # Зависимости
└── vite.config.js     # Конфигурация Vite
```

### Рекомендуемая файловая структура для MVVM и кроссплатформенности (Monorepo - Bun Workspaces)
```
SuperApp/                          # Корневая папка монорепозитория
├── packages/
│   ├── shared/                    # Общие пакеты для всех приложений
│   │   ├── types/                 # Общие TypeScript типы
│   │   │   └── index.ts
│   │   ├── validation/            # Zod схемы для валидации
│   │   │   └── schemas.ts
│   │   ├── constants/             # Общие константы
│   │   │   └── index.ts
│   │   └── package.json
│   ├── client/                    # Десктоп клиент (Electron 22)
│   │   ├── src/
│   │   │   ├── features/          # Feature-based архитектура
│   │   │   │   ├── drive/         # Модуль сетевого диска
│   │   │   │   │   ├── models/            # Model - данные
│   │   │   │   │   │   └── driveModel.ts
│   │   │   │   │   ├── viewmodels/        # ViewModel - состояние (Zustand)
│   │   │   │   │   │   └── driveViewModel.ts
│   │   │   │   │   ├── views/             # View - UI компоненты
│   │   │   │   │   │   ├── DriveList.tsx
│   │   │   │   │   │   ├── DriveGrid.tsx
│   │   │   │   │   │   └── DriveItem.tsx
│   │   │   │   │   ├── components/        # Компоненты модуля
│   │   │   │   │   │   └── AnimatedCheckbox.tsx
│   │   │   │   │   ├── api/               # TanStack Query hooks
│   │   │   │   │   │   └── driveApi.ts
│   │   │   │   │   └── index.ts           # Экспорт модуля
│   │   │   │   ├── mail/          # Модуль почты
│   │   │   │   │   ├── models/
│   │   │   │   │   │   └── mailModel.ts
│   │   │   │   │   ├── viewmodels/
│   │   │   │   │   │   └── mailViewModel.ts
│   │   │   │   │   ├── views/
│   │   │   │   │   │   ├── MailList.tsx
│   │   │   │   │   │   ├── MailView.tsx
│   │   │   │   │   │   └── MailCompose.tsx
│   │   │   │   │   ├── components/
│   │   │   │   │   ├── api/
│   │   │   │   │   │   └── mailApi.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── tasks/         # Модуль досок задач
│   │   │   │   │   ├── models/
│   │   │   │   │   │   └── tasksModel.ts
│   │   │   │   │   ├── viewmodels/
│   │   │   │   │   │   └── tasksViewModel.ts
│   │   │   │   │   ├── views/
│   │   │   │   │   │   ├── BoardList.tsx
│   │   │   │   │   │   ├── KanbanBoard.tsx
│   │   │   │   │   │   └── TaskCard.tsx
│   │   │   │   │   ├── components/
│   │   │   │   │   ├── api/
│   │   │   │   │   │   └── tasksApi.ts
│   │   │   │   │   └── index.ts
│   │   │   │   └── auth/          # Модуль авторизации (JWT)
│   │   │   │       ├── models/
│   │   │   │       ├── viewmodels/
│   │   │   │       ├── views/
│   │   │   │       ├── api/
│   │   │   │       │   └── authApi.ts
│   │   │   │       └── index.ts
│   │   │   ├── shared/            # Общие компоненты и утилиты
│   │   │   │   ├── components/     # Переиспользуемые компоненты (Radix UI)
│   │   │   │   ├── hooks/          # Custom React hooks
│   │   │   │   ├── utils/          # Утилиты
│   │   │   │   └── ui/             # UI компоненты (shadcn/ui)
│   │   │   ├── store/              # Zustand store (UI state)
│   │   │   │   └── index.ts
│   │   │   ├── lib/                # Клиентская библиотека
│   │   │   │   ├── api.ts         # API клиент с TanStack Query
│   │   │   │   └── auth.ts        # JWT токены (Access/Refresh)
│   │   │   ├── App.tsx             # Главный компонент
│   │   │   └── main.tsx            # Точка входа
│   │   ├── electron/               # Electron 22 main process
│   │   │   └── main.ts
│   │   ├── android/                # React Native Android
│   │   └── package.json
│   └── server/                    # Сервер (Hono + Bun)
│       ├── src/
│       │   ├── features/          # Feature-based архитектура
│       │   │   ├── drive/         # Модуль сетевого диска
│       │   │   │   ├── routes/         # Hono routes
│       │   │   │   │   └── driveRoutes.ts
│       │   │   │   ├── services/       # Бизнес-логика
│       │   │   │   │   └── driveService.ts
│       │   │   │   └── index.ts
│       │   │   ├── mail/          # Модуль почты
│       │   │   │   ├── routes/
│       │   │   │   │   └── mailRoutes.ts
│       │   │   │   ├── services/
│       │   │   │   │   └── mailService.ts
│       │   │   │   └── index.ts
│       │   │   ├── tasks/         # Модуль досок задач
│       │   │   │   ├── routes/
│       │   │   │   │   └── tasksRoutes.ts
│       │   │   │   ├── services/
│       │   │   │   │   └── tasksService.ts
│       │   │   │   └── index.ts
│       │   │   └── auth/          # Модуль авторизации (JWT)
│       │   │       ├── routes/
│       │   │       │   └── authRoutes.ts
│       │   │       ├── services/
│       │   │       │   └── authService.ts
│       │   │       │   ├── generateTokens.ts
│       │   │       │   └── verifyTokens.ts
│       │   │       └── index.ts
│       │   ├── shared/            # Общие модули
│       │   │   ├── middleware/    # Hono middleware (auth, logging)
│       │   │   │   └── authMiddleware.ts
│       │   │   ├── utils/         # Утилиты
│       │   │   └── types/         # TypeScript типы
│       │   ├── db/                # Drizzle ORM
│       │   │   ├── schema.ts      # Схема базы данных
│       │   │   └── migrations/    # Миграции
│       │   └── server.ts          # Главный файл сервера (Hono)
│       └── package.json
├── bun.lockb                      # Bun lockfile
├── package.json                   # Root package.json (workspaces)
└── bunfig.toml                    # Bun конфигурация
```

## 🚀 Требуемые изменения для кроссплатформенности

### Переход с Tauri на Electron 22 (для Windows 7)
1. Установить Electron 22:
   ```bash
   bun install electron@22 --dev
   bun install electron-builder --dev
   ```

2. Создать `electron/main.js`:
   - IPC для общения между main и renderer process
   - Настройка BrowserWindow
   - Обработка диалогов (заменить Tauri dialog)

3. Заменить импорты в `main.js`:
   - `@tauri-apps/api/core` → `@electron/remote` или IPC
   - `@tauri-apps/plugin-dialog` → `electron.dialog`
   - `@tauri-apps/plugin-shell` → `electron.shell`

4. Обновить `package.json`:
   - Изменить скрипты сборки
   - Добавить electron-builder конфигурацию

### Переход на React 19 + TypeScript для MVVM
1. Установить зависимости:
   ```bash
   bun install react@19 react-dom@19
   bun install typescript @types/react @types/react-dom
   bun install zustand
   bun install tailwindcss@4
   bun install react-router-dom
   ```

2. Инициализация Tailwind CSS v4:
   ```bash
   bunx tailwindcss@4 init
   ```

3. Рефакторинг кода:
   - Перевести все файлы на TypeScript
   - Разделить на Model, ViewModel, View (feature-based)
   - Использовать Zustand для state management
   - Заменить CSS на Tailwind CSS v4
   - Создать React компоненты вместо vanilla JS

### Поддержка мобильных устройств (только Android)
#### Вариант 1: React Native (нативные приложения)
- Плюсы: нативная производительность, доступ к нативным API Android
- Минусы: разные кодовые базы для web и mobile

#### Вариант 2: Capacitor (PWA wrapper)
- Плюсы: единая кодовая база с десктопом, быстрый старт
- Минусы: не полностью нативная производительность

**Рекомендация:** Использовать React + Capacitor для быстрого старта и единой кодовой базы между десктопом и Android

### Серверная часть
**Требования:**
- Отдельная программа для Windows 10+
- REST API или WebSocket для связи с клиентами
- Хранение данных (файлов, писем, задач)
- Аутентификация и авторизация
- Возможность установки на отдельный сервер

**Технологический стек сервера:**
- **Runtime:** Bun + TypeScript (для Windows 10)
- **Framework:** Hono (вместо Express.js)
- **ORM:** Drizzle ORM для работы с БД
- **Database:** SQLite (простой старт) или PostgreSQL/MSSQL (для продакшена)
- **API:** REST API или WebSocket
- **Authentication:** JWT (Access/Refresh tokens)
- **Validation:** Zod для валидации входящих данных
- **File Storage:** Локальная файловая система или облачное хранилище

**Стратегия реализации:**
1. Сначала реализовать серверную часть для авторизации (JWT + роли)
2. Реализовать серверную часть для сетевого диска (файлы и папки) с учетом прав доступа
3. Заменить локальные операции в клиенте на API вызовы
4. Постепенно добавить серверную поддержку для почты и задач
5. Добавить систему ролей и прав доступа

### JWT Авторизация - Фундамент системы ролей
**Токены:**
- **Access Token:** Короткоживущий (15-30 минут), используется для API запросов
- **Refresh Token:** Долгоживущий (7-30 дней), используется для обновления Access Token
- Хранение токенов на клиенте: localStorage или secure cookies

**Роли пользователей:**
- **Admin:** Полные права на все ресурсы (CRUD всех файлов, писем, задач)
- **User:** Ограниченные права (только свои данные, доступ к общим ресурсам)

**Права доступа:**
- Сетевой диск: чтение/запись/удаление файлов и папок в зависимости от ролей
- Почта: отправка писем, доступ к папкам в зависимости от прав
- Доски задач: создание/редактирование задач, доступ к доскам

**Реализация:**
- Сервер: генерация JWT токенов, проверка валидности, middleware для защиты routes
- Клиент: хранение токенов, автоматическое обновление, добавление в заголовки запросов
- Zod схемы для валидации всех данных между клиентом и сервером

## 📦 Модули приложения

### 1. Сетевой диск (Drive) - уже реализовано
**Текущая функциональность:**
- Просмотр файлов и папок
- Навигация по директориям
- Выделение файлов
- Удаление файлов
- Два режима отображения: список и сетка
- Анимированные чекбоксы (Lottie)
- **Профили пользователей и права доступа (требуется добавить):**
  - Совместный доступ к файлам и папкам
  - Роли: Admin (полные права), User (ограниченные права)
  - Управление правами доступа к файлам и папкам
  - Обмен файлами между пользователями

**Ключевые файлы:**
- `main.js` - вся логика сетевого диска
- `style.css` - стили для сетевого диска
- Lottie URL: `https://lottie.host/ad86168e-2b41-4f9c-ac75-33ae6c6898ee/jUZmVxE0m4.lottie`

**Важные детали реализации чекбокса:**
- Canvas 250x250 для анимации
- Хитбокс 40x40 (обертка .file-checkbox-wrapper)
- Canvas с pointer-events: none
- Обертка с pointer-events: auto
- Центрирование через flexbox + transform translate(-50%, -50%)

### 2. Почта (Mail) - планируется
**Требуемая функциональность:**
- Список писем (inbox, sent, drafts)
- Просмотр письма
- Составление/отправка писем
- Поиск по письмам
- Папки и фильтры
- **Профили пользователей и права доступа:**
  - Отправка писем конкретным пользователям
  - Роли: Admin (полные права), User (ограниченные права)
  - Управление правами доступа к папкам и письмам

**Технические решения:**
- IMAP/SMTP для работы с почтовыми серверами
- Локальное хранение писем (IndexedDB или файловая система)
- Рендеринг HTML писем
- Система авторизации и прав доступа

### 3. Доски задач (Tasks)
**Реализованная функциональность:**
- Пользовательские колонки задач с произвольными названиями (например, "Сделать в мае", "Разработка в июне")
- Дедлайны на уровне колонок и карточек
- Цветовая подсветка карточек по статусу дедлайна:
  - 🟢 зелёная — карточка отмечена выполненной (тумблер выполнения)
  - 🟡 жёлтая — дедлайн истекает сегодня
  - 🔴 красная — дедлайн просрочен
- Описание и комментарии внутри карточек (комментарии — отдельный раздел, доступны всем пользователям)
- Выбор ответственных через выпадающий список пользователей (по образцу модуля Почты)
- Полная серверная синхронизация через REST API `/api/tasks` (TanStack Query + Zustand patterns)
- Локализация интерфейса полностью на русский язык

**Серверные эндпоинты:**
- `GET/POST /api/tasks/columns`, `PUT/DELETE /api/tasks/columns/:id` — управление колонками
- `GET/POST /api/tasks/cards`, `PUT/DELETE /api/tasks/cards/:id` — управление карточками
- `GET/POST /api/tasks/cards/:id/comments`, `DELETE /api/tasks/comments/:id` — комментарии

## 🎨 UI/UX принципы

### Текущий дизайн
- Светлая тема с темноватыми градиентами
- Стиль Glassmorphism и Liquid glass
- Градиенты для папок и файлов
- Анимации при наведении
- Плавные переходы
- Современный, минималистичный дизайн

### Цветовая палитра
- Основной цвет: `#667eea` (синий)
- Фон: светлый
- Градиенты для папок: рандомные градиенты
- Стиль: Glassmorphism, Liquid glass

### Компоненты
- Action Island (плавающая панель действий)
- File Item (элемент файла/папки)
- Animated Checkbox (Lottie анимация)

## 🔄 Навигация между модулями

### Варианты реализации:
1. **Простые табы** (быстрое решение):
   - HTML/CSS tabs
   - Переключение видимости секций через CSS classes

2. **SPA роутинг** (если перейдем на React/Vue):
   - React Router / Vue Router
   - Компонентная структура

3. **Навигация через сайдбар**:
   - Левая панель с иконками модулей
   - Переключение активного модуля

## 📝 Ключевые ссылки

### Документация
- [Electron Documentation](https://www.electronjs.org/docs)
- [Electron Builder](https://www.electron.build/)
- [Vite Documentation](https://vitejs.dev/)
- [Lottie Files](https://lottiefiles.com/)
- [DotLottie Web](https://www.lottiefiles.com/dotlottie-web)
- [React 19 Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Tailwind CSS v4](https://tailwindcss.com/blog/tailwindcss-v4-alpha)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [Bun Documentation](https://bun.sh/docs)
- [Bun Workspaces](https://bun.sh/docs/runtime/workspaces)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Hono Documentation](https://hono.dev/)
- [Zod Documentation](https://zod.dev/)
- [Radix UI](https://www.radix-ui.com/)
- [Lucide Icons](https://lucide.dev/)
- [shadcn/ui](https://ui.shadcn.com/)

### Полезные библиотеки
- **Drag & Drop:** react-dnd, interact.js, SortableJS
- **IMAP:** node-imap, imapflow
- **State Management:** Zustand (UI), TanStack Query (данные)
- **UI Components:** Radix UI, shadcn/ui
- **Icons:** Lucide-react
- **Styling:** Tailwind CSS v4
- **Forms:** React Hook Form, Zod
- **HTTP Client:** Axios, Fetch API
- **ORM (сервер):** Drizzle ORM
- **Validation:** Zod
- **Authentication:** JWT (jsonwebtoken для сервера)

## 🚧 TODO - Приоритеты

### Высокий приоритет
1. Настройка монорепозитория (Bun Workspaces) с packages/shared
2. Установка Bun runtime
3. Установка Electron 22 для Windows 7
4. Установка React 19 и TypeScript
5. Установка Tailwind CSS v4 и настройка
6. Установка Zustand для UI state management
7. Установка TanStack Query для data fetching
8. Установка Radix UI и Lucide-react для UI компонентов
9. Установка Zod для валидации данных
10. Рефакторинг кода в Feature-based структуру (MVVM) в монорепозитории
11. Перевод всех файлов на TypeScript
12. Замена CSS на Tailwind CSS v4
13. Реализация базового сервера (Bun + Hono + TypeScript) для Windows 10
14. Настройка Drizzle ORM на сервере
15. Реализация JWT авторизации (Access/Refresh tokens) - КРИТИЧНО
16. Реализация системы ролей (Admin/User) - КРИТИЧНО
17. Создание REST API для сетевого диска (файлы и папки) с правами доступа
18. Система профилей пользователей - КРИТИЧНО
19. Замена локальных операций клиента на API вызовы (TanStack Query)
20. Реализация навигации между модулями (React Router)
21. Настройка Capacitor для поддержки Android

### Средний приоритет
1. Реализация модуля Почта (клиент + сервер)
2. Реализация модуля Доски задач (клиент + сервер)
3. Адаптивный дизайн для Android (Tailwind CSS v4)
4. Интеграция Zod валидации между клиентом и сервером
5. Оптимизация производительности

### Низкий приоритет
1. Дополнительные фичи для сетевого диска
2. Темы оформления
3. Плагины и расширения

## 💡 Советы для ИИ

### При разработке
1. **Всегда проверяйте совместимость с Windows 7** для клиента - это критическое требование
2. **Сервер должен работать на Windows 10+** - отдельная программа
3. **Используйте Electron вместо Tauri** для Win7 поддержки
4. **Сохраняйте модульную структуру** - каждый модуль должен быть независимым
5. **Переиспользуйте компоненты** - чекбоксы, кнопки, карточки
6. **Следуйте текущему дизайну** - светлая тема с темноватыми градиентами, анимации
7. **Разделяйте клиент и сервер** - четкое разделение ответственности
8. **Используйте REST API или WebSocket** для связи между клиентом и сервером
9. **Тестируйте сначала с localhost**, затем переходите на удаленный сервер
10. **Поддержка только Android** - не тратить время на iOS

### При работе с клиент-серверной архитектурой
1. **Сначала реализуйте серверную часть** для текущей функциональности
2. **Замените локальные операции на API вызовы** в клиенте
3. **Используйте environment variables** для переключения между localhost и удаленным сервером
4. **Обрабатывайте ошибки сети** gracefully
5. **Добавьте загрузочные индикаторы** для API запросов
6. **Кэшируйте данные** на клиенте для оффлайн работы (опционально)
7. **Реализуйте аутентификацию** на сервере, авторизацию на клиенте

### При работе с чекбоксами
- Используйте Lottie анимацию по текущему паттерну
- Canvas 250x250, хитбокс 40x40
- Обертка .file-checkbox-wrapper с pointer-events: auto
- Canvas с pointer-events: none
- Центрирование через flexbox + transform

### При работе с Electron
- Используйте IPC для общения между процессами
- Безопасность: не используйте nodeIntegration в renderer
- Используйте contextBridge для безопасного API
- Учитывайте различия между main и renderer process

### При рефакторинге
1. Не меняйте дизайн без необходимости
2. Сохраняйте текущую функциональность сетевого диска
3. Пишите чистый, понятный код
4. Добавляйте комментарии для сложной логики
5. Следуйте принципу DRY (Don't Repeat Yourself)

## 🔍 Отладка и самотестирование ИИ

### Принципы работы ИИ
1. **ИИ должен добавлять отладочные модули** для самотестирования
2. **ИИ должен сам тестировать код** перед показом результата пользователю
3. **Запуск программы и тестирование:**
   - ИИ должен уметь запускать программу
   - Нажимать кнопки в интерфейсе
   - Заполнять поля
   - На каждое действие писать подробный лог
4. **Логирование тестов:**
   - Статус выполнения (успех/ошибка)
   - Ошибки и исключения
   - Время выполнения
   - Состояние приложения после действия
5. **Проблемы и тупики:**
   - Если ИИ зашел в тупик - честно признать
   - Не бесконечно пытаться решить проблему
   - Предложить другие варианты решения
   - Посоветоваться с пользователем что делать дальше
   - Предложить откатить код до предыдущей версии

### Отладочные модули для ИИ
**Автоматизированное тестирование:**
- Добавлять тестовые функции в код для проверки функциональности
- Использовать unit tests для проверки бизнес-логики
- Интеграционные тесты для проверки API

**Логирование:**
- Добавлять детальное логирование в ключевых точках
- Логировать все API запросы и ответы
- Логировать состояние приложения
- Логировать ошибки с полным stack trace

**Инструменты:**
- Jest/Vitest для unit тестов
- Playwright/Cypress для E2E тестов
- Winston/Pino для логирования на сервере
- Console.log для быстрой отладки

### Консоль браузера
- Используйте console.log для отладки
- Проверяйте ошибки в DevTools
- Тестируйте на разных версиях Windows

### Логи Electron
- electron-log для логирования
- Отладка main process через Chrome DevTools

## 📦 Сборка и дистрибуция

### Electron Builder
- Настроить для Windows 7
- Инсталлятор (NSIS или squirrel)
- Автообновление (опционально)

## 🎯 Цели MVP

### Клиентская часть
1. ✅ Сетевой диск (базовая функциональность, работает через localhost)
2. ⏳ Почта (базовая функциональность)
3. ⏳ Доски задач (базовая функциональность)
4. ⏳ Навигация между модулями
5. ⏳ Совместимость с Windows 7 (Electron)
6. ⏳ Совместимость с Android (Capacitor)

### Серверная часть
1. ⏳ Базовый сервер (Bun + Hono + TypeScript) для Windows 10
2. ⏳ Система профилей пользователей и ролей (Admin/User) - КРИТИЧНО
3. ⏳ REST API для сетевого диска (файлы и папки) с правами доступа
4. ⏳ REST API для почты с правами доступа
5. ⏳ REST API для досок задач с правами доступа
6. ⏳ Аутентификация и авторизация
7. ⏳ Хранение данных (файлы, письма, задачи, профили пользователей)

### Интеграция
1. ⏳ Замена локальных операций клиента на API вызовы
2. ⏳ Настройка подключения к удаленному серверу
3. ⏳ Обработка ошибок сети

## 📞 Контакты и контекст

- Пользователь говорит на русском языке
- Отвечать на русском языке
- Предлагать варианты реализации в виде тестов
- Спрашивать разрешение перед коммитами
- Использовать Vite для сборки
- Текущее состояние: Tauri (требует замены на Electron 22 для Windows 7)
- Целевое состояние: Electron 22 + React 19 + TypeScript + Bun + Hono
