// The widget gallery (the + in edit mode): pick a widget on the left, swipe
// through its sizes on the right with a live preview, then Add Widget.
import { BlurView } from 'expo-blur';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Icon } from '@/components/ui';
import { enabledApps, useDock } from '@/lib/dock';
import { addWidget, useLayout, WIDGET_APP, WIDGET_SIZES, type WidgetSize, type WidgetType } from '@/lib/layout';
import { WIDGET_INFO, WidgetView } from './home-widgets';
import type { HomeData } from './widgets';

const ORDER: WidgetType[] = ['clock', 'date', 'weather', 'upnext', 'due', 'notes'];
const SIZE_NAME: Record<WidgetSize, string> = { s: 'Small', m: 'Medium', l: 'Large' };
const ICON: Record<WidgetType, string> = { clock: 'clock', date: 'calendar', weather: 'cloud.sun.fill', upnext: 'bell.fill', due: 'graduationcap.fill', notes: 'pencil.and.scribble' };

export function WidgetGallery({ visible, page, data, onClose }: { visible: boolean; page: number; data: HomeData; onClose: () => void }) {
  const { cfg } = useDock();
  const { setLayout } = useLayout();
  const { width } = useWindowDimensions();
  const allowed = new Set(enabledApps(cfg));
  const types = ORDER.filter((t) => WIDGET_APP[t] == null || allowed.has(WIDGET_APP[t]!));
  const [type, setType] = useState<WidgetType>('clock');
  const [size, setSize] = useState<WidgetSize>('s');
  const sizes = WIDGET_SIZES[type];
  const cur = sizes.includes(size) ? size : sizes[0];

  const unit = 74;                      // preview cell
  const pw = cur === 's' ? unit * 2.2 : unit * 4.6, ph = cur === 'l' ? unit * 4.6 : unit * 2.2;
  const sheetW = Math.min(width - 40, 860);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.35)' }]} onPress={onClose} />
      <View pointerEvents="box-none" style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: sheetW, height: 620, borderRadius: 26, overflow: 'hidden', flexDirection: 'row' }}>
          <BlurView intensity={80} tint="systemThickMaterialLight" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(242,242,247,0.7)' }]} />
          <View style={{ width: 250, borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: 'rgba(60,60,67,0.25)', paddingTop: 22 }}>
            <Text style={{ fontSize: 22, fontWeight: '700', paddingHorizontal: 18, marginBottom: 12, color: '#000' }}>Widgets</Text>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 8 }}>
              {types.map((t) => (
                <Pressable key={t} onPress={() => { setType(t); setSize(WIDGET_SIZES[t][0]); }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 44, paddingHorizontal: 10, borderRadius: 10, backgroundColor: t === type ? 'rgba(0,122,255,0.14)' : 'transparent' }}>
                  <View style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={ICON[t]} size={15} color={t === type ? '#007AFF' : '#3A3A3C'} />
                  </View>
                  <Text style={{ fontSize: 16, color: '#000', fontWeight: t === type ? '600' : '400' }}>{WIDGET_INFO[t].name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          <View style={{ flex: 1, alignItems: 'center', paddingTop: 28 }}>
            <Pressable onPress={onClose} hitSlop={10} style={{ position: 'absolute', right: 16, top: 16, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(120,120,128,0.18)', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="xmark" size={13} color="#3C3C43" />
            </Pressable>
            <Text style={{ fontSize: 24, fontWeight: '700', color: '#000' }}>{WIDGET_INFO[type].name}</Text>
            <Text style={{ fontSize: 15, color: '#6C6C70', marginTop: 4 }}>{WIDGET_INFO[type].blurb}</Text>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <View pointerEvents="none">
                <WidgetView type={type} size={cur} w={pw} h={ph} data={data} refKey="preview" register={() => {}} onPress={() => {}} />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18 }}>
              {sizes.map((s) => (
                <Pressable key={s} onPress={() => setSize(s)} style={{ paddingHorizontal: 14, height: 30, borderRadius: 15, justifyContent: 'center', backgroundColor: s === cur ? '#000' : 'rgba(120,120,128,0.16)' }}>
                  <Text style={{ color: s === cur ? '#fff' : '#000', fontSize: 14, fontWeight: '600' }}>{SIZE_NAME[s]}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable onPress={() => { setLayout((l) => addWidget(l, type, cur, page)); onClose(); }}
              style={({ pressed }) => ({ marginBottom: 26, height: 50, paddingHorizontal: 28, borderRadius: 25, backgroundColor: '#007AFF', opacity: pressed ? 0.8 : 1, flexDirection: 'row', alignItems: 'center', gap: 8 })}>
              <Icon name="plus.circle.fill" size={18} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>Add Widget</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
