# Fellowship Website

Static site (HTML/CSS/JS, no build step). Open `index.html` in a browser, or run `python3 -m http.server` and visit http://localhost:8000.

## Customize
- `data/site.js`: name, tagline, email, address, meeting times, social links, contact form endpoint.
- `data/gallery.js`: cloud album links (Google Photos, iCloud, Drive...) and individual photos (local files in `images/gallery/` or any image URL).
- `about.html`: replace the `[bracketed]` placeholder text (story, beliefs, team).

## Contact form
Create a free form at https://formspree.io and paste its endpoint into `formEndpoint` in `data/site.js`. Without it, the form opens the visitor's email app.

## Hosting
Push to GitHub, then Settings > Pages > Deploy from branch `main` (root).
