const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');

console.log('Building dist directory for web & Capacitor Android app...');

if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

function copyRecursive(src, dest) {
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        fs.readdirSync(src).forEach(file => {
            copyRecursive(path.join(src, file), path.join(dest, file));
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

const filesToCopy = ['index.html', 'style.css', 'script.js', 'manifest.json', 'sw.js'];
filesToCopy.forEach(f => {
    const src = path.join(rootDir, f);
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(distDir, f));
    }
});

const dirsToCopy = ['js', 'css'];
dirsToCopy.forEach(d => {
    const src = path.join(rootDir, d);
    if (fs.existsSync(src)) {
        copyRecursive(src, path.join(distDir, d));
    }
});

console.log('dist directory built successfully!');
