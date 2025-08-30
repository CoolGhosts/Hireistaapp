import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAppContext } from '@/context';
import { LightTheme, DarkTheme } from '@/constants';

/**
 * Minimalist resume upload/preview/download/delete manager.
 * Monochrome, borderless, modern look.
 */
export interface ResumeManagerProps {
  resumeFile?: { name: string; uri: string } | null;
  onUpload: () => void;
  onPreview: () => void;
  onDownload: () => void;
  onDelete: () => void;
}

export const ResumeManager: React.FC<ResumeManagerProps> = ({ resumeFile, onUpload, onPreview, onDownload, onDelete }) => {
  const { theme } = useAppContext();
  const themeColors = theme === 'light' ? LightTheme : DarkTheme;
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={[styles.label, { color: themeColors.text }]}>Resume</Text>
        <TouchableOpacity onPress={onUpload}>
          <FontAwesome5 name="upload" size={16} color={themeColors.textSecondary} />
        </TouchableOpacity>
      </View>
      {resumeFile ? (
        <View style={styles.fileRow}>
          <FontAwesome5 name="file-alt" size={20} color={themeColors.text} style={styles.fileIcon} />
          <Text style={[styles.fileName, { color: themeColors.text }]}>{resumeFile.name}</Text>
          <TouchableOpacity onPress={onPreview} style={styles.actionBtn}>
            <FontAwesome5 name="eye" size={16} color={themeColors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDownload} style={styles.actionBtn}>
            <FontAwesome5 name="download" size={16} color={themeColors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={styles.actionBtn}>
            <FontAwesome5 name="trash" size={16} color={themeColors.error} />
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={[styles.noResume, { color: themeColors.textSecondary }]}>No resume uploaded</Text>
      )}
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
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  fileIcon: {
    marginRight: 8,
  },
  fileName: {
    fontSize: 16,
    flex: 1,
  },
  actionBtn: {
    marginLeft: 8,
  },
  noResume: {
    fontSize: 16,
    color: '#888',
    marginTop: 2,
  },
});
