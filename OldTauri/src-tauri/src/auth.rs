use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub username: String,
    pub password_hash: String,
    pub is_admin: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccessPermissions {
    pub file_path: String,
    pub allowed_users: Vec<String>,
}

pub fn hash_password(password: &str) -> String {
    use sha2::{Sha256, Digest};
    let mut hasher = Sha256::new();
    hasher.update(password.as_bytes());
    format!("{:x}", hasher.finalize())
}

pub fn authenticate(username: &str, password: &str, users: &HashMap<String, User>) -> bool {
    if let Some(user) = users.get(username) {
        let password_hash = hash_password(password);
        user.password_hash == password_hash
    } else {
        false
    }
}

pub fn create_default_users() -> HashMap<String, User> {
    let mut users = HashMap::new();
    
    // admin / 1111
    users.insert(
        "admin".to_string(),
        User {
            username: "admin".to_string(),
            password_hash: hash_password("1111"),
            is_admin: true,
        }
    );
    
    // user / 1111
    users.insert(
        "user".to_string(),
        User {
            username: "user".to_string(),
            password_hash: hash_password("1111"),
            is_admin: false,
        }
    );
    
    users
}
