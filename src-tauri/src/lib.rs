pub mod commands;
pub mod core;
pub mod engines;

use commands::conversion::{
    convert_csv_to_json, convert_image, convert_images_to_pdf, convert_json_to_csv,
    extract_pdf_pages, inspect_file, inspect_pdf, merge_pdfs, reveal_in_explorer,
    rotate_pdf, split_pdf,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            inspect_file,
            convert_image,
            reveal_in_explorer,
            inspect_pdf,
            merge_pdfs,
            rotate_pdf,
            extract_pdf_pages,
            split_pdf,
            convert_images_to_pdf,
            convert_csv_to_json,
            convert_json_to_csv,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Format Relay application");
}
