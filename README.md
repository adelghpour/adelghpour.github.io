# Adel Ghasempour Portfolio

## Edit the portfolio

All profile and project content lives in [`portfolio.json`](portfolio.json). Edit that file to update your name, contact details, skills, teaching information, archive folders, projects, experience, education, galleries, and links. The page templates and animations stay in their HTML, CSS, and JavaScript files.

The data loader reads `portfolio.json` for the home page, project galleries, and game pages. Because browsers block local JSON requests from `file://`, preview the site through the included server:

1. Open PowerShell in the portfolio folder.
2. Run `python serve.py`.
3. Open `http://127.0.0.1:8000/` in your browser.

Stop the server with `Ctrl+C`.

## Add a project

Add a new object to the `projects` array in `portfolio.json`. Give it a unique `id`, and set `group` to a folder's `group` value in `archiveFolders` (`games`, `art`, or `case-studies` in the current data).

```json
{
  "id": "my-new-game",
  "group": "games",
  "title": "My New Game",
  "category": "Puzzle · Personal project",
  "image": "img/my-new-game-cover.jpg",
  "imageAlt": "A screenshot of My New Game",
  "gallery": [
    {
      "src": "img/my-new-game-cover.jpg",
      "type": "image",
      "alt": "A screenshot of My New Game"
    }
  ],
  "description": "A short description of the project.",
  "role": "Game design and programming",
  "links": []
}
```

Gallery items use `type: "image"` or `type: "video"`. A video can include an optional `poster` image for its preview. Keep paths relative to the portfolio folder. Set a project's `image` to a video file when you want that project's archive cover and main gallery video to play muted and loop. `featuredNote` and `playableUrl` are optional. Set `playableUrl` only for a browser-ready Unity WebGL build; the current test build is under `Games/Try Harder Soul Swap/`.

To add a folder, add an item to `archiveFolders` with a unique `id`, `title`, `group`, and `description`. Set each project's `group` to that folder's `group` value. The folder preview and project list are generated from the JSON data.

## Project files

- `index.html` contains the landing page and scroll animation.
- `portfolio.json` is the editable content source.
- `js/data-loader.js` loads the JSON for all pages.
- `js/home-content.js` renders the archive folders and project cards.
- `project.html` and `js/project-detail.js` display project galleries.
- `play.html` and `js/play.js` display browser-playable builds.
- `css/` contains the site styles.
- `frames/` contains the 142 scroll-animation frames.
- `img/` contains project media. The résumé link points to `HTML/Files/`.
- `serve.py` serves the site locally and sets the compressed Unity WebGL headers.
