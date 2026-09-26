# StatusBanner

A one-line connection message under the site header.

Props: `tone` offline | back | info, `title` (bold lead-in), `children` (the message), `icon` (override), `action` (a ghost button label; not shown on the ink offline banner).

- `offline`: ink banner, WifiOff icon. "You're offline. Keep going: your work is saved on this device." Never block the page.
- `back`: teal-soft banner, Wifi icon. "You're back online. Your work is saved." Hides after a few seconds.
- `info`: lavender-wash banner for things like "Videos are off to save data."
- Plain words, no error codes, no "please".
