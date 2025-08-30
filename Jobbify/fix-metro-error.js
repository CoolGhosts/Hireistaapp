// This script patches Metro's symbolication process to prevent the "unknown" file errors
const fs = require('fs');
const path = require('path');

// Target file to patch
const targetFile = path.resolve(__dirname, 'node_modules/metro/src/Server.js');

// Read the file content
let content = fs.readFileSync(targetFile, 'utf8');

// Find the getCodeFrame function that causes the errors
const functionToReplace = `function getCodeFrame(filePath, frameNumber, column) {
  if (filePath == null) {
    return '';
  }

  const sourceCode = fs.readFileSync(filePath, 'utf8');
  return (0, _codeFrame().codeFrameColumns)(
    sourceCode,
    {
      start: {
        column,
        line: frameNumber,
      },
    },
    {
      forceColor: process.env.NODE_ENV !== 'test',
    },
  );
}`;

// Create a safer version that handles the 'unknown' file path
const replacementFunction = `function getCodeFrame(filePath, frameNumber, column) {
  if (filePath == null || filePath.includes('unknown') || !fs.existsSync(filePath)) {
    return '';
  }

  try {
    const sourceCode = fs.readFileSync(filePath, 'utf8');
    return (0, _codeFrame().codeFrameColumns)(
      sourceCode,
      {
        start: {
          column,
          line: frameNumber,
        },
      },
      {
        forceColor: process.env.NODE_ENV !== 'test',
      },
    );
  } catch (error) {
    console.log("Error reading source file:", error.message);
    return '';
  }
}`;

// Replace the function in the file content
const patchedContent = content.replace(functionToReplace, replacementFunction);

// Write the patched file back
fs.writeFileSync(targetFile, patchedContent, 'utf8');

console.log('✅ Metro Server.js successfully patched to handle unknown file errors!');
