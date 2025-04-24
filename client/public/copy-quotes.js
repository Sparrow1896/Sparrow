// Script to copy quotes.json from finalapp to public folder
const fs = require('fs');
const path = require('path');

const sourcePath = path.join(__dirname, '..', '..', 'finalapp', 'quotes.json');
const destPath = path.join(__dirname, 'quotes.json');

try {
  // Read the source file
  const quotesData = fs.readFileSync(sourcePath, 'utf8');
  
  // Write to destination
  fs.writeFileSync(destPath, quotesData, 'utf8');
  
  console.log('✅ Successfully copied quotes.json to public folder');
  console.log(`Source: ${sourcePath}`);
  console.log(`Destination: ${destPath}`);
} catch (error) {
  console.error('❌ Error copying quotes.json file:', error.message);
}