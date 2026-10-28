// First run: whoever sets the iPad up (teacher, IT, parent) names the school
// and picks the admin passcode. Skipped when the school's MDM sends the admin
// passcode as managed app configuration.
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/ui';
import { APP_ORDER, APPS } from '@/lib/apps';
import { useDock } from '@/lib/dock';
import { AppIconArt } from './app-icon';
import { PasscodePad } from './passcode';

export function Setup() {
  const dock = useDock();
  const [step, setStep] = useState<'hello' | 'pin' | 'confirm'>('hello');
  const [school, setSchool] = useState(dock.cfg.school);
  const [pin, setPin] = useState('');

  if (step !== 'hello') {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
        <PasscodePad light length={6}
          title={step === 'pin' ? 'Create an Admin Passcode' : 'Enter It Again'}
          subtitle={step === 'pin' ? 'Six digits. You need it to change settings or unlock this iPad, so keep it away from students.' : undefined}
          onSubmit={async (c) => {
            if (step === 'pin') { setPin(c); setStep('confirm'); return true; }
            if (c !== pin) { setStep('pin'); return false; }
            await dock.setPin(c);
            dock.set({ school: school.trim(), setup: true });
            return true;
          }}
          onCancel={() => setStep('hello')} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <View style={{ flexDirection: 'row', gap: 14, marginBottom: 34 }}>
        {APP_ORDER.slice(0, 6).map((id) => <AppIconArt key={id} app={APPS[id]} size={60} />)}
      </View>
      <Text style={{ fontSize: 40, fontWeight: '700', letterSpacing: -0.8, color: '#000' }}>School Dock</Text>
      <Text style={{ fontSize: 17, color: '#6C6C70', marginTop: 10, textAlign: 'center', maxWidth: 480, lineHeight: 23 }}>
        Notes, Classroom, Desmos, the bell clock and approved websites, on one home screen students stay inside.
      </Text>
      <View style={{ width: '100%', maxWidth: 440, marginTop: 36, backgroundColor: '#F2F2F7', borderRadius: 12, paddingHorizontal: 16 }}>
        <TextInput value={school} onChangeText={setSchool} placeholder="School name, e.g. Great Neck North High School" placeholderTextColor="#8E8E93" autoFocus={Platform.OS !== 'web'}
          returnKeyType="next" onSubmitEditing={() => school.trim() && setStep('pin')}
          style={{ height: 50, fontSize: 17, color: '#000' }} />
      </View>
      <Pressable disabled={!school.trim()} onPress={() => setStep('pin')}
        style={({ pressed }) => ({ width: '100%', maxWidth: 440, height: 50, borderRadius: 12, marginTop: 16, alignItems: 'center', justifyContent: 'center',
          backgroundColor: '#007AFF', opacity: !school.trim() ? 0.35 : pressed ? 0.8 : 1 })}>
        <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>Continue</Text>
      </Pressable>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 26 }}>
        <Icon name="lock.fill" size={13} color="#8E8E93" />
        <Text style={{ color: '#8E8E93', fontSize: 13 }}>Managed iPads can skip this: see "For school IT" in the README.</Text>
      </View>
    </KeyboardAvoidingView>
  );
}
