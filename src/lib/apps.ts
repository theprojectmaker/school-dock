// The mini apps inside the dock: name, where they open, how the icon looks,
// and for the web apps which sites they may load.
export type AppId =
  | 'quill' | 'classroom' | 'desmos' | 'studento'
  | 'edpuzzle' | 'khan' | 'quizlet' | 'kahoot'
  | 'dictionary' | 'weather' | 'ray';

export type DockApp = {
  id: AppId;
  name: string;
  route: string;
  top: string; bottom: string; // icon background gradient
  splash: string;              // what the screen looks like while it opens
  dock?: boolean;              // sits in the dock as well as on the home screen
  on: boolean;                 // shown by default (the admin can change it)
  web?: { url: string; hosts: string[]; blurb: string };   // a website in a locked-down browser
};

export const APPS: Record<AppId, DockApp> = {
  quill: { id: 'quill', name: 'Quill', route: '/quill', top: '#6AA8FF', bottom: '#1F5BEA', splash: '#F6F5F2', dock: true, on: true },
  classroom: { id: 'classroom', name: 'Classroom', route: '/classroom', top: '#4CD787', bottom: '#138A47', splash: '#F6F5F2', dock: true, on: true },
  desmos: { id: 'desmos', name: 'Desmos', route: '/calculator', top: '#3A3A3E', bottom: '#0F0F12', splash: '#FFFFFF', dock: true, on: true },
  studento: { id: 'studento', name: 'Studento', route: '/clock', top: '#FFB547', bottom: '#FF5E1A', splash: '#0E0F12', dock: true, on: true },
  edpuzzle: {
    id: 'edpuzzle', name: 'Edpuzzle', route: '/web/edpuzzle', top: '#8B7BFF', bottom: '#4B2FD6', splash: '#FFFFFF', on: true,
    web: { url: 'https://edpuzzle.com/', hosts: ['edpuzzle.com'], blurb: 'Video lessons from your teacher' },
  },
  khan: {
    id: 'khan', name: 'Khan Academy', route: '/web/khan', top: '#3FD1B0', bottom: '#0B7F72', splash: '#FFFFFF', on: true,
    web: { url: 'https://www.khanacademy.org/', hosts: ['khanacademy.org', 'kastatic.org'], blurb: 'Practice and lessons' },
  },
  quizlet: {
    id: 'quizlet', name: 'Quizlet', route: '/web/quizlet', top: '#5C7BFF', bottom: '#2335B8', splash: '#FFFFFF', on: false,
    web: { url: 'https://quizlet.com/', hosts: ['quizlet.com'], blurb: 'Flashcards and study sets' },
  },
  kahoot: {
    id: 'kahoot', name: 'Kahoot!', route: '/web/kahoot', top: '#8F3BFF', bottom: '#4A0FA8', splash: '#FFFFFF', on: false,
    web: { url: 'https://kahoot.it/', hosts: ['kahoot.it', 'kahoot.com'], blurb: 'Join a class game with a PIN' },
  },
  dictionary: { id: 'dictionary', name: 'Dictionary', route: '/dictionary', top: '#E2504A', bottom: '#9B1C24', splash: '#F6F5F2', on: true },
  weather: { id: 'weather', name: 'Weather', route: '/weather', top: '#5AA9F0', bottom: '#1F5FB8', splash: '#2C6BC0', on: true },
  ray: { id: 'ray', name: 'Ray', route: '/ray', top: '#FFF6E6', bottom: '#F3E2C0', splash: '#F6EDD9', on: true },
};

export const APP_ORDER: AppId[] = ['quill', 'classroom', 'desmos', 'studento', 'edpuzzle', 'khan', 'quizlet', 'kahoot', 'dictionary', 'weather', 'ray'];

/** Sign-in pages the web apps need (Google, Microsoft, Clever, Apple). */
export const SIGN_IN_HOSTS = [
  'accounts.google.com', 'accounts.youtube.com', 'google.com', 'gstatic.com', 'googleusercontent.com',
  'login.microsoftonline.com', 'login.live.com', 'clever.com', 'appleid.apple.com',
];

/** True when `url`'s host is one of `hosts` or a subdomain of one. */
export function hostAllowed(url: string, hosts: string[]): boolean {
  try {
    const h = new URL(url).hostname.toLowerCase();
    return hosts.some((d) => h === d || h.endsWith('.' + d));
  } catch { return false; }
}
