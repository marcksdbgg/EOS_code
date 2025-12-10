#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

#[tauri::command]
async fn ask_llm(prompt: String, history: Vec<serde_json::Value>) -> Result<String, String> {
    let client = reqwest::Client::new();
    
    // Build conversation context from history
    let mut full_prompt = String::new();
    for msg in &history {
        if let (Some(role), Some(content)) = (
            msg.get("role").and_then(|v| v.as_str()),
            msg.get("content").and_then(|v| v.as_str())
        ) {
            match role {
                "user" => full_prompt.push_str(&format!("User: {}\n", content)),
                "assistant" => full_prompt.push_str(&format!("Assistant: {}\n", content)),
                _ => {}
            }
        }
    }
    full_prompt.push_str(&format!("User: {}\nAssistant:", prompt));

    // llama.cpp server completion endpoint
    let body = serde_json::json!({
        "prompt": full_prompt,
        "n_predict": 512,
        "temperature": 0.7,
        "top_p": 0.9,
        "stop": ["User:", "\n\n"]
    });

    let resp = client
        .post("http://localhost:8080/completion")
        .json(&body)
        .timeout(std::time::Duration::from_secs(120))
        .send()
        .await
        .map_err(|e| format!("HTTP error: {}", e))?;

    let value: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("JSON parse error: {}", e))?;

    Ok(value
        .get("content")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string())
}

#[tauri::command]
async fn minimize_window(window: tauri::Window) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

#[tauri::command]
async fn close_window(window: tauri::Window) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Ensure window stays on top
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_always_on_top(true);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![ask_llm, minimize_window, close_window])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
