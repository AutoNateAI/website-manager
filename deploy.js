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
  // Create a basic 404.html file if not found
  const basic404Content = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Page not found</title>
  <script>
    window.location.href = window.location.origin + '/website-manager';
  </script>
</head>
<body>
  Redirecting to homepage...
</body>
</html>`;
  fs.writeFileSync(dest404, basic404Content);
  console.log('Created basic 404.html in dist directory');
}

console.log('GitHub Pages deployment preparation complete!');
