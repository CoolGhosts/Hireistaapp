import axios from 'axios';
import * as FileSystem from 'expo-file-system';

const PDFCO_API_KEY = 'YOUR_PDFCO_API_KEY'; // Replace with your actual PDF.co API key

// Create an axios instance with increased timeout
const api = axios.create({
  timeout: 60000, // 60 seconds timeout
});

// The base URL for the API
const API_BASE_URL = 'http://10.0.0.181:5000';

// Simple function to test API connectivity
export async function testApiConnection(): Promise<boolean> {
  try {
    console.log('Testing API connection to:', `${API_BASE_URL}/health`);
    const response = await api.get(`${API_BASE_URL}/health`);
    console.log('API health check response:', response.data);
    return response.data.status === 'ok';
  } catch (error) {
    console.error('API connection test failed:', error);
    return false;
  }
}

export async function extractTextFromFile(file: { uri: string; name: string; mimeType: string }): Promise<string> {
  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    type: file.mimeType,
    name: file.name,
  } as any);

  try {
    console.log('Extracting text from file:', file.name);
    console.log(`Sending request to: ${API_BASE_URL}/extract-text`);
    
    // Use your local IP address
    const response = await api.post(`${API_BASE_URL}/extract-text`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    console.log('Extract text response received');
    
    if (response.data.text) {
      return response.data.text;
    } else {
      throw new Error('Text extraction failed');
    }
  } catch (error) {
    console.error('Error in extractTextFromFile:', error);
    throw error;
  }
}

// Analyze resume using backend Gemini endpoint
export async function analyzeResumeWithGemini(resumeText: string): Promise<any> {
  try {
    console.log('Analyzing resume with Gemini');
    console.log(`Sending request to: ${API_BASE_URL}/analyze-resume`);
    
    const response = await api.post(`${API_BASE_URL}/analyze-resume`, { resume_text: resumeText });
    
    console.log('Analyze resume response received');
    return response.data.result;
  } catch (error) {
    console.error('Error in analyzeResumeWithGemini:', error);
    throw error;
  }
}
