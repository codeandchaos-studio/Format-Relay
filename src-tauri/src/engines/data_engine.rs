use crate::core::error::RelayError;
use serde_json::{json, Map, Value};
use std::fs::File;
use std::io::{BufRead, BufReader, BufWriter, Write};
use std::path::Path;

pub struct NativeDataEngine;

impl NativeDataEngine {
    pub fn new() -> Self {
        Self
    }

    /// Converts a CSV/TSV/DSV file into structured JSON
    pub fn csv_to_json(
        input_path: &Path,
        output_path: &Path,
        delimiter: char,
        pretty: bool,
    ) -> Result<usize, RelayError> {
        let file = File::open(input_path).map_err(RelayError::Io)?;
        let reader = BufReader::new(file);

        let mut lines = reader.lines();
        let header_line = match lines.next() {
            Some(line) => line.map_err(RelayError::Io)?,
            None => {
                return Err(RelayError::ConversionFailed(
                    "Input CSV file is empty".to_string(),
                ));
            }
        };

        let headers = parse_csv_line(&header_line, delimiter);
        if headers.is_empty() {
            return Err(RelayError::ConversionFailed(
                "No column headers found in CSV".to_string(),
            ));
        }

        let mut records = Vec::new();

        for line_result in lines {
            let line = line_result.map_err(RelayError::Io)?;
            if line.trim().is_empty() {
                continue;
            }

            let fields = parse_csv_line(&line, delimiter);
            let mut record_map = Map::new();

            for (idx, header) in headers.iter().enumerate() {
                let value_str = fields.get(idx).map(|s| s.as_str()).unwrap_or("");
                let parsed_val = parse_inferred_value(value_str);
                record_map.insert(header.clone(), parsed_val);
            }

            records.push(Value::Object(record_map));
        }

        let out_file = File::create(output_path).map_err(RelayError::Io)?;
        let mut writer = BufWriter::new(out_file);

        if pretty {
            serde_json::to_writer_pretty(&mut writer, &records)
                .map_err(|e| RelayError::ConversionFailed(format!("Failed to serialize JSON: {}", e)))?;
        } else {
            serde_json::to_writer(&mut writer, &records)
                .map_err(|e| RelayError::ConversionFailed(format!("Failed to serialize JSON: {}", e)))?;
        }

        writer.flush().map_err(RelayError::Io)?;
        Ok(records.len())
    }

    /// Converts a JSON array of objects into structured CSV
    pub fn json_to_csv(
        input_path: &Path,
        output_path: &Path,
        delimiter: char,
    ) -> Result<usize, RelayError> {
        let file = File::open(input_path).map_err(RelayError::Io)?;
        let reader = BufReader::new(file);

        let json_value: Value = serde_json::from_reader(reader)
            .map_err(|e| RelayError::ConversionFailed(format!("Invalid JSON syntax: {}", e)))?;

        let array = match json_value {
            Value::Array(arr) => arr,
            Value::Object(obj) => vec![Value::Object(obj)],
            _ => {
                return Err(RelayError::ConversionFailed(
                    "JSON input must be an array of objects or a single object".to_string(),
                ));
            }
        };

        if array.is_empty() {
            return Err(RelayError::ConversionFailed(
                "JSON array is empty, cannot generate CSV".to_string(),
            ));
        }

        // Determine all unique headers across all records preserving order
        let mut headers = Vec::new();
        for item in &array {
            if let Value::Object(obj) = item {
                for key in obj.keys() {
                    if !headers.contains(key) {
                        headers.push(key.clone());
                    }
                }
            }
        }

        if headers.is_empty() {
            return Err(RelayError::ConversionFailed(
                "No object properties found to construct CSV columns".to_string(),
            ));
        }

        let out_file = File::create(output_path).map_err(RelayError::Io)?;
        let mut writer = BufWriter::new(out_file);

        // Write header row
        let header_row = headers
            .iter()
            .map(|h| escape_csv_field(h, delimiter))
            .collect::<Vec<_>>()
            .join(&delimiter.to_string());
        writeln!(writer, "{}", header_row).map_err(RelayError::Io)?;

        // Write data rows
        let mut row_count = 0;
        for item in &array {
            if let Value::Object(obj) = item {
                let row_str = headers
                    .iter()
                    .map(|h| {
                        let val_str = match obj.get(h) {
                            Some(Value::Null) | None => "".to_string(),
                            Some(Value::String(s)) => s.clone(),
                            Some(Value::Number(n)) => n.to_string(),
                            Some(Value::Bool(b)) => b.to_string(),
                            Some(complex) => complex.to_string(),
                        };
                        escape_csv_field(&val_str, delimiter)
                    })
                    .collect::<Vec<_>>()
                    .join(&delimiter.to_string());

                writeln!(writer, "{}", row_str).map_err(RelayError::Io)?;
                row_count += 1;
            }
        }

        writer.flush().map_err(RelayError::Io)?;
        Ok(row_count)
    }
}

/// Parses a single CSV line according to RFC 4180 rules
pub fn parse_csv_line(line: &str, delimiter: char) -> Vec<String> {
    let mut fields = Vec::new();
    let mut current_field = String::new();
    let mut inside_quotes = false;
    let chars: Vec<char> = line.chars().collect();
    let mut i = 0;

    while i < chars.len() {
        let c = chars[i];
        if c == '"' {
            if inside_quotes && i + 1 < chars.len() && chars[i + 1] == '"' {
                current_field.push('"');
                i += 1; // skip escaped quote
            } else {
                inside_quotes = !inside_quotes;
            }
        } else if c == delimiter && !inside_quotes {
            fields.push(current_field.trim().to_string());
            current_field = String::new();
        } else {
            current_field.push(c);
        }
        i += 1;
    }
    fields.push(current_field.trim().to_string());
    fields
}

/// Escapes a CSV field if it contains delimiters, quotes, or newlines
pub fn escape_csv_field(field: &str, delimiter: char) -> String {
    let needs_quotes = field.contains(delimiter)
        || field.contains('"')
        || field.contains('\n')
        || field.contains('\r');

    if needs_quotes {
        let escaped = field.replace('"', "\"\"");
        format!("\"{}\"", escaped)
    } else {
        field.to_string()
    }
}

/// Infers numeric, boolean, or string types for JSON serialization
fn parse_inferred_value(val: &str) -> Value {
    if val.eq_ignore_ascii_case("true") {
        return json!(true);
    }
    if val.eq_ignore_ascii_case("false") {
        return json!(false);
    }
    if val.eq_ignore_ascii_case("null") || val.is_empty() {
        return Value::Null;
    }
    if let Ok(int_val) = val.parse::<i64>() {
        return json!(int_val);
    }
    if let Ok(float_val) = val.parse::<f64>() {
        if float_val.is_finite() {
            return json!(float_val);
        }
    }
    json!(val)
}
