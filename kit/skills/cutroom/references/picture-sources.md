# Where to find real pictures (free archives)

Saved 2026-11-25 from a list the user was sent by a creator, for the "more real-world pictures" rule in `style.md`.
Old photographs, paintings, maps, documents, posters and space pictures that fit the paper look.

| Archive | Good for | Use |
|---|---|---|
| Wikimedia Commons, commons.wikimedia.org | Everything; portraits, documents, maps | Built in: `resolve-assist commons "<words>"`, then `--add "<Project>"` (records licence and author) |
| Library of Congress, loc.gov/free-to-use | Curated sets with no known restrictions: old photos, posters, maps | Browse the sets by theme; each item page states its rights |
| The Met, metmuseum.org/art/collection | Paintings, objects, prints | Tick "Open Access" in the search; those are CC0 |
| Smithsonian, si.edu/openaccess | Objects, science, American history | Open Access items are CC0 |
| Rijksmuseum, rijksmuseum.nl/en/rijksstudio | Dutch masters, very high resolution | Public-domain works download in full size |
| National Gallery of Art, nga.gov/open-access-images | European and American paintings | Open-access images are public domain |
| NYPL, digitalcollections.nypl.org | Maps, ephemera, old New York | Use the "Search only public domain materials" switch |
| NASA, images.nasa.gov | Space, Earth, rockets, mission photos | Generally free to use; no NASA logo as if endorsing |
| Europeana, europeana.eu | European museums and libraries in one search | Filter "Can I use this?" to free re-use; rights differ per item |
| Internet Archive, archive.org | Scanned books, magazines, old films | Rights differ per item: read the item's own statement |

## How to use them in a project

1. Search Commons first with the built-in tool: it downloads and records the credit in one step.
2. For the others, find the item in the browser, download the largest size into the project's `inbox/`, run
   `studio add "<Project>"`, then record where it came from:
   `resolve-assist credit "<Project>" stills/<file> --source <item page URL> --license "<as stated>" --author "<maker>"`.
3. Prefer items marked public domain, CC0 or "no known restrictions". Anything else: tell the user what the licence asks.

Search addresses that answered a plain automated request on 2026-11-25 (NASA: `images-api.nasa.gov/search?q=<words>&media_type=image`;
Smithsonian: `api.si.edu/openaccess/api/v1.0/search?q=<words>&api_key=<key from api.data.gov>`; Internet Archive:
`archive.org/advancedsearch.php?q=<words>+AND+mediatype:image&output=json`; Europeana: `api.europeana.eu/record/v2/search.json`
with a free key and `reusability=open`; Rijksmuseum: `data.rijksmuseum.nl/search/collection?title=<words>`). The Library of
Congress and the Met did not answer automated requests that day: use their sites in the browser.
