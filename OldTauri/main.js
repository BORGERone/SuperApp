import { invoke } from '@tauri-apps/api/core';

let currentPath = '/';
let currentUser = null;
let isAdmin = false;
let viewMode = 'list'; // 'list' или 'grid'
let selectedFiles = new Set();

// Элементы DOM
const loginScreen = document.getElementById('login-screen');
const driveScreen = document.getElementById('drive-screen');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const currentUserSpan = document.getElementById('current-user');
const logoutBtn = document.getElementById('logout-btn');
const uploadBtn = document.getElementById('upload-btn');
const createFolderBtn = document.getElementById('create-folder-btn');
const refreshBtn = document.getElementById('refresh-btn');
const currentPathSpan = document.getElementById('current-path');
const fileList = document.getElementById('file-list');
const fileInput = document.getElementById('file-input');
const backBtn = document.getElementById('back-btn');
const viewModeBtn = document.getElementById('view-mode-btn');
const actionIsland = document.getElementById('action-island');
const islandDownloadBtn = document.getElementById('island-download-btn');
const islandDeleteBtn = document.getElementById('island-delete-btn');
const islandPermissionsBtn = document.getElementById('island-permissions-btn');
const permissionsModal = document.getElementById('permissions-modal');
const permissionsList = document.getElementById('permissions-list');
const closePermissionsModal = document.getElementById('close-permissions-modal');
const savePermissionsBtn = document.getElementById('save-permissions-btn');
const uploadProgress = document.getElementById('upload-progress');
const progressFill = document.querySelector('.progress-fill');
const progressText = document.querySelector('.progress-text');

// Получение иконки для файла по расширению
function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const icons = {
        'txt': '📄',
        'pdf': '📕',
        'doc': '📘',
        'docx': '📘',
        'xls': '📗',
        'xlsx': '📗',
        'ppt': '📙',
        'pptx': '📙',
        'jpg': '🖼️',
        'jpeg': '🖼️',
        'png': '🖼️',
        'gif': '🖼️',
        'mp3': '🎵',
        'mp4': '🎬',
        'avi': '🎬',
        'zip': '📦',
        'rar': '📦',
        'exe': '⚙️',
        'js': '📜',
        'html': '🌐',
        'css': '🎨',
        'json': '📋',
        'md': '📝'
    };
    return icons[ext] || '📄';
}

// Получение иконки папки
function getFolderIcon() {
    return '📁';
}

// Получение цвета градиента для типа файла
function getFileGradientColor(filename) {
    return 'rgba(211, 224, 251, 0.08)'; // #d3e0fb
}

// Получение цвета градиента для папки
function getFolderGradientColor() {
    return 'rgba(211, 224, 251, 0.08)'; // #d3e0fb
}

// Автозаполнение сохраненных данных
function loadSavedCredentials() {
    const savedUsername = localStorage.getItem('savedUsername');
    const savedPassword = localStorage.getItem('savedPassword');
    const rememberPassword = localStorage.getItem('rememberPassword') === 'true';
    
    if (savedUsername) {
        document.getElementById('username').value = savedUsername;
    }
    if (savedPassword) {
        document.getElementById('password').value = savedPassword;
    }
    document.getElementById('remember-password').checked = rememberPassword;
}

// Загружаем сохраненные данные при старте
loadSavedCredentials();

// Авторизация
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const rememberPassword = document.getElementById('remember-password').checked;
    
    try {
        const success = await invoke('login', { username, password });
        
        if (success) {
            currentUser = username;
            isAdmin = await invoke('get_user_info', { username });
            
            // Сохраняем пароль если нужно
            if (rememberPassword) {
                localStorage.setItem('savedUsername', username);
                localStorage.setItem('savedPassword', password);
                localStorage.setItem('rememberPassword', 'true');
            } else {
                localStorage.removeItem('savedUsername');
                localStorage.removeItem('savedPassword');
                localStorage.setItem('rememberPassword', 'false');
            }
            
            loginScreen.classList.add('hidden');
            driveScreen.classList.remove('hidden');
            currentUserSpan.textContent = username;
            loadFiles();
        } else {
            loginError.textContent = 'Неверный логин или пароль';
            loginError.style.display = 'block';
        }
    } catch (error) {
        console.error('Ошибка авторизации:', error);
        loginError.textContent = 'Ошибка авторизации: ' + error;
        loginError.style.display = 'block';
    }
});

function showError(message) {
    loginError.textContent = message;
    loginError.classList.add('show');
    setTimeout(() => {
        loginError.classList.remove('show');
    }, 3000);
}

function showDriveScreen() {
    loginScreen.classList.add('hidden');
    driveScreen.classList.remove('hidden');
    currentUserSpan.textContent = currentUser;
    loadFiles();
}

// Выход
logoutBtn.addEventListener('click', () => {
    currentUser = null;
    currentPath = '/';
    driveScreen.classList.add('hidden');
    loginScreen.classList.remove('hidden');
    loginForm.reset();
});

// Загрузка файлов
async function loadFiles() {
    try {
        const files = await invoke('list_files', { path: currentPath, username: currentUser });
        renderFiles(files);
        
        currentPathSpan.textContent = currentPath;
        backBtn.disabled = currentPath === '/';
    } catch (error) {
        console.error('Ошибка загрузки файлов:', error);
    }
}

function renderFiles(files) {
    if (files.length === 0) {
        fileList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📁</div>
                <div>Папка пуста</div>
            </div>
        `;
        return;
    }
    
    // Разделяем на папки и файлы
    const folders = files.filter(file => file.endsWith('/')).sort();
    const regularFiles = files.filter(file => !file.endsWith('/')).sort();
    const sortedFiles = [...folders, ...regularFiles];
    
    if (viewMode === 'list') {
        fileList.className = 'file-list';
        fileList.innerHTML = sortedFiles.map(file => {
            const isDirectory = file.endsWith('/');
            const icon = isDirectory ? getFolderIcon() : getFileIcon(file);
            const iconClass = isDirectory ? 'folder-icon' : '';
            const isSelected = selectedFiles.has(file);
            const displayName = isDirectory ? file.replace(/\/$/, '') : file;
            const gradientColor = isDirectory ? getFolderGradientColor() : getFileGradientColor(file);
            
            return `
                <div class="file-item ${isSelected ? 'selected' : ''}" data-name="${file}" data-gradient-color="${gradientColor}">
                    <input type="checkbox" class="file-checkbox selection-checkbox" ${isSelected ? 'checked' : ''}>
                    <span class="file-icon ${iconClass}">${icon}</span>
                    <span class="file-name">${displayName}</span>
                    <button class="file-delete-btn" data-name="${file}">🗑️</button>
                </div>
            `;
        }).join('');
    } else {
        fileList.className = 'file-list grid';
        fileList.innerHTML = sortedFiles.map(file => {
            const isDirectory = file.endsWith('/');
            const icon = isDirectory ? getFolderIcon() : getFileIcon(file);
            const iconClass = isDirectory ? 'folder-icon' : '';
            const isSelected = selectedFiles.has(file);
            const displayName = isDirectory ? file.replace(/\/$/, '') : file;
            const gradientColor = isDirectory ? getFolderGradientColor() : getFileGradientColor(file);
            
            return `
                <div class="file-item ${isSelected ? 'selected' : ''}" data-name="${file}" data-gradient-color="${gradientColor}">
                    <input type="checkbox" class="file-checkbox" ${isSelected ? 'checked' : ''}>
                    <div class="file-icon ${iconClass}">${icon}</div>
                    <div class="file-name">${displayName}</div>
                </div>
            `;
        }).join('');
    }
    
    attachFileListeners();
}

function attachFileListeners() {
    document.querySelectorAll('.file-item').forEach(item => {
        const gradientColor = item.dataset.gradientColor || 'rgba(102, 126, 234, 0.15)';
        item.style.setProperty('--gradient-color', gradientColor);
        
        item.addEventListener('click', (e) => {
            if (e.target.classList.contains('file-delete-btn')) {
                e.stopPropagation();
                deleteItem(item.dataset.name);
            } else if (e.target.classList.contains('file-checkbox')) {
                e.stopPropagation();
                toggleSelection(item.dataset.name);
            } else if (item.dataset.name.endsWith('/')) {
                navigateToDirectory(item.dataset.name);
            } else {
                downloadFile(item.dataset.name);
            }
        });
    });
    
    updateActionIsland();
}

// Навигация по папкам
function navigateToDirectory(name) {
    const dirName = name.replace(/\/$/, '');
    currentPath = currentPath === '/' ? `/${dirName}` : `${currentPath}/${dirName}`;
    selectedFiles.clear();
    actionIsland.classList.add('hidden');
    loadFiles();
}

// Загрузка файла
uploadBtn.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', async (e) => {
    const files = e.target.files;
    if (files.length === 0) return;
    
    // Показываем прогрессбар
    uploadProgress.classList.remove('hidden');
    
    let totalFiles = files.length;
    let uploadedFiles = 0;
    
    for (const file of files) {
        try {
            await uploadFileWithProgress(file);
            uploadedFiles++;
            const progress = (uploadedFiles / totalFiles) * 100;
            progressFill.style.width = `${progress}%`;
            progressText.textContent = `Загружено ${uploadedFiles}/${totalFiles} файлов`;
        } catch (error) {
            console.error('Ошибка загрузки файла:', error);
        }
    }
    
    fileInput.value = '';
    loadFiles();
    
    // Скрываем прогрессбар
    setTimeout(() => {
        uploadProgress.classList.add('hidden');
        progressFill.style.width = '0%';
    }, 500);
});

function uploadFileWithProgress(file) {
    return new Promise((resolve, reject) => {
        // Эмуляция прогресса на основе размера файла
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress > 90) progress = 90;
            progressFill.style.width = `${progress}%`;
            progressText.textContent = `Загрузка ${file.name}: ${Math.round(progress)}%`;
        }, 100);
        
        invoke('upload_file', {
            path: currentPath,
            name: file.name,
            content: Array.from(new Uint8Array(file))
        }).then(() => {
            clearInterval(interval);
            progressFill.style.width = '100%';
            progressText.textContent = `Загрузка ${file.name}: 100%`;
            setTimeout(resolve, 200);
        }).catch((error) => {
            clearInterval(interval);
            reject(error);
        });
    });
}

// Создание папки
createFolderBtn.addEventListener('click', async () => {
    const name = prompt('Введите название папки:');
    if (!name) return;
    
    try {
        await invoke('create_directory', { path: currentPath, name });
        loadFiles();
    } catch (error) {
        console.error('Ошибка создания папки:', error);
    }
});

// Удаление элемента
async function deleteItem(name) {
    const fullPath = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
    
    try {
        await invoke('delete_item', { path: fullPath });
        loadFiles();
    } catch (error) {
        console.error('Ошибка удаления:', error);
    }
}

// Скачивание файла
async function downloadFile(name) {
    const fullPath = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
    const isDirectory = name.endsWith('/');
    
    // Показываем прогрессбар
    uploadProgress.classList.remove('hidden');
    
    // Эмуляция прогресса скачивания с сервера
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 10;
        if (progress > 90) progress = 90;
        progressFill.style.width = `${progress}%`;
        progressText.textContent = `Скачивание ${name}: ${Math.round(progress)}%`;
    }, 100);
    
    try {
        let content;
        let defaultName;
        
        if (isDirectory) {
            // Скачиваем папку как архив
            content = await invoke('download_folder_as_zip', { path: fullPath });
            defaultName = name.replace(/\/$/, '') + '.zip';
        } else {
            // Скачиваем обычный файл
            content = await invoke('download_file', { path: fullPath });
            defaultName = name;
        }
        
        clearInterval(interval);
        progressFill.style.width = '100%';
        progressText.textContent = `Выберите место сохранения`;
        
        // Показываем диалог сохранения через Rust
        await invoke('save_file_with_dialog', {
            defaultName: defaultName,
            content: content
        });
    } catch (error) {
        clearInterval(interval);
        console.error('Ошибка скачивания файла:', error);
    }
    
    // Скрываем прогрессбар
    setTimeout(() => {
        uploadProgress.classList.add('hidden');
        progressFill.style.width = '0%';
    }, 500);
}

// Обновление
refreshBtn.addEventListener('click', loadFiles);

// Переключение режима отображения
viewModeBtn.addEventListener('click', () => {
    viewMode = viewMode === 'list' ? 'grid' : 'list';
    viewModeBtn.textContent = viewMode === 'list' ? '📋' : '▦';
    loadFiles();
});

// Переключение выделения файла
function toggleSelection(name) {
    if (selectedFiles.has(name)) {
        selectedFiles.delete(name);
    } else {
        selectedFiles.add(name);
    }
    loadFiles();
}

// Обновление островка действий
function updateActionIsland() {
    if (selectedFiles.size > 0) {
        actionIsland.classList.remove('hidden');
        // Показываем кнопку прав доступа только для админов
        if (isAdmin) {
            islandPermissionsBtn.classList.remove('hidden');
        } else {
            islandPermissionsBtn.classList.add('hidden');
        }
    } else {
        actionIsland.classList.add('hidden');
    }
}

// Удаление выбранных файлов
islandDeleteBtn.addEventListener('click', async () => {
    if (selectedFiles.size === 0) return;
    
    for (const name of selectedFiles) {
        try {
            await invoke('delete_item', { path: name });
        } catch (error) {
            console.error('Ошибка удаления:', name, error);
        }
    }
    
    selectedFiles.clear();
    loadFiles();
});

// Скачивание выбранных файлов
islandDownloadBtn.addEventListener('click', async () => {
    if (selectedFiles.size === 0) return;
    
    for (const name of selectedFiles) {
        try {
            await downloadFile(name);
        } catch (error) {
            console.error('Ошибка скачивания:', name, error);
        }
    }
    
    selectedFiles.clear();
    loadFiles();
});

// Открытие модального окна прав доступа
islandPermissionsBtn.addEventListener('click', async () => {
    if (selectedFiles.size === 0) return;
    
    try {
        const users = await invoke('get_users');
        const firstFile = Array.from(selectedFiles)[0];
        const fullPath = currentPath === '/' ? `/${firstFile}` : `${currentPath}/${firstFile}`;
        const allowedUsers = await invoke('get_file_permissions', { filePath: fullPath });
        
        // Рендерим список пользователей с чекбоксами
        permissionsList.innerHTML = users.map(user => `
            <div class="permissions-item">
                <label>${user}</label>
                <input type="checkbox" class="permission-checkbox" data-user="${user}" ${allowedUsers.includes(user) ? 'checked' : ''}>
            </div>
        `).join('');
        
        permissionsModal.classList.remove('hidden');
    } catch (error) {
        console.error('Ошибка загрузки прав:', error);
    }
});

// Закрытие модального окна
closePermissionsModal.addEventListener('click', () => {
    permissionsModal.classList.add('hidden');
});

// Сохранение прав доступа
savePermissionsBtn.addEventListener('click', async () => {
    if (selectedFiles.size === 0) return;
    
    try {
        const checkboxes = document.querySelectorAll('.permission-checkbox');
        const allowedUsers = Array.from(checkboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.dataset.user);
        
        for (const name of selectedFiles) {
            const fullPath = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
            await invoke('set_file_permissions', {
                filePath: fullPath,
                allowedUsers: allowedUsers
            });
        }
        
        permissionsModal.classList.add('hidden');
        selectedFiles.clear();
        loadFiles();
    } catch (error) {
        console.error('Ошибка сохранения прав:', error);
    }
});

// Навигация назад (через кнопку)
backBtn.addEventListener('click', () => {
    if (currentPath !== '/') {
        const parts = currentPath.split('/').filter(p => p);
        parts.pop();
        currentPath = parts.length === 0 ? '/' : '/' + parts.join('/');
        selectedFiles.clear();
        actionIsland.classList.add('hidden');
        loadFiles();
    }
});

// Навигация назад (через breadcrumb)
currentPathSpan.addEventListener('click', () => {
    if (currentPath !== '/') {
        const parts = currentPath.split('/').filter(p => p);
        parts.pop();
        currentPath = parts.length === 0 ? '/' : '/' + parts.join('/');
        selectedFiles.clear();
        actionIsland.classList.add('hidden');
        loadFiles();
    }
});
