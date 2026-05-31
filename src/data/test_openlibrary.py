import urllib.request
import urllib.parse
import json
import time

def query_open_library(title, author):
    # Search by title and author
    query = f'title:"{title}" author:"{author}"'
    url = f"https://openlibrary.org/search.json?q={urllib.parse.quote(query)}&limit=1"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'})
        with urllib.request.urlopen(req, timeout=8) as response:
            data = json.loads(response.read().decode('utf-8'))
            if 'docs' in data and len(data['docs']) > 0:
                doc = data['docs'][0]
                
                # Pages count: look for number of pages
                pages = doc.get('number_of_pages_median', doc.get('number_of_pages', 'Unknown'))
                if isinstance(pages, list) and len(pages) > 0:
                    pages = pages[0]
                
                # Languages
                languages = doc.get('language', ['Unknown'])
                # Translate code like 'eng' to full name if needed, or just take first
                lang = languages[0] if languages else 'Unknown'
                
                # Descriptions - Open Library search doesn't return full blurb, we might need a separate work lookup
                # but we can try to fetch a short text or key
                key = doc.get('key', '')
                desc = ""
                if key:
                    # Fetch work details for description
                    work_url = f"https://openlibrary.org{key}.json"
                    try:
                        with urllib.request.urlopen(urllib.request.Request(work_url, headers={'User-Agent': 'Mozilla/5.0'})) as w_resp:
                            w_data = json.loads(w_resp.read().decode('utf-8'))
                            desc_data = w_data.get('description', '')
                            if isinstance(desc_data, dict):
                                desc = desc_data.get('value', '')
                            else:
                                desc = str(desc_data)
                    except Exception:
                        pass
                
                if desc:
                    desc = desc[:200] + '...' if len(desc) > 200 else desc
                else:
                    desc = f"A classic masterpiece: '{title}' by {author}."
                
                return {
                    "pages": pages,
                    "language": lang,
                    "description": desc,
                    "success": True
                }
    except Exception as e:
        return {"success": False, "error": str(e)}
    return {"success": False, "error": "No results found"}

# Test with a couple of books from the catalog
samples = [
    ("The King of Chess", "A Cheng"),
    ("Possession", "A.S. Byatt"),
    ("Salina", "A. Samad Said")
]

for title, author in samples:
    print(f"Querying: '{title}' by {author}...")
    res = query_open_library(title, author)
    print("Result:", json.dumps(res, indent=2))
    print("-" * 40)
    time.sleep(1)
