#!/bin/bash

# Script to exclude problematic modules from the build process
echo "Removing problematic Gradle files..."

# Remove expo-app-auth gradle files
find ./node_modules/expo-app-auth -type f -name "*.gradle" -delete

# Remove expo-app-auth from settings.gradle if it exists
if [ -f ./android/settings.gradle ]; then
  sed -i '/expo-app-auth/d' ./android/settings.gradle
fi

echo "Done! Problematic modules excluded."
