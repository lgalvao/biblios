async function test() {
  const query = "Mitro Marjani";
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&fields=title,author_name,edition_key,cover_edition_key,number_of_pages_median`;
  console.log(`URL: ${url}`);
  const resp = await fetch(url);
  const data = await resp.json();
  console.log(JSON.stringify(data.docs, null, 2));
}
test();
