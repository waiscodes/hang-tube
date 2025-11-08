# Hang Tube

A Chrome extension built with Manifest V3.

## Project Structure

```
hang-tube/
├── manifest.json          # Extension manifest (V3)
├── html/                  # HTML pages
│   ├── popup.html         # Popup UI
│   └── options.html       # Options page
├── js/                    # JavaScript files
│   ├── popup.js           # Popup logic
│   ├── background.js      # Service worker (background script)
│   ├── content.js         # Content script (runs on web pages)
│   └── options.js         # Options page logic
└── css/                   # Stylesheets
    └── styles.css         # Shared styles
```

## Setup Instructions

1. **Load the Extension**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `hang-tube` directory

2. **Test the Extension**
   - Click the extension icon in the toolbar to open the popup
   - Right-click the extension icon → "Options" to access the options page
   - The content script runs automatically on all web pages

## Features

- **Popup Interface**: Click the extension icon to open the popup
- **Content Script**: Runs on all web pages
- **Background Service Worker**: Handles extension lifecycle and messaging
- **Options Page**: Configure extension settings
- **Storage API**: Save and retrieve data using Chrome's storage API

## Development

- Edit files in this directory
- After making changes, go to `chrome://extensions/` and click the reload icon on your extension
- Check the browser console for logs from background.js
- Check page console for logs from content.js

## Building for Chrome Web Store

To create a zip file for uploading to Chrome Web Store:

```bash
npm run build
```

This will create `hang-tube.zip` in the root directory, excluding:
- Git files
- Node modules
- OS files (.DS_Store, etc.)
- Editor files
- Previous zip files

**Available scripts:**
- `npm run build` - Clean and create a new zip file
- `npm run compress` - Create zip file (without cleaning first)
- `npm run clean` - Remove the zip file

After building, upload `hang-tube.zip` to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).

## Manifest V3 Notes

- Uses `service_worker` instead of background pages
- Uses `action` instead of `browser_action`
- Uses `host_permissions` for host permissions
- Content scripts and messaging APIs work similarly to V2