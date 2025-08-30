import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useAppContext } from '@/context';
import { LightTheme, DarkTheme } from '@/constants/Theme';

/**
 * Displays and allows editing of the user's bio.
 * Monochrome, minimalist, supports inline or modal editing.
 */
export interface BioSectionProps {
  bio: string;
  onSave: (bio: string) => void;
}

export const BioSection: React.FC<BioSectionProps> = ({ bio, onSave }) => {
  const { theme } = useAppContext();
  const themeColors = theme === 'light' ? LightTheme : DarkTheme;
  const [editing, setEditing] = useState(false);
  const [bioDraft, setBioDraft] = useState(bio);

  const handleSave = () => {
    setEditing(false);
    if (bioDraft !== bio) onSave(bioDraft);
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={[styles.label, { color: themeColors.text }]}>Bio</Text>
        <TouchableOpacity onPress={() => setEditing(true)}>
          <FontAwesome name="pencil" size={16} color={themeColors.textSecondary} />
        </TouchableOpacity>
      </View>
      <Text style={[styles.bio, { color: themeColors.textSecondary }]}>{bio}</Text>
      <Modal visible={editing} animationType="fade" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.card }]}>
            <Text style={[styles.label, { color: themeColors.text }]}>Edit Bio</Text>
            <TextInput
              style={[styles.input, { color: themeColors.text }]}
              value={bioDraft}
              onChangeText={setBioDraft}
              multiline
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setEditing(false)} style={styles.actionBtn}>
                <Text style={[styles.actionText, { color: themeColors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={styles.actionBtn}>
                <Text style={[styles.actionText, { color: themeColors.text }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    paddingHorizontal: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  bio: {
    fontSize: 16,
    color: '#888',
    marginTop: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    width: '85%',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  input: {
    minHeight: 60,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: '#FFF',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  actionBtn: {
    marginLeft: 12,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
