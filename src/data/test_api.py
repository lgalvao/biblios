import urllib.request
import urllib.parse
import json
import time

def query_google_books(title, author):
    query = f"intitle:{title} inauthor:{author}"
    url = f"https://www.googleapis.com/books/v1/volumes?q={urllib.parse.quote(query)}&maxResults=1"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode('utf-8'))
            if 'items' in data and len(data['items']) > 0:
                volume_info = data['items'][0]['volumeInfo']
                pages = volume_info.get('pageCount', 'Unknown')
                lang = volume_info.get('language', 'Unknown')
                desc = volume_info.get('description', '')
                if desc:
                    # Shorten description
                    desc = desc[:200] + '...' if len(desc) > 200 else desc
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
    res = query_google_books(title, author)
    print("Result:", json.dumps(res, indent=2))
    print("-" * 40)
    time.sleep(1)
