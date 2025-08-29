const fs = require('fs');
const path = require('path');

// Read the 500.json file
const universitiesData = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/500.json'), 'utf8'));

// Function to generate university ID
function generateUniversityId(universityName) {
  return universityName
    .toLowerCase()
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/[()]/g, '') // Remove parentheses
    .replace(/[^a-z0-9_]/g, '_') // Replace other special characters with underscores
    .replace(/_+/g, '_') // Replace multiple underscores with single underscore
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
}

// Process first 100 universities
const first100Universities = universitiesData.slice(0, 100);

// Generate IDs for each university
const universitiesWithIds = first100Universities.map((university, index) => {
  const uid = generateUniversityId(university.name);
  return {
    ...university,
    uid: uid
  };
});

// Create output with just the mapping for verification
const idMapping = universitiesWithIds.map(uni => ({
  rank: uni.rank,
  name: uni.name,
  uid: uni.uid
}));

// Save the mapping to a file
fs.writeFileSync(
  path.join(__dirname, '../public/university-ids-mapping.json'),
  JSON.stringify(idMapping, null, 2)
);

// Save the updated university data
fs.writeFileSync(
  path.join(__dirname, '../public/universities-with-ids.json'),
  JSON.stringify(universitiesWithIds, null, 2)
);

console.log('Generated UIDs for first 100 universities:');
console.log('----------------------------------------');
idMapping.forEach(uni => {
  console.log(`${uni.rank}. ${uni.name} => ${uni.uid}`);
});

console.log('\nFiles created:');
console.log('- public/university-ids-mapping.json (ID mapping only)');
console.log('- public/universities-with-ids.json (Full data with UIDs)');