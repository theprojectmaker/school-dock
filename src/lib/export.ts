// Handing a finished PDF or image to the iOS share sheet (or a download in the
// browser preview). The PDF itself comes from the PencilKit canvas.
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { fsx } from './fsx';

export async function shareImage(path: string) {
  if (Platform.OS === 'web') {
    const a = (globalThis as any).document.createElement('a');
    a.href = fsx.uri(path); a.download = path.split('/').pop() || 'page.jpg'; a.click();
    return;
  }
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(fsx.uri(path), { mimeType: 'image/jpeg', UTI: 'public.jpeg' });
}

export async function sharePdf(path: string, title: string) {
  if (Platform.OS === 'web') {
    const a = (globalThis as any).document.createElement('a');
    a.href = fsx.uri(path);
    a.download = path.split('/').pop() || 'note.pdf';
    a.click();
    return;
  }
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(fsx.uri(path), { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: title });
}
