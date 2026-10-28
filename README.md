# School Dock

An iPad app that looks and works like an iPad lock screen and home screen,
with school apps inside it. Schools lock students into it. The starter
settings (site list, weather) are set up for Great Neck North High School.

| App | What it is | Code |
| --- | --- | --- |
| **Quill** | Notes written with Apple Pencil (native PencilKit), AI study panel, scan paper, PDFs | `modules/quill-canvas`, `src/app/(apps)/quill.tsx`, `src/app/(apps)/note/[id].tsx` |
| **Classroom** | Google Classroom, read-only, plus hand-in | `src/lib/classroom.ts`, `src/app/(apps)/classroom.tsx` |
| **Desmos** | Graphing calculator (WebView limited to desmos.com) | `src/components/desmos.tsx` |
| **Studento** | Flap-board bell clock with an optional schedule | `src/app/(apps)/clock.tsx`, `src/lib/schedule.ts` |
| **Edpuzzle, Khan Academy, Quizlet, Kahoot!** | The real websites in a browser locked to that site plus Google / Microsoft / Clever sign-in | `src/app/(apps)/web/[id].tsx`, `src/lib/apps.ts` |
| **Dictionary** | Definitions, synonyms, opposites (Datamuse, no key) and the iPad's voice saying the word | `src/app/(apps)/dictionary.tsx`, `src/lib/dictionary.ts` |
| **Weather** | Now, 24 hours, 10 days and details (Open-Meteo, no key); also shown next to the date on the lock screen | `src/app/(apps)/weather.tsx`, `src/lib/weather.ts` |
| **Ray** | Restricted search in Ray's look: strict SafeSearch, and only school-approved sites open | `src/app/(apps)/ray.tsx`, `src/lib/sites.ts` |

Quill, Classroom, Desmos and Studento are copied from `tests/notes-native`, so
changes made there do not show up here by themselves.

**About Ray here:** this is not the Ray proxy (`tests/veil`). It searches
DuckDuckGo directly from the iPad with SafeSearch locked to strict, so the
school's own web filter still applies. Results from sites that aren't on the
list are greyed out, and every link to them is blocked. The starter list
(`src/lib/sites.ts`) covers research databases, Regents/AP prep, math and
science tools, writing help and news. The admin can edit it or switch to
"Allow Any Website".

## How it works

- **Lock screen** (`src/components/dock/lock-screen.tsx`): date, big clock,
  wallpaper, the school's name and two small widgets. Swipe up to open. If a
  student passcode is set, the iOS keypad comes next. The lock screen shows at
  launch and every time the iPad wakes, on top of whatever app was open.
- **Home screen** (`src/app/index.tsx`, `src/lib/layout.tsx`): pages of apps and
  widgets packed into an iPadOS grid, page dots, a dock with the App Library.
  Touch and hold to edit: icons wiggle, drag them between pages and into or out
  of the dock, remove them (they stay in the App Library), add widgets with +
  (Clock, Calendar, Weather, Up Next, Due Soon, Recent Notes in small, medium
  and large). Tapping an icon zooms the app open; swipe up on the home bar to
  go back.
- **Lock screen customizing**: touch and hold the clock to pick its font,
  colour and up to four widgets. Due-soon assignments show as notifications.
- **Settings app**: wallpaper, icon size and dark icons, lock screen, Guided
  Access help, and School Admin (passcode).
- **Guided Access, School Dock style**: triple-tap the home bar in any app,
  enter the admin passcode, pick a time limit, Start. Students can't leave
  that app until it ends.
- **Website apps**: School Admin > Website Apps adds any site as an app with its
  own icon, locked to that site.
- **Bottom-edge swipes**: `modules/school-lock/ios/EdgeGuard.swift` defers the
  bottom screen edge so iPadOS doesn't steal the home-bar swipe.
- **Admin** (`src/components/dock/admin.tsx`): long-press the school name on
  the lock screen, or an empty spot on the home screen, for 1.5 seconds. Then
  enter the 6-digit admin passcode. From there you can set the school name,
  wallpaper (built-in or a photo), which apps show, widgets, whether students
  may edit the bell schedule, the student passcode and the lock.
- **First run** (`setup.tsx`): asks for the school name and creates the admin
  passcode. This step is skipped when the MDM sends `adminPin` (see below).

## For school IT: locking students in

School Dock asks iOS for **Autonomous Single App Mode (ASAM)** when it starts
(`UIAccessibility.requestGuidedAccessSession`, in `modules/school-lock`).
iOS only allows this on **supervised** iPads, and only if your MDM lists this
app. On any other iPad the request does nothing, and you can use Guided Access
instead (see below).

### Option A: Autonomous Single App Mode (recommended)

The app locks itself at launch. An admin can unlock it from the admin screen.

1. The iPad must be **supervised**: enrolled through Apple School Manager /
   Automated Device Enrollment, or supervised with Apple Configurator.
2. Install School Dock through your MDM (bundle id `com.solyapps.schooldock`).
3. In your MDM, add a **Restrictions** payload with
   *Autonomous Single App Mode allowed apps*
   (`autonomousSingleAppModePermittedAppIDs`) = `com.solyapps.schooldock`.
   - Jamf Pro: Configuration Profile → Restrictions → Apps → "Allow Autonomous Single App Mode".
   - Mosyle: Restrictions → "Apps allowed to autonomously enter Single App Mode".
   - Intune: Device restrictions (iOS/iPadOS) → "Autonomous Single App Mode".
4. Leave **Lock automatically at launch** on in the admin screen (it is on by
   default). Students can't leave the app: the home gesture, app switcher,
   Control Center and notifications are all off.

### Option B: Single App Mode pushed by the MDM

The MDM keeps the iPad in School Dock permanently, and only the MDM can turn
it off. Use an **App Lock** payload (`com.apple.app.lock`) with
`Identifier` = `com.solyapps.schooldock`. School Dock sees the lock and shows
"Single App Mode: On" in the admin screen. The admin screen's Unlock button
won't work in this mode. Remove the payload in the MDM instead.

### Option C: Guided Access (any iPad, no MDM)

1. Settings → Accessibility → Guided Access → turn it on and set a passcode.
2. Open School Dock and triple-click the top (or side) button → Start.
3. To end it, triple-click and enter the Guided Access passcode.

### Settings the MDM can push (managed app configuration)

Send these keys in the app's **managed app configuration**
(`com.apple.configuration.managed`). Any key you send overrides the
setting on the iPad, and the admin screen shows it as "Set by your school".

| Key | Type | Example |
| --- | --- | --- |
| `schoolName` | string | `Great Neck North Middle School` |
| `adminPin` | string (6 digits) | `482913`. Skips first-run setup |
| `apps` | string (comma list) or array | `quill,classroom,desmos,studento,edpuzzle,khan,quizlet,kahoot,dictionary,weather,ray` |
| `wallpaper` | string | `north`, `pine`, `harbor`, `slate` or `graphite` |
| `widgets` | boolean | `true` |
| `studentPasscode` | string (4 digits) | `""` for none |
| `studentsEditSchedule` | boolean | `false` |
| `autoLock` | boolean | `true` |
| `studentsCustomize` | boolean | `true`. Students may change wallpaper, lock screen, home screen |
| `searchAnySite` | boolean | `false`. Ray may open any site (SafeSearch stays strict) |
| `allowedSites` | string (comma list) or array | `wikipedia.org,jstor.org,nysedregents.org` |

Example (Jamf "App Configuration" XML):

```xml
<dict>
  <key>schoolName</key><string>Great Neck North Middle School</string>
  <key>adminPin</key><string>482913</string>
  <key>apps</key><string>quill,classroom,desmos,studento</string>
  <key>autoLock</key><true/>
</dict>
```

### Google Classroom

The Classroom app signs in through Google's OAuth client **"Quill"**
(client id `1054438954717-…apps.googleusercontent.com`, project
`quill-classroom-512000`). In the Google Admin console, go to Security →
API controls → Manage third-party app access, and set that client to
**Trusted**. Otherwise students see "Access blocked". The client only reads
classes, assignments and attached Drive files. It can't hand in for students,
because Google lets only its own apps press "Turn in". Students hand in by
saving the PDF and attaching it on Google's own assignment page, which opens
in a Safari sheet inside School Dock. Both steps work while the iPad is locked.

## Google sign-in return URL

The backend (`tests/quill-study/lib/google.js`) always returns to
`inkpad://classroom`. School Dock's own scheme is `schooldock`, but it still
passes `inkpad://classroom` to `WebBrowser.openAuthSessionAsync`. iOS's
`ASWebAuthenticationSession` catches a redirect to the scheme it was given
inside its own session, even if the app doesn't register that scheme. So
sign-in works without changing the live backend, even with Quill installed on
the same iPad.

A cleaner later change, which needs your OK because it touches the live
backend: let `/auth/google/start?app=schooldock` return to
`schooldock://classroom`, and switch `RETURN` in `src/lib/classroom.ts`.

## Develop

```bash
npm install
npm run typecheck
npm run check-sdk
npx expo start --web --port 8120
```

- Expo **SDK 57**. Don't upgrade to 58: prebuilt `expo-*` frameworks from
  another SDK crash the app at launch. `scripts/check-sdk.cjs` guards this,
  and `expo-font` is pinned through `overrides`.
- Local native modules are autolinked from `./modules`: `quill-canvas`
  (PencilKit, scanner, PDF) and `school-lock` (ASAM + managed config).
  `.gitignore` uses `/ios/` (not `ios/`), so `modules/*/ios` is committed.
- The web preview has no PencilKit, ASAM or scanner. Those need an iPad build.

## Build for iPad

`.github/workflows/ios-testflight.yml` is the same free GitHub-macOS-runner
workflow Quill uses (`eas build --local` + `eas submit`). It isn't set up
yet. It still needs:
1. an EAS project (`eas init`, adds `extra.eas.projectId` + `owner`),
2. the public GitHub repo theprojectmaker/school-dock with the `EXPO_TOKEN` and `QUILL_APP_TOKEN` secrets (`scripts/set-secrets.ps1`),
3. one interactive `eas credentials` (Apple login) for `com.solyapps.schooldock`,
4. after the first build, one interactive `eas submit` to create the App Store
   Connect app, then `submit.production.ios.ascAppId` in `eas.json`.
