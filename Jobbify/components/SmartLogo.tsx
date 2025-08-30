import React from 'react';
import { Image } from 'react-native';

const failedLogosCache = new Set<string>();

export function getCompanyLogoUrl(company: string, size: number = 512) {
  const cleanCompanyName = company
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');
  return `https://logo.clearbit.com/${cleanCompanyName}.com?size=${size}&format=png&greyscale=false`;
}

export const SmartLogo: React.FC<{
  company: string;
  logoUrl: string;
  style: any;
  resizeMode?: 'contain' | 'cover' | 'stretch' | 'center';
}> = React.memo(({ company, logoUrl, style, resizeMode = 'contain' }) => {
  // Safety check for undefined/null company prop
  const safeCompanyProp = company || 'Unknown Company';
  const generateFallbackLogo = (comp: string) => {
    // Safety check for undefined/null company name
    const safeCompany = comp || 'Unknown Company';
    const initials = safeCompany
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);

    const colors = ['FF6B6B', '4ECDC4', '45B7D1', '96CEB4', 'FFEAA7', 'DDA0DD', '98D8C8', 'F7DC6F'];
    const colorIndex = safeCompany.length % colors.length;
    const backgroundColor = colors[colorIndex];
    return `https://ui-avatars.com/api/?name=${initials}&background=${backgroundColor}&color=fff&size=512&bold=true&font-size=0.4&rounded=true&format=png`;
  };

  const isKnownFailure = failedLogosCache.has(logoUrl);
  const initialUrl = isKnownFailure ? generateFallbackLogo(safeCompanyProp) : logoUrl;

  const [currentUrl, setCurrentUrl] = React.useState(initialUrl);
  const [hasError, setHasError] = React.useState(isKnownFailure);

  React.useEffect(() => {
    const isFailure = failedLogosCache.has(logoUrl);
    const newUrl = isFailure ? generateFallbackLogo(safeCompanyProp) : logoUrl;
    setCurrentUrl(newUrl);
    setHasError(isFailure);
  }, [logoUrl, safeCompanyProp]);

  const handleError = React.useCallback(() => {
    if (!hasError && !failedLogosCache.has(logoUrl)) {
      setHasError(true);
      const fallback = generateFallbackLogo(safeCompanyProp);
      setCurrentUrl(fallback);
      failedLogosCache.add(logoUrl);
    }
  }, [hasError, logoUrl, safeCompanyProp]);

  return (
    <Image
      source={{ uri: currentUrl }}
      style={[style, { backgroundColor: 'transparent' }]}
      resizeMode={resizeMode}
      onError={handleError}
      fadeDuration={200}
      loadingIndicatorSource={undefined}
      progressiveRenderingEnabled={true}
      cache="force-cache"
    />
  );
});
