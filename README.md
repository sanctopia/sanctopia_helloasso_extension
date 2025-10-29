# HelloAsso Form Automator

A Chrome extension to automate the creation of donation forms on HelloAsso.

## Features

- 🚀 Quick form filling with saved templates
- 💾 Save and reuse form data
- 🎯 Support for donation and crowdfunding forms
- ✨ Simple and intuitive interface

## Project Structure

```
sanctopia_extension/
├── manifest.json           # Extension configuration
├── popup.html             # Extension popup UI
├── popup.css              # Popup styling
├── popup.js               # Popup logic
├── content.js             # Content script for form automation
├── background.js          # Background service worker
├── icons/                 # Extension icons (need to be added)
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md              # This file
```

## Installation

### Development Mode

1. **Clone or download this project**

2. **Add extension icons** (or create placeholder icons):
   - Create 16x16, 48x48, and 128x128 pixel PNG images
   - Save them in the `icons/` folder with names: `icon16.png`, `icon48.png`, `icon128.png`
   - Alternatively, you can temporarily remove the icon references from [manifest.json](manifest.json) until you have icons ready

3. **Load the extension in Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right corner)
   - Click "Load unpacked"
   - Select the `sanctopia_extension` folder
   - The extension should now appear in your extensions list

4. **Pin the extension** (optional):
   - Click the puzzle piece icon in Chrome toolbar
   - Find "HelloAsso Form Automator"
   - Click the pin icon to keep it visible

## Usage

1. **Navigate to HelloAsso**:
   - Go to the HelloAsso admin panel at `https://admin.helloasso.com`
   - Navigate to the form creation page

2. **Open the extension popup**:
   - Click the extension icon in your Chrome toolbar

3. **Fill in form details**:
   - Enter the form title
   - Add a description
   - Set the target amount (optional)
   - Select the form type (Donation or Crowdfunding)

4. **Actions**:
   - Click **"Fill Form"** to automatically populate the HelloAsso form
   - Click **"Save Template"** to save the current data for later use

## Customization

### Updating Form Selectors

If HelloAsso updates their website structure, you may need to update the selectors in [content.js](content.js):

- Modify the `fillInput` function calls with new CSS selectors
- Update selectors to match HelloAsso's current form fields

### Adding More Fields

To add support for additional form fields:

1. Add the new field to [popup.html](popup.html)
2. Update [popup.js](popup.js) to collect the new field value
3. Update [content.js](content.js) to fill the new field on HelloAsso

## Development Notes

- The extension uses Manifest V3 (latest Chrome extension standard)
- Content scripts only run on `admin.helloasso.com` domains
- Form data is stored locally using Chrome's storage API
- The extension shows a checkmark badge when on HelloAsso pages

## Troubleshooting

**Extension doesn't appear in toolbar**:
- Check if it's enabled in `chrome://extensions/`
- Make sure "Developer mode" is enabled

**"Fill Form" button doesn't work**:
- Ensure you're on the correct HelloAsso page
- Check the browser console for errors (F12 → Console tab)
- HelloAsso may have updated their form selectors (see Customization section)

**Icons not showing**:
- Add icon files to the `icons/` folder
- Or temporarily remove icon references from [manifest.json](manifest.json)

## Future Enhancements

- [ ] Support for multiple saved templates
- [ ] Import/export templates
- [ ] Advanced field mapping
- [ ] Auto-detect form type
- [ ] Bulk form creation

## License

This project is for personal/educational use.
