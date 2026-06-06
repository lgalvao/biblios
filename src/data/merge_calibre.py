import sqlite3
import json
import csv
import re
import os
import html

script_dir = os.path.dirname(os.path.abspath(__file__))
csv_path = os.path.abspath(os.path.join(script_dir, "../../data.csv"))
json_path = os.path.abspath(os.path.join(script_dir, "data.json"))
db_path = os.path.abspath(os.path.join(script_dir, "../../metadata.db"))

def clean_title(title):
    if not title:
        return ""
    # Strip everything inside parentheses/brackets
    title = re.sub(r'\(.*?\)', '', title)
    title = re.sub(r'\[.*?\]', '', title)
    # Strip subtitles
    for sep in [':', '-', ';']:
        if sep in title:
            title = title.split(sep)[0]
    # Normalize alphanumeric + lowercase
    title = title.lower().strip()
    title = re.sub(r'[^\w\s]', '', title)
    title = re.sub(r'\s+', ' ', title)
    return title.strip()

def clean_author(author):
    if not author:
        return ""
    author = author.strip()
    # Handle "LastName, FirstName" formats
    if "," in author:
        parts = author.split(",")
        if len(parts) == 2:
            author = parts[1].strip() + " " + parts[0].strip()
    
    # Normalize lowercase alphanumeric
    author = author.lower().strip()
    author = re.sub(r'[^\w\s]', '', author)
    author = re.sub(r'\s+', ' ', author)
    return author.strip()

def get_last_name(author):
    cleaned = clean_author(author)
    tokens = cleaned.split()
    return tokens[-1] if tokens else ""

def get_author_tokens(author):
    cleaned = clean_author(author)
    return set(cleaned.split())

def merge_calibre():
    if not os.path.exists(db_path):
        print(f"Error: metadata.db not found at {db_path}")
        return

    # 1. Connect to Calibre SQLite database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Check if custom_column_6 (Páginas) exists
    cc6_exists = False
    try:
        cursor.execute("PRAGMA table_info(custom_column_6);")
        if len(cursor.fetchall()) > 0:
            cc6_exists = True
    except Exception:
        pass

    # Load custom pages if exists
    custom_pages = {}
    if cc6_exists:
        try:
            cursor.execute("SELECT book, value FROM custom_column_6;")
            for r in cursor.fetchall():
                if r[1] is not None:
                    custom_pages[r[0]] = int(r[1])
            print(f"Loaded {len(custom_pages)} custom page records.")
        except Exception as e:
            print("Error loading custom column 6:", e)

    # Query all Calibre book metadata
    query = """
    SELECT b.id, b.title, a.name, c.text, bpl.pages
    FROM books b
    LEFT JOIN books_authors_link bal ON b.id = bal.book
    LEFT JOIN authors a ON bal.author = a.id
    LEFT JOIN comments c ON b.id = c.book
    LEFT JOIN books_pages_link bpl ON b.id = bpl.book;
    """
    
    cursor.execute(query)
    calibre_rows = cursor.fetchall()
    print(f"Loaded {len(calibre_rows)} books from Calibre.")

    # Load masterpieces from data.csv to preserve order, columns, and user Read ticks
    masterpieces = []
    if not os.path.exists(csv_path):
        print(f"Error: data.csv not found at {csv_path}")
        conn.close()
        return

    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        header = next(reader)
        for r in reader:
            if len(r) >= 6:
                ext_lang = r[6] if len(r) >= 7 else ""
                ext_pages = r[7] if len(r) >= 8 else ""
                ext_desc = r[8] if len(r) >= 9 else ""
                masterpieces.append({
                    "title": r[0].strip(),
                    "author": r[1].strip(),
                    "year": r[2].strip(),
                    "country": r[3].strip(),
                    "continent": r[4].strip(),
                    "read": r[5].strip(),
                    "originalLanguage": ext_lang.strip(),
                    "pages": ext_pages.strip(),
                    "description": ext_desc.strip()
                })

    print(f"Loaded {len(masterpieces)} masterpieces from data.csv.")

    # Build memory indexes for Calibre books
    calibre_books = []
    for r in calibre_rows:
        book_id, title, author, comment, pages = r
        if not title:
            continue
        
        # Calculate best pages
        best_pages = pages if (pages and pages > 0) else 0
        if book_id in custom_pages and custom_pages[book_id] > 0:
            best_pages = custom_pages[book_id]

        author_name = author if author else ""
        
        calibre_books.append({
            'title': title,
            'author': author_name,
            'comment': comment,
            'pages': best_pages,
            'clean_title': clean_title(title),
            'clean_author': clean_author(author_name),
            'last_name': get_last_name(author_name),
            'author_tokens': get_author_tokens(author_name)
        })

    # Multi-pass matching engine
    exact_matches = 0
    lastname_matches = 0
    token_matches = 0
    fallback_matches = 0
    enriched_count = 0

    for b in masterpieces:
        title = b["title"]
        author = b["author"]
        desc = b["description"]
        pages = b["pages"]
        
        # Check if we already have authentic pre-existing page counts and descriptions
        is_placeholder = not desc or desc == "" or desc.startswith("A celebrated work of") or desc.startswith("A masterpiece from")
        is_default_pages = not pages or pages == "" or pages == "250"
        
        needs_enrichment = is_placeholder or is_default_pages

        if needs_enrichment:
            m_clean_title = clean_title(title)
            m_clean_author = clean_author(author)
            m_last_name = get_last_name(author)
            m_author_tokens = get_author_tokens(author)

            best_match = None
            match_type = None

            # Pass 1: Cleaned Title + Cleaned Author Exact Match
            for c in calibre_books:
                if c['clean_title'] == m_clean_title and c['clean_author'] == m_clean_author:
                    best_match = c
                    match_type = 'exact'
                    break

            # Pass 2: Cleaned Title + Last Name Match (if no exact match)
            if not best_match and m_last_name:
                for c in calibre_books:
                    if c['clean_title'] == m_clean_title and c['last_name'] == m_last_name:
                        # Prefer match with page count or comments
                        if not best_match or (c['comment'] and not best_match['comment']) or (c['pages'] > 0 and best_match['pages'] == 0):
                            best_match = c
                            match_type = 'lastname'

            # Pass 3: Cleaned Title + Any Author Token Intersection (if no match yet)
            if not best_match and m_author_tokens:
                for c in calibre_books:
                    if c['clean_title'] == m_clean_title and (c['author_tokens'] & m_author_tokens):
                        if not best_match or (c['comment'] and not best_match['comment']) or (c['pages'] > 0 and best_match['pages'] == 0):
                            best_match = c
                            match_type = 'token'

            # Pass 4: Cleaned Title Match Only (for long unique titles, length > 12)
            if not best_match and len(m_clean_title) > 12:
                for c in calibre_books:
                    if c['clean_title'] == m_clean_title:
                        if not best_match or (c['comment'] and not best_match['comment']) or (c['pages'] > 0 and best_match['pages'] == 0):
                            best_match = c
                            match_type = 'fallback'

            if best_match:
                # Set pages if default/placeholder and Calibre pages are valid
                if is_default_pages and best_match['pages'] > 0:
                    b["pages"] = str(best_match['pages'])
                
                # Set description if default/placeholder and Calibre comment is valid
                if is_placeholder and best_match['comment']:
                    # Clean HTML tags and entities
                    clean = re.sub(r'<[^>]*>', '', best_match['comment']).strip()
                    clean = re.sub(r'\s+', ' ', clean)
                    clean = html.unescape(clean)
                    if clean:
                        b["description"] = clean
                
                # Keep statistics
                if match_type == 'exact':
                    exact_matches += 1
                elif match_type == 'lastname':
                    lastname_matches += 1
                elif match_type == 'token':
                    token_matches += 1
                elif match_type == 'fallback':
                    fallback_matches += 1
                
                enriched_count += 1

    print(f"\n--- Lenient Merge Complete ---")
    print(f"  Exact matched titles/authors: {exact_matches}")
    print(f"  Last-name reversed/mapped matches: {lastname_matches}")
    print(f"  Token overlapping author matches: {token_matches}")
    print(f"  Fallback title-only matches: {fallback_matches}")
    print(f"  Total masterpieces successfully enriched: {enriched_count}")

    # 4. Save updated masterpieces back to data.csv
    with open(csv_path, 'w', encoding='utf-8', newline='') as f_csv:
        writer = csv.writer(f_csv)
        writer.writerow(["Title", "Author", "Year", "Country", "Continent", "Read", "OriginalLanguage", "Pages", "Description"])
        for b in masterpieces:
            writer.writerow([
                b["title"], b["author"], b["year"], b["country"], b["continent"],
                b["read"], b["originalLanguage"], b["pages"], b["description"]
            ])

    # 5. Save updated masterpieces back to data.json
    json_records = []
    for i, b in enumerate(masterpieces, 1):
        json_records.append({
            "id": i,
            "title": b["title"],
            "author": b["author"],
            "year": b["year"],
            "country": b["country"],
            "continent": b["continent"],
            "read": True if b["read"] == "1" else False,
            "originalLanguage": b["originalLanguage"],
            "pages": int(b["pages"]) if b["pages"] and str(b["pages"]).isdigit() else 250,
            "description": b["description"]
        })

    with open(json_path, 'w', encoding='utf-8') as f_json:
        json.dump(json_records, f_json, indent=2, ensure_ascii=False)

    print("Successfully updated data.csv and data.json with lenient Calibre metadata!")
    conn.close()

if __name__ == '__main__':
    merge_calibre()
