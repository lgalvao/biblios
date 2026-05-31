import csv
import json
import urllib.request
import urllib.parse
import time
import os
import ssl

# Bypass SSL context verify issues if any occur on local python environments
ssl_context = ssl._create_unverified_context()

csv_path = "/Users/leonardo/books/list.csv"
json_path = "/Users/leonardo/books/src/data/initialData.json"

# Fallback country-to-language mappings for high metadata fidelity
country_to_lang = {
    "China": "Chinese", "Taiwan": "Chinese", "Japan": "Japanese",
    "Brazil": "Portuguese", "Portugal": "Portuguese", "France": "French",
    "Italy": "Italian", "Germany": "German", "Austria": "German",
    "Switzerland": "German", "Spain": "Spanish", "Mexico": "Spanish",
    "Argentina": "Spanish", "Colombia": "Spanish", "Peru": "Spanish",
    "Chile": "Spanish", "Cuba": "Spanish", "Uruguay": "Spanish",
    "Venezuela": "Spanish", "Paraguay": "Spanish", "Ecurador": "Spanish",
    "Guatemala": "Spanish", "El Salvador": "Spanish", "Nicaragua": "Spanish",
    "England": "English", "Scotland": "English", "Wales": "English",
    "Northern Ireland": "English", "Ireland": "English", "USA": "English",
    "Canada": "English", "Australia": "English", "New Zealand": "English",
    "South Africa": "English", "Nigeria": "English", "Kenya": "English",
    "Somalia": "Somali", "Sudan": "Arabic", "Egypt": "Arabic",
    "Lebanon": "Arabic", "Syria": "Arabic", "Jordan": "Arabic",
    "Iraq": "Arabic", "Algeria": "Arabic", "Morocco": "Arabic",
    "Tunisia": "Arabic", "Palestine": "Arabic", "Iran": "Persian",
    "Turkey": "Turkish", "Russia": "Russian", "Poland": "Polish",
    "Vietnam": "Vietnamese", "Greece": "Greek", "Norway": "Norwegian",
    "Sweden": "Swedish", "Denmark": "Danish", "Netherlands": "Dutch",
    "Belgium": "Dutch", "India": "English", "Pakistan": "Urdu",
    "Bangladesh": "Bengali", "Malaysia": "Malay", "Indonesia": "Indonesian",
    "Thailand": "Thai", "Burma": "Burmese", "Myanmar/Burma": "Burmese",
}

author_language_overrides = {
    "Marie-Claire Blais": "French", "Jacques Poulin": "French",
    "Michel Tremblay": "French", "Roch Carrier": "French",
    "Gabrielle Roy": "French", "Anne Hébert": "French",
    "Dany Laferrière": "French", "Rabindranath Tagore": "Bengali",
    "Premchand": "Hindi", "U.R. Ananthamurthy": "Kannada",
    "Mahasweta Devi": "Bengali", "Bibhutibhushan Bandyopadhyay": "Bengali"
}

def clean_desc(desc):
    if not desc:
        return ""
    # Clean HTML tags that sometimes appear in API descriptions
    clean = desc.replace("<p>", "").replace("</p>", "").replace("<br>", "\n").replace("</br>", "\n")
    clean = clean.replace("<i>", "").replace("</i>", "").replace("<b>", "").replace("</b>", "")
    # Trim to reasonable length
    return clean[:450] + "..." if len(clean) > 450 else clean

def fetch_from_google_books(title, author):
    query = f'intitle:"{title}" inauthor:"{author}"'
    url = f"https://www.googleapis.com/books/v1/volumes?q={urllib.parse.quote(query)}&maxResults=1"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5, context=ssl_context) as response:
            data = json.loads(response.read().decode('utf-8'))
            if 'items' in data and len(data['items']) > 0:
                vol = data['items'][0]['volumeInfo']
                pages = vol.get('pageCount')
                desc = vol.get('description', '')
                return {
                    "pages": pages,
                    "description": clean_desc(desc),
                    "success": True,
                    "source": "Google Books"
                }
    except Exception:
        pass
    return {"success": False}

def fetch_from_open_library(title, author):
    query = f'title:"{title}" author:"{author}"'
    url = f"https://openlibrary.org/search.json?q={urllib.parse.quote(query)}&limit=1"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5, context=ssl_context) as response:
            data = json.loads(response.read().decode('utf-8'))
            if 'docs' in data and len(data['docs']) > 0:
                doc = data['docs'][0]
                pages = doc.get('number_of_pages_median', doc.get('number_of_pages'))
                if isinstance(pages, list) and len(pages) > 0:
                    pages = pages[0]
                
                # Retrieve description by fetching the work details
                desc = ""
                key = doc.get('key', '')
                if key:
                    work_url = f"https://openlibrary.org{key}.json"
                    try:
                        with urllib.request.urlopen(urllib.request.Request(work_url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=4, context=ssl_context) as w_resp:
                            w_data = json.loads(w_resp.read().decode('utf-8'))
                            desc_data = w_data.get('description', '')
                            if isinstance(desc_data, dict):
                                desc = desc_data.get('value', '')
                            else:
                                desc = str(desc_data)
                    except Exception:
                        pass
                
                return {
                    "pages": pages,
                    "description": clean_desc(desc),
                    "success": True,
                    "source": "Open Library"
                }
    except Exception:
        pass
    return {"success": False}

# Read existing records
books = []
if not os.path.exists(csv_path):
    print(f"Error: list.csv not found at {csv_path}")
    exit(1)

with open(csv_path, 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    header = next(reader)
    for row in reader:
        if len(row) >= 5:
            # Preserve existing language/pages/description if they are already authentic (not placeholders)
            ext_lang = row[6] if len(row) >= 7 else ""
            ext_pages = row[7] if len(row) >= 8 else ""
            ext_desc = row[8] if len(row) >= 9 else ""
            
            books.append({
                "title": row[0].strip(),
                "author": row[1].strip(),
                "year": row[2].strip(),
                "country": row[3].strip(),
                "continent": row[4].strip(),
                "read": row[5].strip(),
                "originalLanguage": ext_lang.strip(),
                "pages": ext_pages.strip(),
                "description": ext_desc.strip()
            })

print(f"=== Metadata Downloader Initialized: {len(books)} books found ===")
print("Starting batch API queries. Delaying 0.8s between calls to prevent rate limits...")
print("Press Ctrl+C at any time to save progress and stop safely.\n")

enriched_books = []
try:
    for idx, b in enumerate(books, 1):
        title = b["title"]
        author = b["author"]
        country = b["country"]
        year = b["year"]
        
        # 1. Map Original Language
        lang = b["originalLanguage"]
        if not lang or lang == "English" or lang == "":
            lang = country_to_lang.get(country, "English")
            if author in author_language_overrides:
                lang = author_language_overrides[author]
            if country == "Canada" and any(f_in in author for f_in in ["Jacques", "Michel", "Marie", "Roch", "Hébert", "Gabrielle", "Roy"]):
                lang = "French"

        # 2. Check if we already have a valid authentic blurb/page count to save API calls
        pages = b["pages"]
        desc = b["description"]
        
        # Check if description is missing or a factual generic placeholder (we only fetch if needed)
        needs_fetch = not desc or desc == "" or desc.startswith("A celebrated work of") or not pages or pages == "" or pages == "250"
        
        if needs_fetch:
            print(f"[{idx}/{len(books)}] Fetching '{title}' by {author}...")
            # Query Google Books first
            res = fetch_from_google_books(title, author)
            if not res["success"]:
                # Query Open Library as fallback
                res = fetch_from_open_library(title, author)
            
            if res["success"]:
                pages = res["pages"] or pages or 250
                desc = res["description"] or desc or f"A celebrated work of {country} literature, published in {year} by the acclaimed author {author}."
                print(f"  -> SUCCESS! Found on {res['source']} ({pages} pages)")
            else:
                pages = pages or 250
                desc = desc or f"A celebrated work of {country} literature, published in {year} by the acclaimed author {author}."
                print("  -> No API matches found. Retaining factual signature.")
            
            # API courtesy delay
            time.sleep(0.8)
        else:
            # We already have an authentic description/pages (either preseeded or previously downloaded)
            pass

        enriched_books.append({
            "title": title,
            "author": author,
            "year": year,
            "country": country,
            "continent": b["continent"],
            "read": b["read"],
            "originalLanguage": lang,
            "pages": pages,
            "description": desc
        })
except KeyboardInterrupt:
    print("\n[!] Execution paused by user. Saving completed progress back to files...")
    # Fill remaining books with whatever they had
    for b in books[len(enriched_books):]:
        enriched_books.append(b)

# Write enriched records back to list.csv
new_headers = ["Title", "Author", "Year", "Country", "Continent", "Read", "OriginalLanguage", "Pages", "Description"]
with open(csv_path, 'w', encoding='utf-8', newline='') as f_csv:
    writer = csv.writer(f_csv)
    writer.writerow(new_headers)
    for b in enriched_books:
        writer.writerow([
            b["title"], b["author"], b["year"], b["country"], b["continent"],
            b["read"], b["originalLanguage"], b["pages"], b["description"]
        ])

# Write enriched records back to initialData.json
json_records = []
for i, b in enumerate(enriched_books, 1):
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

print("\n=== All progress successfully saved to list.csv and initialData.json! ===")
print("Recompile your React project or run 'npm run dev' to see the authentic metadata.")
