#!/usr/bin/env python3
"""Builds index.html and one page per listing (at <path>/ when a listing sets "path", else listings/<slug>.html).
Run from the site folder:  python3 tools/build.py
Edit AGENT / LISTINGS, re-run, upload the site folder. Output is plain static HTML."""
import html, os, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
DOMAIN = "https://gaydonnesellshomes.com"
SITE_TITLE = "Gaydonne Sells Homes"           # browser tab title   # used for Facebook previews
FORM_ACTION = "https://formspree.io/f/YOUR_FORM_ID"   # replace with your Formspree form id

AGENT = {
    "name": "Gaydonne Nusz",
    "role": "REALTOR®",
    "brokerage": "ShowOKC Real Estate",
    "brokerage_phone": "(405) 355-2489",   # printed inside the logo image; used only in its alt text
    "phone": "(405) 312-5905", "tel": "+14053125905",
    "email": "Gaydonne@GaydonneSellsHomes.com",
    "license": "Oklahoma License #170092",
    "photo": "images/agent.jpg",              # About section portrait
    "photo_contact": "images/agent-contact.jpg",  # Get in Touch card (bottom of every page)
    "bio": ["Gaydonne Nusz is a REALTOR® with ShowOKC Real Estate and has spent 12 years helping Oklahomans buy and sell homes across the Oklahoma City metro, from Yukon, Mustang, and Edmond to Norman, Midwest City, and the surrounding communities.",
            "Her work covers single-family homes, first-time buyers, relocations, investment and farm property, land, new construction, and luxury homes, and she is recognized by the Oklahoma Housing Finance Agency as a Blue Ribbon Agent. Clients consistently recommend her for a calm, straightforward process from first showing to closing."],
    "stats": [("12", "Years experience"), ("60+", "Homes sold"), ("100%", "Client recommended")],
    "socials": [("Facebook", "https://www.facebook.com/nuszrealty"), ("Instagram", "#"), ("LinkedIn", "#"), ("Zillow", "#")],   # replace # with links
}

# Photo order + captions for the Norman house (file numbers in images/norman)
NORMAN_PHOTOS = [(3,"Front elevation"),(43,"Timber-framed entry"),(1,"Covered front porch"),(4,"Side elevation and deck"),(5,"Cedar deck"),(6,"Cedar deck"),(44,"Deck with tree canopy"),(45,"Deck overlooking the acreage"),(7,"Rear elevation"),(46,"Rear of the home under mature trees"),(8,"Front of the home from the drive"),(9,"Entry"),(10,"Kitchen and living area"),(11,"Open kitchen"),(12,"Kitchen island with vent hood"),(13,"Kitchen"),(14,"Farmhouse sink with window"),(15,"Kitchen cabinetry"),(16,"Range and cabinetry"),(17,"Built-in pantry"),(18,"Living room"),(19,"Living room fireplace"),(20,"Living room"),(21,"Living room with plantation shutters"),(22,"Living room"),(23,"Double-sided fireplace"),(24,"Dining room"),(25,"Second dining area"),(26,"Hallway"),(27,"Guest bath shower"),(28,"Guest bath vanity"),(29,"Marble-look walk-in shower"),(30,"Bedroom"),(31,"Bedroom"),(32,"Fireplace room"),(33,"Staircase"),(34,"Room with fireplace"),(35,"Bedroom"),(36,"Bedroom"),(37,"Bedroom"),(38,"Bedroom"),(39,"Walk-in closet"),(40,"Primary bath"),(41,"Primary bath double vanity"),(42,"Primary bath shower"),(2,"Aerial view"),(47,"Aerial of the 2.56 acres"),(48,"Aerial with circle drive"),(49,"Aerial")]

PUMPKIN_PHOTOS = list(enumerate(['Front of the home', 'Front yard and two-car garage', 'Covered front entry', 'Living room with fireplace', 'Kitchen and living area', 'Entry', 'Entry hall', 'Dining area', 'Kitchen island', 'Kitchen', 'Kitchen', 'Kitchen with stainless appliances', 'Kitchen sink and range', 'Kitchen', 'Dining room', 'Dining room', 'Living room', 'Hall bath vanity', 'Hall bath', 'Hall bath shower', 'Hall bath', 'Bedroom', 'Bedroom', 'Bedroom built-ins', 'Bedroom', 'Primary bedroom', 'Primary bedroom', 'Primary bath', 'Primary shower', 'Primary shower', 'Bedroom', 'Bedroom built-ins', 'Bedroom', 'Hall storage', 'Living room', 'Living room', 'Living room with French doors', 'Fenced backyard', 'Storage shed'], 1))

LISTINGS = [
  {
    "slug": "4311-se-37th-st-norman",
    "path": "4311",                       # short address: gaydonnesellshomes.com/4311
    "street": "4311 SE 37th St", "city": "Norman", "state": "OK", "zip": "73072",
    "price": "$425,000", "status": "New Listing",
    "beds": "3", "baths": "2", "sqft": "2,280", "lot": "2.56 acres",
    "hero": "images/norman/hero.jpg",      # page hero: photo 11 (kitchen), upscaled to 1920 px
    "card": "images/norman/03.jpg",       # thumbnail on the home page
    "photos": [{"full": f"images/norman/{n:02d}.jpg", "thumb": f"images/norman/thumbs/{n:02d}.jpg", "alt": c} for n, c in NORMAN_PHOTOS],
    "mosaic": [0, 14, 21, 1, 43],      # indexes into photos: first is the large tile
    "overview": [
      "Set on 2.56 quiet acres east of Norman, this 1977 ranch has been remodeled top to bottom into a modern farmhouse. Crisp white board-and-batten siding and painted brick are framed by a timber-trussed cedar entry and a brick front porch, with a circle drive and mature shade trees setting the approach.",
      "Inside, dark wood-look floors, wainscoting, and plantation shutters run throughout. The open kitchen pairs white shaker cabinetry with granite counters, a center island under a stainless vent hood, and a farmhouse sink beneath a picture window. A double-sided fireplace anchors the living room on one side and the formal dining room on the other, and a second dining area sits just off the kitchen.",
      "Both baths have been fully redone: the guest bath with a marble-look walk-in shower, and the primary bath with a dramatic black tile shower, double vanity with barn-door cabinetry, and a walk-in closet with custom built-ins. Out back, a cedar deck looks out over the acreage and mature trees."],
    "features": ["2.56 Acres","Circle Drive","Complete Remodel","Timber-Framed Entry","Granite Counters","Island Kitchen","Double-Sided Fireplace","Two Dining Areas","Plantation Shutters","Remodeled Baths","Walk-In Closet","Cedar Deck","Mature Trees","Norman Public Schools"],
    "details": [("Price","$425,000"),("Status","Active"),("Property type","Single-family on acreage"),("Year built","1977, fully remodeled"),("Interior","2,280 sq ft"),("Lot","2.56 acres"),("Bedrooms / Baths","3 / 2"),("Schools","Norman Public Schools"),("MLS #","1255446")],
    "video": None, "tour": None, "floorplan": None,     # add URLs to show Video / 3D Tour / Floor Plans
    "documents": [],                                     # e.g. [("Brochure", "docs/4311-brochure.pdf")]
  },
  {
    "slug": "408-pumpkin-cir-yukon",
    "path": "408",                        # gaydonnesellshomes.com/408
    "sold": True, "sold_note": "Represented the buyer · Sold August 2026",
    "street": "408 Pumpkin Cir", "city": "Yukon", "state": "OK", "zip": "73099",
    "price": "$225,000", "status": "Sold",   # price is never shown while "sold" is True
    "beds": "3", "baths": "2", "sqft": "1,278", "lot": "9,004 sq ft",
    "hero": "images/pumpkin/hero-kitchen.jpg",     # photo 05 (kitchen into living room), upscaled to 1920 px
    "card": "images/pumpkin/05.jpg",
    "photos": [{"full": f"images/pumpkin/{n:02d}.jpg", "thumb": f"images/pumpkin/thumbs/{n:02d}.jpg", "alt": c} for n, c in PUMPKIN_PHOTOS],
    "mosaic": [0, 11, 36, 27, 37],
    "overview": [
      "Tucked into a quiet cul-de-sac in Yukon's WoodRun addition, this 1977 brick ranch was remodeled top to bottom. New flooring throughout, fresh paint inside and out, and new light fixtures and ceiling fans give the home a clean, bright feel.",
      "The kitchen is the centerpiece, with white cabinetry and new hardware, granite counters, a peninsula island, and stainless steel appliances. The living room pairs a painted-brick gas-log fireplace with built-in shelving and French doors to the backyard. Both full baths were redone with granite vanities and white tile showers.",
      "The updates go well past the surface: new plumbing and electrical, HVAC and furnace from 2023, freshly cleaned ductwork, and foundation piers and wall ties added in June 2026. Outside, a new stockade fence wraps the large backyard, with a remodeled storage shed and a two-car garage."],
    "features": ["Cul-de-Sac Lot","Complete Remodel","Granite Counters","Stainless Appliances","Peninsula Island","New Flooring","New Plumbing & Electrical","HVAC & Furnace 2023","Foundation Piers 2026","Gas-Log Fireplace","Built-In Shelving","French Doors","Two-Car Garage","New Stockade Fence","Storage Shed","Mustang Schools"],
    "details": [("Price","$225,000"),("Status","Sold August 21, 2026"),("Property type","Single-family"),("Year built","1977, fully remodeled"),("Interior","1,278 sq ft"),("Lot","9,004 sq ft, cul-de-sac"),("Bedrooms / Baths","3 / 2"),("Garage","2-car"),("Schools","Mustang Public Schools"),("Gaydonne represented","The buyer"),("MLS #","1238645")],
    "video": None, "tour": None, "floorplan": None, "documents": [],
  },
]

E = html.escape

def page_href(L):
    """Link to a listing from the site root: its short path folder, or listings/<slug>.html."""
    return f'{L["path"]}/' if L.get("path") else f'listings/{L["slug"]}.html'

REDIRECT = """<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>Redirecting…</title>
<link rel="canonical" href="{url}">
<meta http-equiv="refresh" content="0; url={href}">
<script>location.replace("{href}" + location.hash)</script>
</head><body><a href="{href}">This listing has moved here.</a></body></html>
"""
HEAD_FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com">\n  <link href="https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet">'

def icons(rel):
    return (f'<link rel="icon" href="{rel}favicon.svg" type="image/svg+xml">\n'
            f'  <link rel="icon" href="{rel}favicon-32.png" sizes="32x32" type="image/png">\n'
            f'  <link rel="apple-touch-icon" href="{rel}apple-touch-icon.png">')

def nav(rel, links, solid=False):
    a = AGENT
    items = "".join(f'<a href="{href}">{E(t)}</a>' for t, href in links)
    return f'''<header class="nav{' nav--solid' if solid else ''}">
  <div class="container nav__inner">
    <a class="brand" href="{rel}index.html">
      <span class="brand__name">{E(a["name"])}</span>
      <span class="brand__sub">{E(a["brokerage"])}</span>
    </a>
    <nav class="nav__links" id="menu">{items}<a href="tel:{a["tel"]}">{E(a["phone"])}</a></nav>
    <button class="nav__toggle" aria-label="Menu" aria-expanded="false" aria-controls="menu"><svg viewBox="0 0 24 24"><path d="M3 7h18M3 12h18M3 17h18"/></svg></button>
  </div>
</header>'''

def contact(rel, subject, sms_body):
    a = AGENT
    return f'''<section class="section section--topo" id="contact">
  <div class="container contact">
    <div class="agent">
      <img class="agent__photo" src="{rel}{a.get("photo_contact", a["photo"])}" alt="{E(a["name"])}">
      <b>{E(a["name"])}</b>
      <span class="agent__role">{E(a["role"])}</span>
      <span class="agent__brokerage">{E(a["brokerage"])}</span>
      <img class="agent__logo" src="{rel}images/brand/showokc-logo.png" alt="{E(a["brokerage"])}, {E(a["brokerage_phone"])}">
      <a href="tel:{a["tel"]}">{E(a["phone"])}</a>
      <a href="mailto:{a["email"]}">{E(a["email"])}</a>
      <span>{E(a["license"])}</span>
    </div>
    <div>
      <h2 class="h2">Get in touch</h2>
      <!-- Posts to Formspree. Create a free form at https://formspree.io and replace YOUR_FORM_ID in tools/build.py -->
      <form class="form" action="{FORM_ACTION}" method="POST">
        <input type="hidden" name="_subject" value="{E(subject)}">
        <div class="form__row"><input type="text" name="first_name" placeholder="First *" required><input type="text" name="last_name" placeholder="Last *" required></div>
        <input type="email" name="email" placeholder="Email *" required>
        <input type="tel" name="phone" placeholder="Phone #">
        <textarea name="message" rows="5" placeholder="Your message"></textarea>
        <div class="form__actions">
          <button class="btn" type="submit">Send Inquiry</button>
          <a class="btn btn--outline" href="sms:{a["tel"]}?&body={sms_body}">Schedule a Tour</a>
        </div>
        <div class="form__note">Your information is never shared.</div>
      </form>
    </div>
  </div>
</section>'''

def footer(rel):
    a = AGENT
    socials = "".join(f'<a href="{href}">{E(t)}</a>' for t, href in a["socials"])
    return f'''<footer class="footer">
  <div class="container">
    <div class="footer__brand">
      <span class="footer__name">{E(a["name"])}</span>
      <img class="footer__logo" src="{rel}images/brand/showokc-logo.png" alt="{E(a["brokerage"])}">
    </div>
    <div class="footer__brokerage">{E(a["brokerage"])} · <a href="tel:{a["tel"]}">{E(a["phone"])}</a></div>
    <div class="footer__links"><a href="{rel}index.html#properties">Properties</a><a href="{rel}index.html#about">About</a><a href="{rel}index.html#contact">Contact</a>{socials}</div>
    <div class="footer__legal">© 2026 {E(a["name"])}, {E(a["role"])} · {E(a["brokerage"])} · {E(a["license"])}. Information deemed reliable but not guaranteed; buyer to verify all details including schools and square footage. REALTOR® is a registered trademark of the National Association of REALTORS®.
      <div class="eho"><svg viewBox="0 0 24 24"><path d="m3 11 9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M8 14h8M8 17h8"/></svg> Equal Housing Opportunity</div></div>
  </div>
</footer>'''

def listing_page(L):
    rel = "../"
    a = AGENT
    addr = f'{L["street"]}, {L["city"]}, {L["state"]} {L["zip"]}'
    photos = L["photos"]
    sold = L.get("sold")
    price = "Sold" if sold else L["price"]       # a sold home never shows its price
    details = [(k, v) for k, v in L["details"] if not (sold and k == "Price")]
    tpl = "".join(f'<li data-full="{rel}{p["full"]}" data-thumb="{rel}{p["thumb"]}" data-alt="{E(p["alt"])}"></li>' for p in photos)
    tiles = ""
    for k, i in enumerate(L["mosaic"]):
        p = photos[i]
        more = f'<span class="mosaic__more">View all {len(photos)} photos</span>' if k == len(L["mosaic"]) - 1 else ""
        tiles += f'<button type="button" data-open-photo="{i}" aria-label="{E(p["alt"])}"><img src="{rel}{p["full"]}" alt="{E(p["alt"])}" loading="lazy">{more}</button>\n      '
    feats = "".join(f"<li>{E(f)}</li>" for f in L["features"])
    rows = "".join(f"<tr><th>{E(k)}</th><td>{E(v)}</td></tr>" for k, v in details)
    links = [("Overview", "#overview"), ("Photos", "#photos"), ("Features", "#features"), ("Map", "#map"), ("Contact", "#contact")]
    tabs = [(t, u) for t, u in [("Video", L["video"]), ("3D Tour", L["tour"]), ("Floor Plans", L["floorplan"])] if u]
    tabs_html = ('<div class="container"><div class="tabs">' + "".join(f'<a href="{u}" target="_blank" rel="noopener">{E(t)}</a>' for t, u in tabs) + '</div></div>') if tabs else ""
    docs_html = ""
    if L["documents"]:
        docs_html = '<div class="docs">' + "".join(f'<a href="{rel}{u}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>{E(t)}</a>' for t, u in L["documents"]) + '</div>'
    sms = f'Hi%20{a["name"].split()[0]}%2C%20I%27d%20like%20to%20schedule%20a%20tour%20of%20{L["street"].replace(" ", "%20")}.'
    if sold:
        sms = f'Hi%20{a["name"].split()[0]}%2C%20I%27d%20like%20to%20talk%20about%20buying%20or%20selling%20a%20home.'
    tab = '<a class="tour-tab" href="#contact">Get in touch</a>' if sold else f'<a class="tour-tab" href="sms:{a["tel"]}?&body={sms}">Schedule a Tour</a>'
    mapq = addr.replace(" ", "+")
    return f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{E(L["street"])} | {E(SITE_TITLE)}</title>
  {icons(rel)}
  <meta name="description" content="{E(L["beds"])} bed, {E(L["baths"])} bath, {E(L["sqft"])} sq ft on {E(L["lot"])} in {E(L["city"])}, {E(L["state"])}. {E(L["overview"][0][:140])}…">
  <meta name="theme-color" content="#ffffff">
  <meta property="og:type" content="website">
  <meta property="og:title" content="{E(L["street"])}, {E(L["city"])} — {E(price)}">
  <meta property="og:description" content="{E(L["beds"])} bed · {E(L["baths"])} bath · {E(L["sqft"])} sq ft · {E(L["lot"])}. {"Sold by " + E(a["name"]) + "." if sold else "Showings by appointment."}">
  <meta property="og:url" content="{DOMAIN}/{page_href(L)}">
  <meta property="og:image" content="{DOMAIN}/{L["hero"]}">
  <meta name="twitter:card" content="summary_large_image">
  {HEAD_FONTS}
  <link rel="stylesheet" href="../styles.css">
</head>
<body>
{nav(rel, links)}

<section class="hero" id="top">
  <img class="hero__img" src="{rel}{L["hero"]}" alt="{E(addr)}">
  <div class="hero__content">
    {'<div class="stamp stamp--hero">Sold</div>' if sold else ''}
    <h1 class="hero__title">{E(L["street"])}</h1>
    <div class="hero__sub">{E(L["city"])}, {E(L["state"])} {E(L["zip"])}</div>
  </div>
  <div class="hero__scroll" aria-hidden="true"></div>
</section>

<div class="container">
  <div class="statbar">
    <div class="statbar__price">{E(price)}</div>
    <div>{E(L["beds"])}<span>beds</span></div>
    <div>{E(L["baths"])}<span>baths</span></div>
    <div>{E(L["sqft"])}<span>sq ft</span></div>
    <div>{E(L["lot"])}<span>lot</span></div>
  </div>
</div>

<section class="section" id="overview">
  <div class="container overview">
    <h2 class="h2">Overview</h2>
    {f'<p class="overview__sold">{E(L["sold_note"])}</p>' if sold else ''}
    {"".join(f"<p>{E(p)}</p>" for p in L["overview"])}
    {docs_html}
  </div>
</section>

<section class="section section--tight" id="photos" style="padding-top:0">
  <div class="container">
    <div class="mosaic">
      {tiles}</div>
    <div class="photos__cta"><button class="btn btn--outline" type="button" data-open-photo="0">View all {len(photos)} photos</button></div>
  </div>
</section>
<template id="photo-list">{tpl}</template>

<section class="section" id="features">
  <div class="container">
    <h2 class="h2">Features</h2>
    <ul class="features">{feats}</ul>
  </div>
</section>

{tabs_html}

<section class="section section--tight" id="details">
  <div class="container">
    <h2 class="h2 h2--center">Details</h2>
    <table class="details">{rows}</table>
  </div>
</section>

<section id="map">
  <div class="container"><h2 class="h2 h2--center" style="padding-top:48px">Map</h2></div>
  <div class="map">
    <div class="map__card"><b>{E(L["street"])}</b><span>{E(L["city"])}, {E(L["state"])} {E(L["zip"])}</span><br><a href="https://www.google.com/maps/search/?api=1&query={mapq}" target="_blank" rel="noopener">Open in Google Maps</a></div>
    <iframe loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Map of {E(addr)}" src="https://www.google.com/maps?q={mapq}&z=14&output=embed"></iframe>
  </div>
</section>

{contact(rel, f'Inquiry: {addr}' + (' (sold)' if sold else ''), sms)}
{footer(rel)}

{tab}
<script src="../site.js"></script>
</body>
</html>
'''

def index_page():
    rel = ""
    a = AGENT
    cards = ""
    for L in LISTINGS:
        cards += f'''
      <article class="property{' property--sold' if L.get("sold") else ''}">
        <a class="property__media" href="{page_href(L)}">
          <img src="{L.get("card", L["hero"])}" alt="{E(L["street"])}, {E(L["city"])}" loading="lazy">
          {'<span class="stamp">Sold</span>' if L.get("sold") else f'<span class="tag">{E(L["status"])}</span>'}
        </a>
        <div class="property__body">
          <h3 class="property__addr">{E(L["street"])}</h3>
          <div class="property__city">{E(L["city"])}, {E(L["state"])} {E(L["zip"])}</div>
          <div class="property__price">{"Sold" if L.get("sold") else E(L["price"])}</div>
          <div class="specs"><span><b>{E(L["beds"])}</b>beds</span><span><b>{E(L["baths"])}</b>baths</span><span><b>{E(L["sqft"])}</b>sq ft</span><span><b>{E(L["lot"])}</b>lot</span></div>
          {f'<p class="property__note">{E(L["sold_note"])}</p>' if L.get("sold") else ''}
          <a class="btn btn--outline property__link" href="{page_href(L)}">{"View Home" if L.get("sold") else "View Property"}</a>
        </div>
      </article>'''
    stats = "".join(f'<div class="stat"><b>{E(v)}</b><span>{E(k)}</span></div>' for v, k in a["stats"])
    bio = "".join(f"<p>{E(p)}</p>" for p in a["bio"])
    links = [("Properties", "#properties"), ("About", "#about"), ("Contact", "#contact")]
    sms = f'Hi%20{a["name"].split()[0]}%2C%20I%27d%20like%20to%20talk%20about%20buying%20or%20selling%20a%20home.'
    hero = LISTINGS[0]["hero"]
    return f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{E(SITE_TITLE)}</title>
  {icons(rel)}
  <meta name="description" content="Homes for sale across the Oklahoma City metro, presented by {E(a["name"])}, {E(a["role"])} with {E(a["brokerage"])}.">
  <meta name="theme-color" content="#ffffff">
  <meta property="og:type" content="website">
  <meta property="og:title" content="{E(a["name"])} | {E(a["brokerage"])}">
  <meta property="og:description" content="Exceptional homes for sale across the Oklahoma City metro. Showings by appointment.">
  <meta property="og:url" content="{DOMAIN}/">
  <meta property="og:image" content="{DOMAIN}/{hero}">
  <meta name="twitter:card" content="summary_large_image">
  {HEAD_FONTS}
  <link rel="stylesheet" href="styles.css">
</head>
<body>
{nav(rel, links)}

<section class="hero" id="top">
  <img class="hero__img" src="images/hero.jpg" alt="">
  <div class="hero__content">
    <h1 class="hero__title">Exceptional Homes</h1>
    <div class="hero__sub">Presented by {E(a["name"])} · {E(a["brokerage"])}</div>
    <div class="hero__actions"><a class="btn btn--white" href="#properties">View Properties</a><a class="btn btn--ghost-light" href="#contact">Contact</a></div>
  </div>
  <div class="hero__scroll" aria-hidden="true"></div>
</section>

<section class="section" id="properties">
  <div class="container">
    <h2 class="h2 h2--center">Featured Properties</h2>
    <div class="properties">{cards}
    </div>
  </div>
</section>

<section class="section section--topo" id="about">
  <div class="container about">
    <img class="about__img" src="{a["photo"]}" alt="{E(a["name"])}">
    <div>
      <div class="eyebrow">About</div>
      <h2>{E(a["name"])}</h2>
      <img class="about__brokerage" src="images/brand/showokc-logo.png" alt="{E(a["brokerage"])}, {E(a["brokerage_phone"])}">
      {bio}
      <div class="stats">{stats}</div>
    </div>
  </div>
</section>

{contact(rel, 'Website inquiry', sms).replace('section--topo', '')}
{footer(rel)}

<a class="tour-tab" href="#contact">Get in touch</a>
<script src="site.js"></script>
</body>
</html>
'''

if __name__ == "__main__":
    (ROOT / "listings").mkdir(exist_ok=True)
    for L in LISTINGS:
        if L.get("path"):
            (ROOT / L["path"]).mkdir(exist_ok=True)
            (ROOT / L["path"] / "index.html").write_text(listing_page(L))
            print(f'wrote {L["path"]}/index.html')
            # keep the old long address working for links already shared
            (ROOT / "listings" / f'{L["slug"]}.html').write_text(
                REDIRECT.format(href=f'../{L["path"]}/', url=f'{DOMAIN}/{L["path"]}/'))
            print(f'wrote listings/{L["slug"]}.html (redirect)')
        else:
            (ROOT / "listings" / f'{L["slug"]}.html').write_text(listing_page(L))
            print("wrote listings/" + L["slug"] + ".html")
    (ROOT / "index.html").write_text(index_page())
    print("wrote index.html")
