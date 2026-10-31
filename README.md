# Gaydonne Nusz · ShowOKC Real Estate — Property Website

Static website in the style of a single-property showcase: a light, airy home page with the
featured listings, plus one full page per home (full-screen hero, stats bar, overview, photo
mosaic with a lightbox, features, details, map, agent card + inquiry form, floating "Schedule a Tour" tab).
No framework, no server. Upload the whole `site/` folder to any web host.

## Files

```
site/
  index.html                       ← GENERATED home page
  4311/index.html                  ← GENERATED, Norman listing at gaydonnesellshomes.com/4311
  listings/<address>.html          ← GENERATED, other homes (and a redirect from the old Norman address)
  tools/build.py                   ← the data + templates that generate the pages above
  tools/hdr.swift                  ← photo "HDR look" tool (Core Image)
  tools/logo.swift                 ← logo background removal (made images/brand/*.png)
  styles.css                       ← all styling
  site.js                          ← nav, mobile menu, lightbox, share
  images/
    hero.jpg                       ← home-page hero (Norman photo 03, upscaled to 1920 px)
    norman/NN.jpg, norman/thumbs/  ← 4311 SE 37th St photos (HDR-treated) + 320 px thumbnails
    brand/showokc-logo.png         ← brokerage logo, transparent, for light backgrounds
    brand/showokc-logo-white.png   ← white-text version for dark backgrounds
```

## Editing content

Do not edit `index.html` or `listings/*.html` by hand — they are overwritten by the build.
Edit the data at the top of `tools/build.py`, then from the `site/` folder run:

```
python3 tools/build.py
```

- `AGENT` — name, phone, email, license, bio, stats, social links, portrait path.
- `LISTINGS` — one dictionary per home. Optional `"path": "4311"` gives it a short address
  (gaydonnesellshomes.com/4311); without it the page lives at listings/<slug>.html. Fields: address, price, status, beds/baths/sqft/lot, hero photo,
  photo list (file + caption), which five photos make the mosaic, overview paragraphs, features,
  details rows, optional `video` / `tour` / `floorplan` URLs (adds a Video · 3D Tour · Floor Plans row)
  and optional `documents` (adds Brochure/Documents links under the overview).
- `DOMAIN` — set to the live address once hosted (used for Facebook preview tags).
- `FORM_ACTION` — the Formspree form id (see below).

### Adding a home

1. Put the photos in `images/<home>/` and 320 px thumbnails in `images/<home>/thumbs/` with the same
   names (run `tools/hdr.swift` on them for the same HDR look — instructions at the top of the file).
2. Add a new dictionary to `LISTINGS` in `tools/build.py` (copy the Norman one).
3. Run the build. The new page appears in `listings/` and as a card on the home page.
   Order in `LISTINGS` = order on the home page; the first listing's hero is also the site's share image.

### Status / sold

Set `"status"` to `New Listing`, `For Sale`, `Pending` or `Sold`. Pending and Sold get a dark tag.
To retire a home, remove it from `LISTINGS` and delete its file from `listings/`.

## Still placeholder

| Item | Where |
|---|---|



| Bio and the three stats | `AGENT["bio"]`, `AGENT["stats"]` |
| Social links (`#`) | `AGENT["socials"]` |
| `YOUR-DOMAIN.com`, `YOUR_FORM_ID` | `DOMAIN`, `FORM_ACTION` |
| Norman listing facts | pulled from public listing sites — confirm price, MLS #, details |

## Oklahoma advertising rule (brokerage ≥ 50% of the agent's name)

Kept everywhere the agent's name appears; keep the ratio if you change sizes in `styles.css`:

| Place | Agent name | Brokerage |
|---|---|---|
| Nav brand | 22 px | text 11 px |
| Home hero line | same line, same size | |
| About heading | 44 px (28 on phones) | logo 110 px tall → wordmark ≈ 23 px (86 → 18 on phones) |
| Agent card (contact) | 20 px | text 12 px + logo |
| Footer | 18 px | text 11 px + logo |

## Contact form

The form posts to Formspree, which emails submissions. Sign up free at https://formspree.io,
create a form, put its id in `FORM_ACTION`, rebuild. Call / Text / Email links work regardless.

## Facebook / social sharing

Every page has `og:` preview tags. Facebook needs the preview image as JPG/PNG at least 1200 × 630;
the hero photos qualify. After the site is live, paste each link into
https://developers.facebook.com/tools/debug/ and click "Scrape Again" to refresh Facebook's cache.
