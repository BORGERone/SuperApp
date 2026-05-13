use crate::auth;
use axum::{
    extract::{Multipart, State},
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use tower_http::cors::{Any, CorsLayer};
use tower_http::limit::RequestBodyLimitLayer;

use crate::file_server;

#[derive(Clone)]
pub struct ServerState {
    pub users: HashMap<String, auth::User>,
    pub storage_path: String,
    pub access_permissions: HashMap<String, auth::AccessPermissions>,
}

impl ServerState {
    pub fn new() -> Self {
        let storage_path = "../storage".to_string();
        
        // Создаем директорию для хранения файлов
        std::fs::create_dir_all(&storage_path).expect("Failed to create storage directory");
        
        ServerState {
            users: auth::create_default_users(),
            storage_path,
            access_permissions: HashMap::new(),
        }
    }
}

#[derive(Serialize, Deserialize)]
struct LoginRequest {
    username: String,
    password: String,
}

#[derive(Serialize)]
struct LoginResponse {
    success: bool,
    message: String,
}

#[derive(Serialize)]
struct FileListResponse {
    files: Vec<String>,
}

async fn http_login(
    State(state): State<Arc<Mutex<ServerState>>>,
    Json(req): Json<LoginRequest>,
) -> Result<Json<LoginResponse>, StatusCode> {
    let state = state.lock().await;
    let authenticated = auth::authenticate(&req.username, &req.password, &state.users);
    
    if authenticated {
        Ok(Json(LoginResponse {
            success: true,
            message: "Login successful".to_string(),
        }))
    } else {
        Ok(Json(LoginResponse {
            success: false,
            message: "Invalid username or password".to_string(),
        }))
    }
}

async fn http_list_files(
    State(state): State<Arc<Mutex<ServerState>>>,
    axum::extract::Query(params): axum::extract::Query<std::collections::HashMap<String, String>>,
) -> Result<Json<FileListResponse>, StatusCode> {
    let path = params.get("path").map(|p| p.as_str()).unwrap_or("");
    let state = state.lock().await;
    
    match file_server::list_files(path, &state.storage_path) {
        Ok(files) => Ok(Json(FileListResponse { files })),
        Err(_e) => Err(StatusCode::BAD_REQUEST),
    }
}

async fn http_upload_file(
    State(state): State<Arc<Mutex<ServerState>>>,
    mut multipart: Multipart,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let state = state.lock().await;
    let mut path = "/".to_string();
    let mut filename = "unknown".to_string();
    let mut content: Option<Vec<u8>> = None;
    
    while let Some(field) = multipart.next_field().await.map_err(|e| {
        eprintln!("Error getting field: {:?}", e);
        StatusCode::BAD_REQUEST
    })? {
        let name = field.name().unwrap_or("").to_string();
        eprintln!("Processing field: {}", name);
        
        if name == "file" {
            filename = field.file_name().unwrap_or("unknown").to_string();
            eprintln!("File name: {}", filename);
            match field.bytes().await {
                Ok(bytes) => {
                    content = Some(bytes.to_vec());
                    eprintln!("File content size: {} bytes", content.as_ref().unwrap().len());
                }
                Err(e) => {
                    eprintln!("Error reading file bytes: {:?}", e);
                    return Err(StatusCode::BAD_REQUEST);
                }
            }
        } else if name == "path" {
            match field.bytes().await {
                Ok(path_bytes) => {
                    path = String::from_utf8(path_bytes.to_vec()).unwrap_or("/".to_string());
                    eprintln!("Path: {}", path);
                }
                Err(e) => {
                    eprintln!("Error reading path bytes: {:?}", e);
                }
            }
        }
    }
    
    if let Some(file_content) = content {
        eprintln!("Uploading file: {} to path: {}", filename, path);
        match file_server::upload_file(&path, &filename, &file_content, &state.storage_path) {
            Ok(_) => {
                eprintln!("File uploaded successfully");
                Ok(Json(serde_json::json!({"success": true})))
            }
            Err(e) => {
                eprintln!("Error uploading file: {:?}", e);
                Err(StatusCode::INTERNAL_SERVER_ERROR)
            }
        }
    } else {
        eprintln!("No file content found");
        Err(StatusCode::BAD_REQUEST)
    }
}

pub async fn start_server(state: Arc<Mutex<ServerState>>) {
    let app = Router::new()
        .route("/api/login", post(http_login))
        .route("/api/files", get(http_list_files))
        .route("/api/upload", post(http_upload_file))
        .layer(RequestBodyLimitLayer::new(1024 * 1024 * 1024)) // 1GB limit
        .layer(CorsLayer::new().allow_origin(Any).allow_methods(Any).allow_headers(Any))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("127.0.0.1:8080")
        .await
        .expect("Failed to bind to address");
    
    println!("HTTP Server running on http://127.0.0.1:8080");
    
    axum::serve(listener, app)
        .await
        .expect("Failed to start server");
}
