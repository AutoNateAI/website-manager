// deploy.js - Script to prepare files for GitHub Pages deployment
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name from the URL of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Define paths
const distDir = path.join(__dirname, 'dist');

// Ensure .nojekyll file exists in dist directory
const nojekyllPath = path.join(distDir, '.nojekyll');
fs.writeFileSync(nojekyllPath, '');
console.log('Created .nojekyll file');

// Copy 404.html to the dist directory for SPA routing
const source404 = path.join(__dirname, 'public', '404.html');
const dest404 = path.join(distDir, '404.html');

if (fs.existsSync(source404)) {
  fs.copyFileSync(source404, dest404);
  console.log('Copied 404.html to dist directory');
} else {
  console.warn('Warning: Could not find 404.html in public directory');
  // Create a more advanced 404.html file for SPA routing
  const spa404Content = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Page not found</title>
  <script>
    // Single Page Apps for GitHub Pages
    // MIT License - https://github.com/rafgraph/spa-github-pages
    // This script takes the current URL and converts the path and query
    // string into just a query string, and then redirects the browser
    // to the new URL with only a query string and hash fragment

    // Set pathSegmentsToKeep to 1 for GitHub Pages project sites
    var pathSegmentsToKeep = 1;

    var l = window.location;
    l.replace(
      l.protocol + '//' + l.hostname + (l.port ? ':' + l.port : '') +
      l.pathname.split('/').slice(0, 1 + pathSegmentsToKeep).join('/') + '/?/' +
      l.pathname.slice(1).split('/').slice(pathSegmentsToKeep).join('/').replace(/&/g, '~and~') +
      (l.search ? '&' + l.search.slice(1).replace(/&/g, '~and~') : '') +
      l.hash
    );
  </script>
</head>
<body>
  <h2>Redirecting...</h2>
</body>
</html>`;
  fs.writeFileSync(dest404, spa404Content);
  console.log('Created SPA-ready 404.html in dist directory');
}

// Process index.html to replace %BASE_URL% placeholders
const indexPath = path.join(distDir, 'index.html');
if (fs.existsSync(indexPath)) {
  let indexContent = fs.readFileSync(indexPath, 'utf8');
  // Replace %BASE_URL% with the actual base path for GitHub Pages
  indexContent = indexContent.replace(/%BASE_URL%/g, '/website-manager/');
  fs.writeFileSync(indexPath, indexContent);
  console.log('Processed index.html with correct base URLs');
}

console.log('GitHub Pages deployment preparation complete!');

