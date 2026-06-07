import fs from 'fs';
import path from 'path';
import { parseDataset, matchDonors } from './src/backend/matching_engine';

const filePath = path.join(process.cwd(), 'Dataset.csv');
console.log("Looking for:", filePath);
console.log("Exists?", fs.existsSync(filePath));

async function run() {
  const dataset = await parseDataset();
  console.log("All donors size:", dataset.length);
  const matched = await matchDonors(37.7749, -122.4194, 'O-');
  console.log("Matched O-:", matched);
}
run();
