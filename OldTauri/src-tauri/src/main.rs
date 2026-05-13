#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod auth;
mod file_server;
mod server;

use std::sync::Arc;
use tokio::sync::Mutex;
use server::ServerState;

#[tauri::command]
async fn login(username: String, password: String, state: tauri::State<'_, Arc<Mutex<ServerState>>>) -> Result<bool, String> {
    let state = state.lock().await;
    Ok(auth::authenticate(&username, &password, &state.users))
}

#[tauri::command]
async fn get_users(state: tauri::State<'_, Arc<Mutex<ServerState>>>) -> Result<Vec<String>, String> {
    let state = state.lock().await;
    Ok(state.users.keys().cloned().collect())
}

#[tauri::command]
async fn get_user_info(username: String, state: tauri::State<'_, Arc<Mutex<ServerState>>>) -> Result<bool, String> {
    let state = state.lock().await;
    if let Some(user) = state.users.get(&username) {
        Ok(user.is_admin)
    } else {
        Err("User not found".to_string())
    }
}

#[tauri::command]
async fn get_file_permissions(file_path: String, state: tauri::State<'_, Arc<Mutex<ServerState>>>) -> Result<Vec<String>, String> {
    let state = state.lock().await;
    if let Some(permissions) = state.access_permissions.get(&file_path) {
        Ok(permissions.allowed_users.clone())
    } else {
        // Если прав нет, возвращаем пустой список (доступ всем)
        Ok(Vec::new())
    }
}

#[tauri::command]
async fn set_file_permissions(file_path: String, allowed_users: Vec<String>, state: tauri::State<'_, Arc<Mutex<ServerState>>>) -> Result<(), String> {
    let mut state = state.lock().await;
    
    if allowed_users.is_empty() {
        // Удаляем права доступа (доступ всем)
        state.access_permissions.remove(&file_path);
    } else {
        let permissions = auth::AccessPermissions {
            file_path: file_path.clone(),
            allowed_users,
        };
        state.access_permissions.insert(file_path, permissions);
    }
    
    Ok(())
}

#[tauri::command]
async fn list_files(path: String, username: String, state: tauri::State<'_, Arc<Mutex<ServerState>>>) -> Result<Vec<String>, String> {
    let state = state.lock().await;
    let all_files = file_server::list_files(&path, &state.storage_path)?;
    
    // Проверяем права доступа для каждого файла
    let filtered_files: Vec<String> = all_files
        .into_iter()
        .filter(|file| {
            let file_path = if path == "/" {
                format!("/{}", file)
            } else {
                format!("{}/{}", path, file)
            };
            
            // Админы видят всё
            if let Some(user) = state.users.get(&username) {
                if user.is_admin {
                    return true;
                }
            }
            
            // Проверяем права доступа к файлу
            if let Some(permissions) = state.access_permissions.get(&file_path) {
                // Если права установлены, проверяем есть ли пользователь в списке
                permissions.allowed_users.contains(&username)
            } else {
                // Если прав нет, доступ всем
                true
            }
        })
        .collect();
    
    Ok(filtered_files)
}

#[tauri::command]
async fn upload_file(path: String, name: String, content: Vec<u8>, state: tauri::State<'_, Arc<Mutex<ServerState>>>) -> Result<(), String> {
    let state = state.lock().await;
    file_server::upload_file(&path, &name, &content, &state.storage_path)
}

#[tauri::command]
async fn download_file(path: String, state: tauri::State<'_, Arc<Mutex<ServerState>>>) -> Result<Vec<u8>, String> {
    let state = state.lock().await;
    file_server::download_file(&path, &state.storage_path)
}

#[tauri::command]
async fn create_directory(path: String, name: String, state: tauri::State<'_, Arc<Mutex<ServerState>>>) -> Result<(), String> {
    let state = state.lock().await;
    file_server::create_directory(&path, &name, &state.storage_path)
}

#[tauri::command]
async fn delete_item(path: String, state: tauri::State<'_, Arc<Mutex<ServerState>>>) -> Result<(), String> {
    let state = state.lock().await;
    file_server::delete_item(&path, &state.storage_path)
}

#[tauri::command]
async fn save_file_with_dialog(default_name: String, content: Vec<u8>) -> Result<(), String> {
    use rfd::AsyncFileDialog;
    use std::env;
    
    // Получаем путь к папке загрузок для Windows
    let download_dir = if cfg!(target_os = "windows") {
        if let Ok(user_profile) = env::var("USERPROFILE") {
            format!("{}\\Downloads", user_profile)
        } else {
            "C:\\Users\\Default\\Downloads".to_string()
        }
    } else {
        // Для других ОС используем домашнюю директорию
        env::var("HOME").unwrap_or_else(|_| "/".to_string())
    };
    
    let file = AsyncFileDialog::new()
        .set_directory(download_dir)
        .set_file_name(&default_name)
        .save_file()
        .await
        .ok_or("Dialog cancelled")?;
    
    std::fs::write(file.path(), content).map_err(|e| e.to_string())
}

#[tauri::command]
async fn download_folder_as_zip(path: String, state: tauri::State<'_, Arc<Mutex<ServerState>>>) -> Result<Vec<u8>, String> {
    use std::io::{Cursor, Write};
    use zip::{ZipWriter, write::FileOptions};
    use walkdir::WalkDir;
    
    let state = state.lock().await;
    let folder_path = format!("{}{}", state.storage_path, path);
    
    let buffer = Cursor::new(Vec::new());
    let mut zip = ZipWriter::new(buffer);
    let options: FileOptions<'_, ()> = FileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);
    
    for entry in WalkDir::new(&folder_path) {
        let entry = entry.map_err(|e| e.to_string())?;
        let entry_path = entry.path();
        let relative_path = entry_path.strip_prefix(&state.storage_path)
            .map_err(|e| e.to_string())?;
        
        if entry_path.is_dir() {
            zip.add_directory_from_path(relative_path, options)
                .map_err(|e| e.to_string())?;
        } else {
            let file_content = std::fs::read(entry_path)
                .map_err(|e| e.to_string())?;
            zip.start_file(relative_path.to_str().unwrap(), options)
                .map_err(|e| e.to_string())?;
            zip.write_all(&file_content)
                .map_err(|e| e.to_string())?;
        }
    }
    
    let buffer = zip.finish().map_err(|e| e.to_string())?;
    Ok(buffer.into_inner())
}

fn main() {
    let server_state = Arc::new(Mutex::new(ServerState::new()));
    
    // Запуск HTTP сервера в контексте Tauri runtime
    let server_state_clone = server_state.clone();
    tauri::async_runtime::spawn(async move {
        server::start_server(server_state_clone).await;
    });

    tauri::Builder::default()
        .manage(server_state)
        .invoke_handler(tauri::generate_handler![
            login,
            get_users,
            get_user_info,
            get_file_permissions,
            set_file_permissions,
            list_files,
            upload_file,
            download_file,
            create_directory,
            delete_item,
            save_file_with_dialog,
            download_folder_as_zip
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
