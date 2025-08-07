// Deploy script for GitHub Pages
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoName = path.basename(process.cwd());
const distPath = path.join(process.cwd(), 'dist');

if (!fs.existsSync(distPath)) {
  console.error('Build folder not found. Run `npm run build` first.');
  process.exit(1);
}

try {
  execSync('git checkout --orphan gh-pages');
  execSync('git --work-tree dist add --all');
  execSync('git --work-tree dist commit -m "gh-pages"');
  execSync('git push origin HEAD:gh-pages --force');
  execSync('git checkout -');
  console.log('Deployed to gh-pages branch!');
} catch (e) {
  console.error('Deployment failed:', e);
  process.exit(1);
}
