[link-chrome]: https://chromewebstore.google.com/detail/superpower-mdl/fmenhfapnanfblbaimcdoacigkffldcp "Chrome Web Store"

# Superpower MDL

  <div align="center">

[<img src="https://user-images.githubusercontent.com/574142/232173820-eea32262-2b0f-4ec6-8a38-b1c872981d75.png" height="67" alt="Chrome" valign="middle">][link-chrome]

</div>
Superpower MDL enhances the MyDramaList experience with quick drama searches, time tracking, and episode release alerts. This Chrome extension offers a simple popup interface to manage notifications and recent searches. Designed for drama fans, it integrates smoothly with MyDramaList pages.

## Features

- **Quick Search**: Users can highlight text and search MyDramaList via right-click or the `Ctrl+Shift+F` shortcut. Typing `md` in the address bar followed by a drama name also triggers a search.
- **Time Tracking**: The extension shows daily time spent on MyDramaList in the popup.
- **Episode Alerts**: Notifications for upcoming episodes can be set manually or auto-detected from MyDramaList pages.
- **Recent Searches**: The popup lists up to 10 recent searches for easy access.
- **Sorting**: Notifications sort by "Recently Added" or "Soon to Air" via a dropdown.

## Installation

To use Superpower MDL locally or contribute to its development, follow these steps:

1. **Clone the Repository**:
```
git clone https://github.com/sojinsamuel/Superpower-MDL
```
2. **Open Chrome Extensions**:
- Navigate to `chrome://extensions/` in Chrome.
- Enable "Developer mode" in the top right.
3. **Load the Extension**:
- Click "Load unpacked" and select the `Superpower-MDL` folder.
4. **Verify**:
- The extension icon should appear in the toolbar. Pin it for quick access.

## Usage

- **Search**: Highlight a drama name, right-click, and select "Search on MyDramaList," or use `Ctrl+Shift+F`. Alternatively, type `md [drama name]` in the address bar.
- **Track Time**: Open the popup to see time spent on MyDramaList today.
- **Set Alerts**: Click "Notify" in the popup. On MyDramaList pages, it auto-fills data; otherwise, enter details manually in the form.
- **Sort Notifications**: In the notifications tab, use the dropdown to sort by "Recently Added" or "Soon to Air."

## File Structure

- `manifest.json`: Defines the extension’s structure and permissions.
- `background.js`: Manages searches, notifications, and recent search storage.
- `popup.html`: Provides the popup interface.
- `popup.css`: Styles the popup.
- `popup.js`: Handles popup logic, including notifications and searches.
- `icon16.png`, `icon48.png`, `icon128.png`: Extension icons.

## Contributing

Contributions to Superpower MDL are welcome. To contribute:

1. **Fork the Repository**: Create a fork on GitHub.
2. **Make Changes**: Edit the code in your fork.
3. **Submit a Pull Request**: Open a pull request with a description of your changes.

Suggestions include bug fixes, new features, or UI improvements. Please ensure code aligns with the extension’s purpose: enhancing MyDramaList usage.

## Permissions

Superpower MDL requires these permissions:
- `contextMenus`: Adds right-click search option.
- `activeTab`, `scripting`: Fetches data from MyDramaList pages.
- `omnibox`: Enables `md` keyword search.
- `storage`: Saves searches, time, and notifications locally.
- `notifications`, `alarms`: Displays episode alerts.

All data stays on the user’s device. No external servers receive it.

## Privacy

This extension stores recent searches, time spent, and notification details locally using Chrome’s storage. It does not collect personal information or send data externally. For details, see the [Privacy Policy](https://[your-hosted-url]/privacy-policy).

## Copyright

Superpower MDL

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), for their own personal use or to contribute to the project, subject to the following conditions:

1. The user is not permitted to redistribute the Software or any part of the Software, or the source code.
2. The user is not permitted to use the source of the Software, or any part thereof, for any other projects or purposes, including competing with the project in any way.
3. The user is not permitted to use the Software for any commercial purposes.
4. The copyright holder reserves the right to change this license at any time without notice.

Any contributions to the project, whether used or not, are subject to the same terms and conditions as outlined in this license, if the contribution is accepted, you agree to waive all rights to the contribution. You agree that if you contribute something, that does not follow these terms, you are fully liable for any damages.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Contact

For questions or support, open an issue on GitHub or reach out via [Email](mailto:sojinsamuel2001@gmail.com).

Enjoy a better MyDramaList experience with Superpower MDL!
