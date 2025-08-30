import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { useAppContext } from '@/context/AppContext';
import { LightTheme, DarkTheme } from '@/constants/Theme';
import { FontAwesome } from '@expo/vector-icons';

interface PDFViewerProps {
  uri: string;
  onClose?: () => void;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({ uri, onClose }) => {
  const { theme } = useAppContext();
  const themeColors = theme === 'light' ? LightTheme : DarkTheme;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const windowWidth = Dimensions.get('window').width;
  const windowHeight = Dimensions.get('window').height - 100;

  // Add appropriate PDF viewing source based on the URI
  const getWebViewSource = () => {
    // If the URI is already a Google PDF viewer URL, use it directly
    if (uri.includes('docs.google.com/viewer')) {
      return { uri };
    }
    
    // Otherwise, embed in Google PDF viewer
    const googleViewerPrefix = 'https://docs.google.com/viewer?embedded=true&url=';
    return { uri: `${googleViewerPrefix}${encodeURIComponent(uri)}` };
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: themeColors.text }]}>Resume Preview</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <FontAwesome name="close" size={24} color={themeColors.text} />
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: themeColors.error }]}>
            Error loading PDF: {error}
          </Text>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: themeColors.primary }]}
            onPress={() => {
              setError(null);
              setLoading(true);
            }}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={themeColors.primary} />
              <Text style={[styles.loadingText, { color: themeColors.text }]}>
                Loading PDF...
              </Text>
            </View>
          )}

          <WebView
            source={getWebViewSource()}
            style={styles.webView}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onError={(e) => {
              console.error('WebView error:', e.nativeEvent);
              setError('Failed to load PDF. Please try again.');
              setLoading(false);
            }}
            startInLoadingState={true}
            // Remove the renderLoading prop and use our custom loading indicator above
          />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  webView: {
    flex: 1,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default PDFViewer;