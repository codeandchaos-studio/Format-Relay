use crate::core::error::RelayError;
use lopdf::content::{Content, Operation};
use lopdf::{dictionary, Document, Object, ObjectId, Stream};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PdfPageSummary {
    pub page_number: u32,
    pub width: f64,
    pub height: f64,
    pub rotation: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PdfInfo {
    pub page_count: u32,
    pub version: String,
    pub is_encrypted: bool,
    pub pages: Vec<PdfPageSummary>,
}

fn object_to_f64(obj: &Object) -> Option<f64> {
    match obj {
        Object::Integer(i) => Some(*i as f64),
        Object::Real(f) => Some(*f as f64),
        _ => None,
    }
}

pub struct NativePdfEngine;

impl NativePdfEngine {
    pub fn new() -> Self {
        Self
    }

    /// Inspects PDF metadata and individual page dimensions and rotations
    pub fn get_info(path: &Path) -> Result<PdfInfo, RelayError> {
        let doc = Document::load(path)
            .map_err(|e| RelayError::InspectionFailed(format!("Failed to parse PDF document: {}", e)))?;

        let is_encrypted = doc.is_encrypted();
        let version = doc.version.clone();
        let pages_map = doc.get_pages();
        let page_count = pages_map.len() as u32;

        let mut pages = Vec::with_capacity(pages_map.len());
        for (page_num, page_id) in pages_map {
            let mut width = 595.0; // standard A4 default
            let mut height = 842.0;
            let mut rotation = 0;

            if let Ok(page_dict) = doc.get_dictionary(page_id) {
                if let Ok(rot_obj) = page_dict.get(b"Rotate") {
                    if let Ok(rot) = rot_obj.as_i64() {
                        rotation = rot;
                    }
                }

                if let Ok(media_box) = page_dict.get(b"MediaBox").and_then(|o| o.as_array()) {
                    if media_box.len() == 4 {
                        let x0 = object_to_f64(&media_box[0]).unwrap_or(0.0);
                        let y0 = object_to_f64(&media_box[1]).unwrap_or(0.0);
                        let x1 = object_to_f64(&media_box[2]).unwrap_or(595.0);
                        let y1 = object_to_f64(&media_box[3]).unwrap_or(842.0);
                        width = (x1 - x0).abs();
                        height = (y1 - y0).abs();
                    }
                }
            }

            pages.push(PdfPageSummary {
                page_number: page_num,
                width,
                height,
                rotation,
            });
        }

        Ok(PdfInfo {
            page_count,
            version,
            is_encrypted,
            pages,
        })
    }

    /// Merges multiple PDF files into a single output document
    pub fn merge(inputs: &[PathBuf], output_path: &Path) -> Result<u32, RelayError> {
        if inputs.len() < 2 {
            return Err(RelayError::ConversionFailed(
                "At least 2 PDF files are required for merging".to_string(),
            ));
        }

        let mut documents = Vec::with_capacity(inputs.len());
        for input in inputs {
            let doc = Document::load(input).map_err(|e| {
                RelayError::ConversionFailed(format!(
                    "Failed to load PDF {}: {}",
                    input.display(),
                    e
                ))
            })?;

            if doc.is_encrypted() {
                return Err(RelayError::ConversionFailed(format!(
                    "Cannot merge encrypted PDF without password: {}",
                    input.display()
                )));
            }

            documents.push(doc);
        }

        let mut merged_doc = Document::with_version("1.5");
        let mut max_id = 1;
        let mut documents_pages = BTreeMap::new();
        let mut documents_objects = BTreeMap::new();

        for mut doc in documents {
            doc.renumber_objects_with(max_id);
            max_id = doc.max_id + 1;

            let pages = doc.get_pages();
            for (_, object_id) in pages {
                if let Ok(obj) = doc.get_object(object_id) {
                    documents_pages.insert(object_id, obj.clone());
                }
            }
            documents_objects.extend(doc.objects);
        }

        let mut catalog_object: Option<(ObjectId, Object)> = None;
        let mut pages_object: Option<(ObjectId, Object)> = None;

        for (object_id, object) in documents_objects.into_iter() {
            match object.type_name().unwrap_or(b"") {
                b"Catalog" => {
                    catalog_object = Some((
                        if let Some((id, _)) = catalog_object { id } else { object_id },
                        object,
                    ));
                }
                b"Pages" => {
                    if let Ok(dictionary) = object.as_dict() {
                        let mut dictionary = dictionary.clone();
                        if let Some((_, ref old_obj)) = pages_object {
                            if let Ok(old_dict) = old_obj.as_dict() {
                                dictionary.extend(old_dict);
                            }
                        }
                        pages_object = Some((
                            if let Some((id, _)) = pages_object { id } else { object_id },
                            Object::Dictionary(dictionary),
                        ));
                    }
                }
                b"Page" | b"Outlines" | b"Outline" => {}
                _ => {
                    merged_doc.objects.insert(object_id, object);
                }
            }
        }

        let (page_id, page_obj) = pages_object.ok_or_else(|| {
            RelayError::ConversionFailed("No valid Pages root found in source PDFs".to_string())
        })?;

        let (catalog_id, catalog_obj) = catalog_object.ok_or_else(|| {
            RelayError::ConversionFailed("No valid Catalog root found in source PDFs".to_string())
        })?;

        // Link pages to common parent Pages node
        for (object_id, object) in documents_pages.iter() {
            if let Ok(dictionary) = object.as_dict() {
                let mut dictionary = dictionary.clone();
                dictionary.set("Parent", page_id);
                merged_doc.objects.insert(*object_id, Object::Dictionary(dictionary));
            }
        }

        let total_pages = documents_pages.len() as u32;

        // Finalize Pages node
        if let Ok(dictionary) = page_obj.as_dict() {
            let mut dictionary = dictionary.clone();
            dictionary.set("Count", total_pages);
            dictionary.set(
                "Kids",
                documents_pages.into_keys().map(Object::Reference).collect::<Vec<_>>(),
            );
            merged_doc.objects.insert(page_id, Object::Dictionary(dictionary));
        }

        // Finalize Catalog node
        if let Ok(dictionary) = catalog_obj.as_dict() {
            let mut dictionary = dictionary.clone();
            dictionary.set("Pages", page_id);
            dictionary.remove(b"Outlines");
            merged_doc.objects.insert(catalog_id, Object::Dictionary(dictionary));
        }

        merged_doc.trailer.set("Root", catalog_id);
        merged_doc.max_id = merged_doc.objects.len() as u32;
        merged_doc.renumber_objects();
        merged_doc.compress();

        merged_doc.save(output_path).map_err(|e| {
            RelayError::ConversionFailed(format!("Failed to save merged PDF: {}", e))
        })?;

        Ok(total_pages)
    }

    /// Rotates pages in a PDF document by 90, 180, or 270 degrees.
    /// If pages is None, all pages are rotated.
    pub fn rotate(
        input: &Path,
        output_path: &Path,
        angle: i32,
        pages: Option<&[u32]>,
    ) -> Result<u32, RelayError> {
        if angle % 90 != 0 {
            return Err(RelayError::ConversionFailed(
                "Rotation angle must be a multiple of 90 degrees".to_string(),
            ));
        }

        let mut doc = Document::load(input).map_err(|e| {
            RelayError::ConversionFailed(format!("Failed to load PDF {}: {}", input.display(), e))
        })?;

        if doc.is_encrypted() {
            return Err(RelayError::ConversionFailed(
                "Cannot rotate encrypted PDF without password".to_string(),
            ));
        }

        let pages_map = doc.get_pages();
        let total_pages = pages_map.len() as u32;

        for (page_num, page_id) in pages_map {
            let should_rotate = match pages {
                Some(p_list) => p_list.contains(&page_num),
                None => true,
            };

            if should_rotate {
                if let Ok(page_dict) = doc.get_dictionary_mut(page_id) {
                    let current_rotation = page_dict
                        .get(b"Rotate")
                        .and_then(|obj| obj.as_i64())
                        .unwrap_or(0);

                    let mut new_rotation = (current_rotation + angle as i64) % 360;
                    if new_rotation < 0 {
                        new_rotation += 360;
                    }
                    page_dict.set("Rotate", new_rotation);
                }
            }
        }

        doc.save(output_path).map_err(|e| {
            RelayError::ConversionFailed(format!("Failed to save rotated PDF: {}", e))
        })?;

        Ok(total_pages)
    }

    /// Extracts specific page numbers into a standalone output PDF
    pub fn extract_pages(
        input: &Path,
        output_path: &Path,
        pages_to_keep: &[u32],
    ) -> Result<u32, RelayError> {
        if pages_to_keep.is_empty() {
            return Err(RelayError::ConversionFailed(
                "At least one page must be specified for extraction".to_string(),
            ));
        }

        let mut doc = Document::load(input).map_err(|e| {
            RelayError::ConversionFailed(format!("Failed to load PDF {}: {}", input.display(), e))
        })?;

        if doc.is_encrypted() {
            return Err(RelayError::ConversionFailed(
                "Cannot extract pages from encrypted PDF".to_string(),
            ));
        }

        let total_pages = doc.get_pages().len() as u32;
        let to_delete: Vec<u32> = (1..=total_pages)
            .filter(|p| !pages_to_keep.contains(p))
            .collect();

        if to_delete.len() as u32 >= total_pages {
            return Err(RelayError::ConversionFailed(
                "Requested pages do not exist in the source document".to_string(),
            ));
        }

        doc.delete_pages(&to_delete);
        doc.prune_objects();
        doc.renumber_objects();

        doc.save(output_path).map_err(|e| {
            RelayError::ConversionFailed(format!("Failed to save extracted PDF: {}", e))
        })?;

        Ok(pages_to_keep.len() as u32)
    }

    /// Splits a PDF document into individual single-page documents
    pub fn split_all_pages(
        input: &Path,
        output_dir: &Path,
    ) -> Result<Vec<PathBuf>, RelayError> {
        let doc = Document::load(input).map_err(|e| {
            RelayError::ConversionFailed(format!("Failed to load PDF {}: {}", input.display(), e))
        })?;

        if doc.is_encrypted() {
            return Err(RelayError::ConversionFailed(
                "Cannot split encrypted PDF".to_string(),
            ));
        }

        let total_pages = doc.get_pages().len() as u32;
        let file_stem = input
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("document");

        let mut created_files = Vec::with_capacity(total_pages as usize);

        for page in 1..=total_pages {
            let mut page_doc = doc.clone();
            let to_delete: Vec<u32> = (1..=total_pages).filter(|&p| p != page).collect();
            page_doc.delete_pages(&to_delete);
            page_doc.prune_objects();
            page_doc.renumber_objects();

            let target_file = output_dir.join(format!("{}_page_{:03}.pdf", file_stem, page));
            page_doc.save(&target_file).map_err(|e| {
                RelayError::ConversionFailed(format!(
                    "Failed to save split page {}: {}",
                    page, e
                ))
            })?;

            created_files.push(target_file);
        }

        Ok(created_files)
    }

    /// Converts a collection of image files into a single unified multi-page PDF document
    pub fn images_to_pdf(image_paths: &[PathBuf], output_path: &Path) -> Result<u32, RelayError> {
        if image_paths.is_empty() {
            return Err(RelayError::ConversionFailed(
                "At least one image path must be provided".to_string(),
            ));
        }

        let mut doc = Document::with_version("1.5");
        let pages_id = doc.new_object_id();
        let mut page_ids = Vec::with_capacity(image_paths.len());

        for (idx, img_path) in image_paths.iter().enumerate() {
            let img = image::open(img_path).map_err(|e| {
                RelayError::ConversionFailed(format!(
                    "Failed to read image {}: {}",
                    img_path.display(),
                    e
                ))
            })?;

            let rgb_img = img.to_rgb8();
            let (width, height) = rgb_img.dimensions();
            let raw_bytes = rgb_img.into_raw();

            // Compress raw RGB bytes using flate/zlib
            let compressed_bytes = miniz_oxide::deflate::compress_to_vec_zlib(&raw_bytes, 6);

            let image_xobject_id = doc.add_object(Stream::new(
                dictionary! {
                    "Type" => "XObject",
                    "Subtype" => "Image",
                    "Width" => width as i64,
                    "Height" => height as i64,
                    "ColorSpace" => "DeviceRGB",
                    "BitsPerComponent" => 8,
                    "Filter" => "FlateDecode",
                },
                compressed_bytes,
            ));

            let image_ref_name = format!("Im{}", idx + 1);
            let resources_id = doc.add_object(dictionary! {
                "XObject" => dictionary! {
                    image_ref_name.as_str() => image_xobject_id,
                },
            });

            // Stream placing image on canvas scaled to width x height
            let content = Content {
                operations: vec![
                    Operation::new("q", vec![]),
                    Operation::new(
                        "cm",
                        vec![
                            (width as f64).into(),
                            0.into(),
                            0.into(),
                            (height as f64).into(),
                            0.into(),
                            0.into(),
                        ],
                    ),
                    Operation::new("Do", vec![image_ref_name.into()]),
                    Operation::new("Q", vec![]),
                ],
            };

            let content_id = doc.add_object(Stream::new(
                dictionary! {},
                content.encode().map_err(|e| {
                    RelayError::ConversionFailed(format!("Failed to encode PDF content stream: {}", e))
                })?,
            ));

            let page_id = doc.add_object(dictionary! {
                "Type" => "Page",
                "Parent" => pages_id,
                "Contents" => content_id,
                "Resources" => resources_id,
                "MediaBox" => vec![0.into(), 0.into(), (width as f64).into(), (height as f64).into()],
            });

            page_ids.push(page_id);
        }

        let pages_dict = dictionary! {
            "Type" => "Pages",
            "Kids" => page_ids.iter().map(|&id| Object::Reference(id)).collect::<Vec<_>>(),
            "Count" => page_ids.len() as u32,
        };
        doc.objects.insert(pages_id, Object::Dictionary(pages_dict));

        let catalog_id = doc.add_object(dictionary! {
            "Type" => "Catalog",
            "Pages" => pages_id,
        });

        doc.trailer.set("Root", catalog_id);
        doc.compress();

        doc.save(output_path).map_err(|e| {
            RelayError::ConversionFailed(format!("Failed to save images PDF: {}", e))
        })?;

        Ok(page_ids.len() as u32)
    }
}
