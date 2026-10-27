# bpdang07_portfolio

Personal site for Billy Phu Dang: cloud & full-stack developer. Plain HTML, CSS and JavaScript with no build step.

## Run it locally

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080.

## What's where

| Path | What it is |
|---|---|
| `index.html` | All five tabs (Home, Experience, Projects, Art, Résumé) and their content |
| `css/style.css` | Theme tokens (light + dark), layout, and all animations |
| `js/main.js` | Tab routing, theme toggle, scroll reveals, experience timeline, live GitHub repos |
| `js/art.js` | The Art tab's generative sketches (p5.js) and the code that runs them |
| `assets/avatar.jpg` | Profile photo (cropped from the GitHub avatar) |
| `assets/Billy-Dang-Resume.pdf` | Résumé shown on the Résumé tab. Local only: it's in `.gitignore` because it includes a phone number |

## Editing

- **Add a job:** add a `<li class="g-row">` to the timeline (start/end as `YYYY-MM`, or `present`) and a matching `<article class="card exp-card">` with the same id as its `data-target`.
- **Add a project:** copy one `<article class="card project">` in the Projects tab; `data-cat` sets which filters show it (`cloud`, `mobile`, `games`, `tools`).
- **Add an art sketch:** add an entry to `SKETCHES` in `js/art.js`. The `sketch` function is ordinary p5.js instance-mode code (`p.setup`, `p.draw`) plus a `p.restart()` that redraws from scratch; `C` gives it the canvas size and the site's theme colours. Its Code button shows that function's source as written.
- **Résumé:** when the PDF is missing (as on the published site), the Résumé tab shows a "PDF on request" card instead. To publish a résumé, save a phone-free version as `assets/Billy-Dang-Resume.pdf` and remove that line from `.gitignore`.

The Art tab loads p5.js from cdnjs only when it's first opened, and each sketch animates only while it's on screen.

The "Live from GitHub" section reads public repos from the GitHub API whenever the Projects tab opens, so new repos show up on their own. The **Interview prep** button in the header opens the published prep site (https://bpdang07.github.io/ibm-interview-prep/), or the local copy on port 8081 when the portfolio runs on your own computer.

## Publish (GitHub Pages)

GitHub Pages is free for public repos. In the repo on github.com:

1. **Settings → General → Danger Zone → Change visibility → Public.**
2. **Settings → Pages → Build and deployment → Source: Deploy from a branch → `main` / `(root)` → Save.**

After a minute or two the site is live at https://bpdang07.github.io/bpdang07_portfolio/, and every push to `main` updates it.
