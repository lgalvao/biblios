import json
import csv
import os

# Paths
mappings_path = "/Users/leonardo/.gemini/antigravity/brain/fa2cb1e0-ba42-427e-a609-7e3d7abcb4cf/scratch/year_mappings.json"
script_dir = os.path.dirname(os.path.abspath(__file__))
json_path = os.path.abspath(os.path.join(script_dir, "data.json"))
csv_path = os.path.abspath(os.path.join(script_dir, "../../data.csv"))

def run_migration():
    print("=== Starting Publication Year Migration ===")
    
    # 1. Load Year Mappings
    if not os.path.exists(mappings_path):
        print(f"Error: Mappings file not found at {mappings_path}")
        return
    with open(mappings_path, 'r', encoding='utf-8') as f:
        mappings = json.load(f)
    print(f"Loaded {len(mappings)} mappings from year_mappings.json.")

    # Normalization helper to ensure matches
    def make_key(title, author):
        return f"{title.strip()} | {author.strip()}"

    mappings_norm = {k.strip().lower(): v for k, v in mappings.items()}

    # 2. Update data.json
    if not os.path.exists(json_path):
        print(f"Error: data.json not found at {json_path}")
        return
        
    with open(json_path, 'r', encoding='utf-8') as f:
        json_data = json.load(f)
        
    print(f"Loaded {len(json_data)} records from data.json.")
    
    updated_json_count = 0
    not_found_keys = []
    
    for book in json_data:
        title = book.get("title", "")
        author = book.get("author", "")
        current_year = str(book.get("year", ""))
        
        # Check if year is a 1950 placeholder
        if current_year == "1950":
            key = make_key(title, author)
            key_lower = key.lower()
            
            if key_lower in mappings_norm:
                new_year = mappings_norm[key_lower]
                book["year"] = new_year
                updated_json_count += 1
            else:
                not_found_keys.append(key)
                
    # Save back data.json
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(json_data, f, indent=2, ensure_ascii=False)
    print(f"Successfully updated {updated_json_count} books in data.json.")
    if not_found_keys:
        print(f"Warning: {len(not_found_keys)} books with year 1950 were not found in mappings (they will remain 1950):")
        for k in not_found_keys[:10]:
            print(f"  - {k}")
        if len(not_found_keys) > 10:
            print("  ... and others")

    # 3. Update data.csv
    if not os.path.exists(csv_path):
        print(f"Error: data.csv not found at {csv_path}")
        return
        
    csv_rows = []
    with open(csv_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.reader(f)
        header = next(reader)
        for row in reader:
            csv_rows.append(row)
            
    print(f"Loaded {len(csv_rows)} rows from data.csv.")
    
    updated_csv_count = 0
    
    # We map columns by index:
    # 0: Title, 1: Author, 2: Year, 3: Country, 4: Continent, 5: Read, 6: OriginalLanguage, 7: Pages, 8: Description
    for row in csv_rows:
        if len(row) >= 3:
            title = row[0].strip()
            author = row[1].strip()
            current_year = row[2].strip()
            
            if current_year == "1950":
                key = make_key(title, author)
                key_lower = key.lower()
                
                if key_lower in mappings_norm:
                    row[2] = mappings_norm[key_lower]
                    updated_csv_count += 1
                    
    # Write back to data.csv with UTF-8 BOM
    with open(csv_path, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(header)
        writer.writerows(csv_rows)
        
    print(f"Successfully updated {updated_csv_count} rows in data.csv (using UTF-8 BOM).")
    print("=== Migration Successfully Completed! ===")

if __name__ == "__main__":
    run_migration()
