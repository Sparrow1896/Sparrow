// Script to copy quotes.json from MongoDB to public folder
const fs = require('fs');
const path = require('path');

// The correct path should point to the quotes.json in the project root or finalapp directory
// Based on server.js, it looks for quotes in finalapp/quotes.json
const sourcePath = path.join(__dirname, '..', '..', 'finalapp', 'quotes.json');
const destPath = path.join(__dirname, 'quotes.json');

try {
  // Check if source file exists
  if (!fs.existsSync(sourcePath)) {
    console.error(`❌ Source file not found: ${sourcePath}`);
    console.log('Creating an empty quotes.json file in the public folder...');
    fs.writeFileSync(destPath, '[]', 'utf8');
    console.log(`✅ Created empty quotes.json file at: ${destPath}`);
  } else {
    // Read the source file
    const quotesData = fs.readFileSync(sourcePath, 'utf8');
    
    // Write to destination
    fs.writeFileSync(destPath, quotesData, 'utf8');
    
    console.log('✅ Successfully copied quotes.json to public folder');
    console.log(`Source: ${sourcePath}`);
    console.log(`Destination: ${destPath}`);
  }
} catch (error) {
  console.error('❌ Error copying quotes.json file:', error.message);
}