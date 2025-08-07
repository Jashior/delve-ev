
# Delve Run Value Calculator

This is a simple, elegant web app for Old School RuneScape (OSRS) Delve content. It helps you estimate the expected value and gp/hour of your Delve runs based on drop rates and live Grand Exchange prices.

## Features

- Add, edit, and remove Delve runs (each with Delve level completed and time taken in minutes)
- Reset all runs with one click
- Fetches live item prices from the [OSRS Wiki](https://prices.runescape.wiki/)
- Calculates expected value per run based on drop rates and prices
- Shows total value, total time, and GP/hour (gold per hour)
- Clean, modern, and easy-to-use interface


## Usage

### Local Development

1. Start the dev server:
   ```sh
   npm run dev
   ```
2. Open the app in your browser (usually at http://localhost:5173)
3. Add your Delve runs (enter the highest wave completed and time taken for each run)
4. See your expected value and GP/hour update live

### Deploy to GitHub Pages

1. Make sure your repo is pushed to GitHub and the `base` in `vite.config.ts` matches your repo name (e.g. `/delve-ev/`).
2. Build and deploy:
   ```sh
   npm run deploy
   ```
   This will build the app and push the contents of `dist/` to the `gh-pages` branch using the [gh-pages](https://www.npmjs.com/package/gh-pages) package.
3. Your site will be live at `https://<your-username>.github.io/<your-repo-name>/`

## Customization

Drop rates and item IDs are hardcoded for:
- Avernic Treads
- Confliction Gauntlets (price adjusted for required materials)
- Eye of Ayak

You can update drop rates or add new items in `src/App.tsx`.

---

Built with [Vite](https://vitejs.dev/) and [React](https://react.dev/) using TypeScript.
