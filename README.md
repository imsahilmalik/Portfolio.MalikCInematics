# Malik Cinematics portfolio

A static website for GitHub Pages. The YouTube list refreshes itself.

## Files

- `index.html`, `style.css`, `script.js`: the site
- `videos.json`: the video list (the GitHub Action rewrites it before every deploy)
- `scripts/update_videos.py`: reads the public YouTube feed, no API key needed
- `.github/workflows/deploy.yml`: refreshes the videos every 6 hours and publishes the site

## Things you may want to change

- `script.js`, top: `verticalDriveFileId` (paste the Drive FILE id of the vertical sample to play it inside the page)
- `index.html`: text, contact details, links
- `.github/workflows/deploy.yml`: the cron line sets how often the list refreshes

## Notes

- The Drive folder must be shared as "Anyone with the link: Viewer", or visitors cannot open it.
- GitHub can pause scheduled workflows after about 60 days without any activity in the repository. If that happens, open the Actions tab and run the workflow once.
