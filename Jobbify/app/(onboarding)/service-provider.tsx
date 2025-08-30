import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Platform, Image } from 'react-native';
import { router } from 'expo-router';
import { useAppContext } from '@/context/AppContext';
import { LightTheme, DarkTheme } from '@/constants/Theme';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { supabase } from '@/lib/supabase';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

// Define the onboarding steps
type OnboardingStep = 'basic-info' | 'service-details' | 'service-area' | 'availability' | 'certification';

// Service categories
const SERVICE_CATEGORIES = [
  'Home Maintenance',
  'Cleaning',
  'Moving & Delivery',
  'Electrical',
  'Plumbing',
  'Landscaping',
  'Personal Assistant',
  'Tech Support',
  'Tutoring',
  'Pet Care',
  'Beauty & Wellness',
  'Other'
];

// Pricing models
type PricingModel = 'hourly' | 'fixed' | 'estimate';

export default function ServiceProviderOnboarding() {
  const { theme, user } = useAppContext();
  const themeColors = theme === 'light' ? LightTheme : DarkTheme;
  
  // State for current step
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('basic-info');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // State for form data
  const [basicInfo, setBasicInfo] = useState({
    name: '',
    phone: '',
    location: '',
    photoUrl: '',
    bio: '',
  });
  
  const [serviceDetails, setServiceDetails] = useState({
    categories: [] as string[],
    description: '',
    pricingModel: 'hourly' as PricingModel,
    hourlyRate: '',
    fixedPrice: '',
    estimateRange: { min: '', max: '' },
  });
  
  const [serviceArea, setServiceArea] = useState({
    radius: '10', // in miles
    centerLocation: '',
    coordinates: { latitude: 0, longitude: 0 },
  });
  
  const [availability, setAvailability] = useState({
    monday: { available: false, start: '09:00', end: '17:00' },
    tuesday: { available: false, start: '09:00', end: '17:00' },
    wednesday: { available: false, start: '09:00', end: '17:00' },
    thursday: { available: false, start: '09:00', end: '17:00' },
    friday: { available: false, start: '09:00', end: '17:00' },
    saturday: { available: false, start: '09:00', end: '17:00' },
    sunday: { available: false, start: '09:00', end: '17:00' },
  });
  
  const [certification, setCertification] = useState({
    hasCertification: false,
    certifications: [] as { id: string; name: string; issuer: string; date: string; fileUrl: string | null }[],
  });
  
  // Function to handle step navigation
  const goToNextStep = () => {
    switch (currentStep) {
      case 'basic-info':
        setCurrentStep('service-details');
        break;
      case 'service-details':
        setCurrentStep('service-area');
        break;
      case 'service-area':
        setCurrentStep('availability');
        break;
      case 'availability':
        setCurrentStep('certification');
        break;
      case 'certification':
        completeOnboarding();
        break;
    }
  };
  
  const goToPreviousStep = () => {
    switch (currentStep) {
      case 'service-details':
        setCurrentStep('basic-info');
        break;
      case 'service-area':
        setCurrentStep('service-details');
        break;
      case 'availability':
        setCurrentStep('service-area');
        break;
      case 'certification':
        setCurrentStep('availability');
        break;
    }
  };
  
  // Function to handle certification file upload
  const handleCertificationUpload = async (id: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        
        // Get the current user
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        
        if (!currentUser) {
          throw new Error('User not authenticated');
        }
        
        // Upload file to Supabase Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${currentUser.id}-${Date.now()}.${fileExt}`;
        const filePath = `certifications/${fileName}`;
        
        // Read the file as base64
        const fileContent = await FileSystem.readAsStringAsync(file.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('certifications')
          .upload(filePath, Buffer.from(fileContent, 'base64'), {
            contentType: file.mimeType || 'application/octet-stream',
          });
          
        if (uploadError) throw uploadError;
        
        // Get the public URL
        const { data: urlData } = supabase.storage
          .from('certifications')
          .getPublicUrl(filePath);
          
        // Update certification in state
        setCertification({
          ...certification,
          certifications: certification.certifications.map(cert => 
            cert.id === id ? { ...cert, fileUrl: urlData.publicUrl } : cert
          ),
        });
      }
    } catch (error) {
      console.error('Error picking document:', error);
    }
  };
  
  // Function to handle form submission
  const completeOnboarding = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Get the current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      
      // Update service_provider_profiles
      const { error: profileError } = await supabase
        .from('service_provider_profiles')
        .update({
          name: basicInfo.name,
          bio: basicInfo.bio,
          phone: basicInfo.phone,
          location: basicInfo.location,
          photo_url: basicInfo.photoUrl,
          service_categories: serviceDetails.categories,
          service_description: serviceDetails.description,
          pricing_model: serviceDetails.pricingModel,
          hourly_rate: serviceDetails.hourlyRate ? parseFloat(serviceDetails.hourlyRate) : null,
          fixed_price: serviceDetails.fixedPrice ? parseFloat(serviceDetails.fixedPrice) : null,
          estimate_min: serviceDetails.estimateRange.min ? parseFloat(serviceDetails.estimateRange.min) : null,
          estimate_max: serviceDetails.estimateRange.max ? parseFloat(serviceDetails.estimateRange.max) : null,
          service_area_radius: parseFloat(serviceArea.radius),
          service_area_center: serviceArea.centerLocation,
          availability: availability,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentUser.id);
        
      if (profileError) throw profileError;
      
      // Add certifications
      if (certification.hasCertification) {
        for (const cert of certification.certifications) {
          if (cert.name && cert.issuer) {
            const { error: certError } = await supabase
              .from('provider_certifications')
              .insert({
                user_id: currentUser.id,
                name: cert.name,
                issuer: cert.issuer,
                issue_date: cert.date,
                file_url: cert.fileUrl,
              });
              
            if (certError) throw certError;
          }
        }
      }
      
      // Navigate to home screen
      router.replace('/(tabs)/home');
      
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Helper function to toggle service category
  const toggleCategory = (category: string) => {
    if (serviceDetails.categories.includes(category)) {
      setServiceDetails({
        ...serviceDetails,
        categories: serviceDetails.categories.filter(c => c !== category)
      });
    } else {
      setServiceDetails({
        ...serviceDetails,
        categories: [...serviceDetails.categories, category]
      });
    }
  };
  
  // Helper function to toggle day availability
  const toggleDayAvailability = (day: keyof typeof availability) => {
    setAvailability({
      ...availability,
      [day]: {
        ...availability[day],
        available: !availability[day].available
      }
    });
  };
  
  // Helper function to update time
  const updateTime = (day: keyof typeof availability, field: 'start' | 'end', time: string) => {
    setAvailability({
      ...availability,
      [day]: {
        ...availability[day],
        [field]: time
      }
    });
  };
  
  // Helper function to add certification
  const addCertification = () => {
    setCertification({
      ...certification,
      hasCertification: true,
      certifications: [
        ...certification.certifications,
        { id: Date.now().toString(), name: '', issuer: '', date: '', fileUrl: null }
      ]
    });
  };
  
  // Helper function to update certification
  const updateCertification = (id: string, field: string, value: string) => {
    setCertification({
      ...certification,
      certifications: certification.certifications.map(cert => 
        cert.id === id ? { ...cert, [field]: value } : cert
      )
    });
  };
  
  // Helper function to remove certification
  const removeCertification = (id: string) => {
    setCertification({
      ...certification,
      certifications: certification.certifications.filter(cert => cert.id !== id)
    });
  };
  
  // Render the current step
  const renderStep = () => {
    switch (currentStep) {
      case 'basic-info':
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: themeColors.text }]}>Basic Information</Text>
            <Text style={[styles.stepDescription, { color: themeColors.textSecondary }]}>
              Let's start with some basic information about you.
            </Text>
            
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: themeColors.text }]}>Full Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: themeColors.backgroundSecondary, color: themeColors.text, borderColor: themeColors.border }]}
                placeholder="e.g. John Doe"
                placeholderTextColor={themeColors.textSecondary}
                value={basicInfo.name}
                onChangeText={(text) => setBasicInfo({ ...basicInfo, name: text })}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: themeColors.text }]}>Phone Number</Text>
              <TextInput
                style={[styles.input, { backgroundColor: themeColors.backgroundSecondary, color: themeColors.text, borderColor: themeColors.border }]}
                placeholder="e.g. +1 (555) 123-4567"
                placeholderTextColor={themeColors.textSecondary}
                keyboardType="phone-pad"
                value={basicInfo.phone}
                onChangeText={(text) => setBasicInfo({ ...basicInfo, phone: text })}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: themeColors.text }]}>Location</Text>
              <TextInput
                style={[styles.input, { backgroundColor: themeColors.backgroundSecondary, color: themeColors.text, borderColor: themeColors.border }]}
                placeholder="e.g. New York, NY"
                placeholderTextColor={themeColors.textSecondary}
                value={basicInfo.location}
                onChangeText={(text) => setBasicInfo({ ...basicInfo, location: text })}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: themeColors.text }]}>Bio</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: themeColors.backgroundSecondary, color: themeColors.text, borderColor: themeColors.border }]}
                placeholder="Tell clients about yourself and your experience"
                placeholderTextColor={themeColors.textSecondary}
                multiline
                numberOfLines={4}
                value={basicInfo.bio}
                onChangeText={(text) => setBasicInfo({ ...basicInfo, bio: text })}
              />
            </View>
          </View>
        );
        
      case 'service-details':
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: themeColors.text }]}>Service Details</Text>
            <Text style={[styles.stepDescription, { color: themeColors.textSecondary }]}>
              Tell us about the services you offer.
            </Text>
            
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: themeColors.text }]}>Service Categories</Text>
              <Text style={[styles.sublabel, { color: themeColors.textSecondary }]}>
                Select all that apply
              </Text>
              
              <View style={styles.categoriesContainer}>
                {SERVICE_CATEGORIES.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryButton,
                      serviceDetails.categories.includes(category) && styles.selectedCategoryButton,
                      serviceDetails.categories.includes(category) && { backgroundColor: themeColors.tint }
                    ]}
                    onPress={() => toggleCategory(category)}
                  >
                    <Text
                      style={[
                        styles.categoryButtonText,
                        serviceDetails.categories.includes(category) && styles.selectedCategoryButtonText,
                        { color: serviceDetails.categories.includes(category) ? '#fff' : themeColors.text }
                      ]}
                    >
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: themeColors.text }]}>Service Description</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: themeColors.backgroundSecondary, color: themeColors.text, borderColor: themeColors.border }]}
                placeholder="Describe the services you offer in detail"
                placeholderTextColor={themeColors.textSecondary}
                multiline
                numberOfLines={4}
                value={serviceDetails.description}
                onChangeText={(text) => setServiceDetails({ ...serviceDetails, description: text })}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: themeColors.text }]}>Pricing Model</Text>
              <View style={styles.pricingModelContainer}>
                {[
                  { id: 'hourly', label: 'Hourly Rate' },
                  { id: 'fixed', label: 'Fixed Price' },
                  { id: 'estimate', label: 'Estimate Range' }
                ].map((model) => (
                  <TouchableOpacity
                    key={model.id}
                    style={[
                      styles.pricingModelButton,
                      serviceDetails.pricingModel === model.id && styles.selectedPricingModelButton,
                      serviceDetails.pricingModel === model.id && { borderColor: themeColors.tint }
                    ]}
                    onPress={() => setServiceDetails({ ...serviceDetails, pricingModel: model.id as PricingModel })}
                  >
                    <View
                      style={[
                        styles.pricingModelRadio,
                        serviceDetails.pricingModel === model.id && styles.selectedPricingModelRadio,
                        serviceDetails.pricingModel === model.id && { borderColor: themeColors.tint }
                      ]}
                    >
                      {serviceDetails.pricingModel === model.id && (
                        <View
                          style={[
                            styles.pricingModelRadioInner,
                            { backgroundColor: themeColors.tint }
                          ]}
                        />
                      )}
                    </View>
                    <Text style={[styles.pricingModelLabel, { color: themeColors.text }]}>
                      {model.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {serviceDetails.pricingModel === 'hourly' && (
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: themeColors.text }]}>Hourly Rate (USD)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: themeColors.backgroundSecondary, color: themeColors.text, borderColor: themeColors.border }]}
                  placeholder="e.g. 25"
                  placeholderTextColor={themeColors.textSecondary}
                  keyboardType="numeric"
                  value={serviceDetails.hourlyRate}
                  onChangeText={(text) => setServiceDetails({ ...serviceDetails, hourlyRate: text })}
                />
              </View>
            )}
            
            {serviceDetails.pricingModel === 'fixed' && (
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: themeColors.text }]}>Fixed Price (USD)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: themeColors.backgroundSecondary, color: themeColors.text, borderColor: themeColors.border }]}
                  placeholder="e.g. 100"
                  placeholderTextColor={themeColors.textSecondary}
                  keyboardType="numeric"
                  value={serviceDetails.fixedPrice}
                  onChangeText={(text) => setServiceDetails({ ...serviceDetails, fixedPrice: text })}
                />
              </View>
            )}
            
            {serviceDetails.pricingModel === 'estimate' && (
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: themeColors.text }]}>Estimate Range (USD)</Text>
                <View style={styles.rowContainer}>
                  <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                    <TextInput
                      style={[styles.input, { backgroundColor: themeColors.backgroundSecondary, color: themeColors.text, borderColor: themeColors.border }]}
                      placeholder="Min"
                      placeholderTextColor={themeColors.textSecondary}
                      keyboardType="numeric"
                      value={serviceDetails.estimateRange.min}
                      onChangeText={(text) => setServiceDetails({
                        ...serviceDetails,
                        estimateRange: { ...serviceDetails.estimateRange, min: text }
                      })}
                    />
                  </View>
                  
                  <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                    <TextInput
                      style={[styles.input, { backgroundColor: themeColors.backgroundSecondary, color: themeColors.text, borderColor: themeColors.border }]}
                      placeholder="Max"
                      placeholderTextColor={themeColors.textSecondary}
                      keyboardType="numeric"
                      value={serviceDetails.estimateRange.max}
                      onChangeText={(text) => setServiceDetails({
                        ...serviceDetails,
                        estimateRange: { ...serviceDetails.estimateRange, max: text }
                      })}
                    />
                  </View>
                </View>
              </View>
            )}
          </View>
        );
        
      case 'service-area':
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: themeColors.text }]}>Service Area</Text>
            <Text style={[styles.stepDescription, { color: themeColors.textSecondary }]}>
              Define the area where you provide your services.
            </Text>
            
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: themeColors.text }]}>Center Location</Text>
              <TextInput
                style={[styles.input, { backgroundColor: themeColors.backgroundSecondary, color: themeColors.text, borderColor: themeColors.border }]}
                placeholder="e.g. New York, NY"
                placeholderTextColor={themeColors.textSecondary}
                value={serviceArea.centerLocation}
                onChangeText={(text) => setServiceArea({ ...serviceArea, centerLocation: text })}
              />
              <Text style={[styles.helperText, { color: themeColors.textSecondary }]}>
                This is the central point of your service area
              </Text>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: themeColors.text }]}>Service Radius (miles)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: themeColors.backgroundSecondary, color: themeColors.text, borderColor: themeColors.border }]}
                placeholder="e.g. 10"
                placeholderTextColor={themeColors.textSecondary}
                keyboardType="numeric"
                value={serviceArea.radius}
                onChangeText={(text) => setServiceArea({ ...serviceArea, radius: text })}
              />
            </View>
            
            <View style={[styles.mapPlaceholder, { backgroundColor: themeColors.backgroundSecondary }]}>
              <FontAwesome name="map-marker" size={40} color={themeColors.tint} />
              <Text style={[styles.mapPlaceholderText, { color: themeColors.text }]}>
                Map will be displayed here
              </Text>
              <Text style={[styles.mapPlaceholderSubtext, { color: themeColors.textSecondary }]}>
                In the actual app, a map would be displayed here to visually define your service area
              </Text>
            </View>
          </View>
        );
        
      case 'availability':
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: themeColors.text }]}>Availability</Text>
            <Text style={[styles.stepDescription, { color: themeColors.textSecondary }]}>
              Set your availability for providing services.
            </Text>
            
            {Object.entries(availability).map(([day, { available, start, end }]) => (
              <View key={day} style={styles.availabilityContainer}>
                <View style={styles.dayContainer}>
                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => toggleDayAvailability(day as keyof typeof availability)}
                  >
                    {available && (
                      <FontAwesome name="check" size={16} color={themeColors.tint} />
                    )}
                  </TouchableOpacity>
                  <Text style={[styles.dayLabel, { color: themeColors.text }]}>
                    {day.charAt(0).toUpperCase() + day.slice(1)}
                  </Text>
                </View>
                
                {available && (
                  <View style={styles.timeContainer}>
                    <View style={styles.timeInputContainer}>
                      <Text style={[styles.timeLabel, { color: themeColors.textSecondary }]}>From</Text>
                      <TextInput
                        style={[styles.timeInput, { backgroundColor: themeColors.backgroundSecondary, color: themeColors.text, borderColor: themeColors.border }]}
                        placeholder="09:00"
                        placeholderTextColor={themeColors.textSecondary}
                        value={start}
                        onChangeText={(text) => updateTime(day as keyof typeof availability, 'start', text)}
                      />
                    </View>
                    
                    <View style={styles.timeInputContainer}>
                      <Text style={[styles.timeLabel, { color: themeColors.textSecondary }]}>To</Text>
                      <TextInput
                        style={[styles.timeInput, { backgroundColor: themeColors.backgroundSecondary, color: themeColors.text, borderColor: themeColors.border }]}
                        placeholder="17:00"
                        placeholderTextColor={themeColors.textSecondary}
                        value={end}
                        onChangeText={(text) => updateTime(day as keyof typeof availability, 'end', text)}
                      />
                    </View>
                  </View>
                )}
              </View>
            ))}
            
            <Text style={[styles.helperText, { color: themeColors.textSecondary, marginTop: 16 }]}>
              Note: You can always update your availability later in your profile settings.
            </Text>
          </View>
        );
        
      case 'certification':
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: themeColors.text }]}>Certifications & Licenses</Text>
            <Text style={[styles.stepDescription, { color: themeColors.textSecondary }]}>
              Add any relevant certifications or licenses to build trust with clients.
            </Text>
            
            <View style={styles.checkboxContainer}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => setCertification({ ...certification, hasCertification: !certification.hasCertification })}
              >
                {certification.hasCertification && (
                  <FontAwesome name="check" size={16} color={themeColors.tint} />
                )}
              </TouchableOpacity>
              <Text style={[styles.checkboxLabel, { color: themeColors.text }]}>
                I have certifications or licenses to add
              </Text>
            </View>
            
            {certification.hasCertification && (
              <>
                {certification.certifications.map((cert, index) => (
                  <View key={cert.id} style={[styles.certificationContainer, { backgroundColor: themeColors.backgroundSecondary }]}>
                    <View style={styles.certificationHeader}>
                      <Text style={[styles.certificationTitle, { color: themeColors.text }]}>
                        Certification {index + 1}
                      </Text>
                      <TouchableOpacity
                        style={styles.removeCertificationButton}
                        onPress={() => removeCertification(cert.id)}
                      >
                        <FontAwesome name="times" size={20} color={themeColors.error} />
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.formGroup}>
                      <Text style={[styles.label, { color: themeColors.text }]}>Certification Name</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: themeColors.card, color: themeColors.text, borderColor: themeColors.border }]}
                        placeholder="e.g. Certified Plumber"
                        placeholderTextColor={themeColors.textSecondary}
                        value={cert.name}
                        onChangeText={(text) => updateCertification(cert.id, 'name', text)}
                      />
                    </View>
                    
                    <View style={styles.formGroup}>
                      <Text style={[styles.label, { color: themeColors.text }]}>Issuing Organization</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: themeColors.card, color: themeColors.text, borderColor: themeColors.border }]}
                        placeholder="e.g. National Plumbing Association"
                        placeholderTextColor={themeColors.textSecondary}
                        value={cert.issuer}
                        onChangeText={(text) => updateCertification(cert.id, 'issuer', text)}
                      />
                    </View>
                    
                    <View style={styles.formGroup}>
                      <Text style={[styles.label, { color: themeColors.text }]}>Issue Date</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: themeColors.card, color: themeColors.text, borderColor: themeColors.border }]}
                        placeholder="MM/YYYY"
                        placeholderTextColor={themeColors.textSecondary}
                        value={cert.date}
                        onChangeText={(text) => updateCertification(cert.id, 'date', text)}
                      />
                    </View>
                    
                    <View style={styles.formGroup}>
                      <Text style={[styles.label, { color: themeColors.text }]}>Upload Certificate</Text>
                      {cert.fileUrl ? (
                        <View style={styles.fileContainer}>
                          <FontAwesome name="file-pdf-o" size={24} color={themeColors.tint} style={styles.fileIcon} />
                          <Text style={[styles.fileName, { color: themeColors.text }]}>
                            Certificate uploaded
                          </Text>
                          <TouchableOpacity
                            style={styles.replaceFileButton}
                            onPress={() => handleCertificationUpload(cert.id)}
                          >
                            <Text style={[styles.replaceFileButtonText, { color: themeColors.tint }]}>
                              Replace
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[styles.uploadButton, { borderColor: themeColors.border }]}
                          onPress={() => handleCertificationUpload(cert.id)}
                        >
                          <FontAwesome name="upload" size={20} color={themeColors.tint} style={styles.uploadButtonIcon} />
                          <Text style={[styles.uploadButtonText, { color: themeColors.text }]}>
                            Upload Certificate
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
                
                <TouchableOpacity
                  style={[styles.addButton, { borderColor: themeColors.tint }]}
                  onPress={addCertification}
                >
                  <FontAwesome name="plus" size={16} color={themeColors.tint} style={styles.addButtonIcon} />
                  <Text style={[styles.addButtonText, { color: themeColors.tint }]}>
                    Add Another Certification
                  </Text>
                </TouchableOpacity>
              </>
            )}
            
            <Text style={[styles.helperText, { color: themeColors.textSecondary, marginTop: 16 }]}>
              Note: Adding certifications can help you build trust with clients and may increase your chances of getting hired.
            </Text>
          </View>
        );
    }
  };
  
  return (
    <ScrollView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>Complete Your Profile</Text>
        <Text style={[styles.headerSubtitle, { color: themeColors.textSecondary }]}>
          Step {['basic-info', 'service-details', 'service-area', 'availability', 'certification'].indexOf(currentStep) + 1} of 5
        </Text>
      </View>
      
      {renderStep()}
      
      {error ? <Text style={styles.error}>{error}</Text> : null}
      
      <View style={styles.buttonContainer}>
        {currentStep !== 'basic-info' && (
          <TouchableOpacity
            style={[styles.backButton, { borderColor: themeColors.border }]}
            onPress={goToPreviousStep}
            disabled={loading}
          >
            <Text style={[styles.backButtonText, { color: themeColors.text }]}>Back</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[styles.nextButton, { backgroundColor: themeColors.tint }]}
          onPress={goToNextStep}
          disabled={loading}
        >
          <Text style={styles.nextButtonText}>
            {currentStep === 'certification' ? (loading ? 'Completing...' : 'Complete') : (loading ? 'Saving...' : 'Next')}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 40,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
  },
  stepContainer: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  sublabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 4,
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxLabel: {
    fontSize: 16,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  categoryButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    margin: 4,
  },
  selectedCategoryButton: {
    borderColor: 'transparent',
  },
  categoryButtonText: {
    fontSize: 14,
  },
  selectedCategoryButtonText: {
    fontWeight: 'bold',
  },
  pricingModelContainer: {
    marginTop: 8,
  },
  pricingModelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  selectedPricingModelButton: {
    borderWidth: 2,
  },
  pricingModelRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedPricingModelRadio: {
    borderWidth: 2,
  },
  pricingModelRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  pricingModelLabel: {
    fontSize: 16,
  },
  mapPlaceholder: {
    height: 200,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  mapPlaceholderText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 8,
  },
  mapPlaceholderSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  availabilityContainer: {
    marginBottom: 16,
  },
  dayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  timeContainer: {
    flexDirection: 'row',
    marginLeft: 32,
  },
  timeInputContainer: {
    flex: 1,
    marginRight: 8,
  },
  timeLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  timeInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
  },
  certificationContainer: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  certificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  certificationTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  removeCertificationButton: {
    padding: 4,
  },
  fileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
  },
  fileIcon: {
    marginRight: 12,
  },
  fileName: {
    flex: 1,
    fontSize: 14,
  },
  replaceFileButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  replaceFileButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    borderStyle: 'dashed',
  },
  uploadButtonIcon: {
    marginRight: 8,
  },
  uploadButtonText: {
    fontSize: 14,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  addButtonIcon: {
    marginRight: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 40,
  },
  backButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginRight: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  nextButton: {
    flex: 2,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  error: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
});