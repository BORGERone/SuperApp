use std::fs;
use std::path::Path;

pub fn get_full_path(relative_path: &str, storage_path: &str) -> std::path::PathBuf {
    let path = if relative_path.is_empty() || relative_path == "/" {
        storage_path.to_string()
    } else {
        format!("{}/{}", storage_path, relative_path.trim_start_matches('/'))
    };
    Path::new(&path).to_path_buf()
}

pub fn list_files(relative_path: &str, storage_path: &str) -> Result<Vec<String>, String> {
    let full_path = get_full_path(relative_path, storage_path);
    
    if !full_path.exists() {
        return Err(format!("Path does not exist: {}", relative_path));
    }
    
    let mut items = Vec::new();
    
    for entry in fs::read_dir(&full_path).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let file_name = entry.file_name().to_string_lossy().to_string();
        
        if entry.path().is_dir() {
            items.push(format!("{}/", file_name));
        } else {
            items.push(file_name);
        }
    }
    
    items.sort();
    Ok(items)
}

pub fn upload_file(relative_path: &str, name: &str, content: &[u8], storage_path: &str) -> Result<(), String> {
    let full_path = get_full_path(relative_path, storage_path);
    
    if !full_path.exists() {
        fs::create_dir_all(&full_path).map_err(|e| e.to_string())?;
    }
    
    let file_path = full_path.join(name);
    fs::write(&file_path, content).map_err(|e| e.to_string())?;
    
    Ok(())
}

pub fn download_file(relative_path: &str, storage_path: &str) -> Result<Vec<u8>, String> {
    let full_path = get_full_path(relative_path, storage_path);
    
    if !full_path.exists() {
        return Err(format!("File does not exist: {}", relative_path));
    }
    
    fs::read(&full_path).map_err(|e| e.to_string())
}

pub fn create_directory(relative_path: &str, name: &str, storage_path: &str) -> Result<(), String> {
    let full_path = get_full_path(relative_path, storage_path);
    
    if !full_path.exists() {
        fs::create_dir_all(&full_path).map_err(|e| e.to_string())?;
    }
    
    let dir_path = full_path.join(name);
    fs::create_dir(&dir_path).map_err(|e| e.to_string())?;
    
    Ok(())
}

pub fn delete_item(relative_path: &str, storage_path: &str) -> Result<(), String> {
    let full_path = get_full_path(relative_path, storage_path);
    
    if !full_path.exists() {
        return Err(format!("Item does not exist: {}", relative_path));
    }
    
    if full_path.is_dir() {
        fs::remove_dir_all(&full_path).map_err(|e| e.to_string())?;
    } else {
        fs::remove_file(&full_path).map_err(|e| e.to_string())?;
    }
    
    Ok(())
}
