import fs from 'fs/promises';
import path from 'path';

// Local Fallback JSON schema
interface LocalDatabase {
  donors: any[];
  requests: any[];
}

const LOCAL_DB_PATH = path.join(process.cwd(), 'local_database.json');

class DatabaseEngine {
  constructor() {
    this.initLocalDb().then(() => this.seedFromLocalFile());
  }

  private normalizeBloodGroup(bg: string): string {
    if (!bg) return 'O+';
    let normalized = bg.trim().toLowerCase();
    normalized = normalized.replace('positive', '+').replace('pos', '+');
    normalized = normalized.replace('negative', '-').replace('neg', '-');
    normalized = normalized.replace(/\s+/g, '');
    return normalized.toUpperCase();
  }

  private async seedFromLocalFile() {
    const csvPath = path.join(process.cwd(), 'Dataset.csv');
    try {
      await fs.access(csvPath);
    } catch {
      return;
    }

    try {
      const content = await fs.readFile(csvPath, 'utf-8');
      const lines = content.split(/\r?\n/);
      if (lines.length <= 1) return;

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const cols = lines[i].split(',').map(c => c.trim());
        const rowData: any = {};
        
        headers.forEach((h, idx) => {
          rowData[h] = cols[idx];
        });

        const fullName = rowData.fullname || rowData.full_name || rowData.name || rowData.user_id || 'Unknown';
        const contactNumber = rowData.contactnumber || rowData.contact_number || rowData.phone || null;
        const age = parseInt(rowData.age) || null;
        const rawBg = rowData.bloodgroup || rowData.blood_group || rowData.bg;
        const bloodGroup = this.normalizeBloodGroup(rawBg);
        
        const lat = parseFloat(rowData.latitude) || (40.7128 + (Math.random() - 0.5) * 0.1);
        const lng = parseFloat(rowData.longitude) || (-74.0060 + (Math.random() - 0.5) * 0.1);

        const db = await this.getLocalDb();
        const existingDonors = db.donors;
        const isDuplicate = existingDonors.some(d => 
          (d.fullName && d.fullName.toLowerCase() === fullName.toLowerCase()) || 
          (contactNumber && d.contactNumber === contactNumber) ||
          (rowData.email && d.email === rowData.email)
        );

        if (!isDuplicate) {
          db.donors.push({
            user_id: rowData.user_id || ('D-' + Math.random().toString(36).substring(2, 6).toUpperCase()),
            fullName,
            email: rowData.email || null,
            bloodGroup,
            age,
            contactNumber,
            latitude: lat,
            longitude: lng,
            role: 'Bridge Donor',
            role_status: true,
            donations_till_date: 0,
            last_contacted_date: new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString(),
            next_eligible_date: new Date().toISOString()
          });
          await this.saveLocalDb(db);
        }
      }
    } catch (e) {
      console.error('[Database Bootstrapper] Failed to ingest baseline data:', e);
    }
  }

  private async initLocalDb() {
    try {
      await fs.access(LOCAL_DB_PATH);
    } catch {
      await fs.writeFile(LOCAL_DB_PATH, JSON.stringify({ donors: [], requests: [] }, null, 2));
    }
  }

  private async getLocalDb(): Promise<LocalDatabase> {
    try {
      const data = await fs.readFile(LOCAL_DB_PATH, 'utf-8');
      return JSON.parse(data);
    } catch {
      return { donors: [], requests: [] };
    }
  }

  private async saveLocalDb(db: LocalDatabase) {
    await fs.writeFile(LOCAL_DB_PATH, JSON.stringify(db, null, 2));
  }

  async addDonor(donor: any) {
    const db = await this.getLocalDb();
    if (!db.donors.find(d => d.user_id === donor.user_id)) {
      db.donors.push({
        user_id: donor.user_id,
        full_name: donor.fullName,
        email: donor.email || null,
        blood_group: donor.bloodGroup || 'O+',
        age: donor.age || null,
        contact_number: donor.contactNumber || null,
        latitude: donor.latitude || 40.71,
        longitude: donor.longitude || -74.00,
        role: 'Bridge Donor',
        role_status: true,
        donations_till_date: 0,
        last_contacted_date: new Date().toISOString(),
        next_eligible_date: new Date().toISOString()
      });
      await this.saveLocalDb(db);
    }
    return donor;
  }

  async getDonors() {
    const db = await this.getLocalDb();
    return db.donors.map(d => ({
      ...d,
      contactNumber: d.contact_number,
      fullName: d.full_name,
      bloodGroup: d.blood_group
    }));
  }

  async addRequest(req: any) {
    const db = await this.getLocalDb();
    db.requests.unshift({
      id: req.id,
      full_name: req.fullName || 'Anonymous Patient',
      blood_group: req.bloodGroup || 'O+',
      required_units: req.requiredUnits || 1,
      urgency: req.urgency || 'Urgent',
      status: req.status || 'PENDING',
      timestamp: new Date().toISOString()
    });
    await this.saveLocalDb(db);
    return req;
  }

  async getRequests() {
    const db = await this.getLocalDb();
    return db.requests.map(r => ({
      ...r,
      fullName: r.full_name,
      bloodGroup: r.blood_group,
      requiredUnits: r.required_units
    }));
  }

  async updateRequestStatus(id: string, status: string) {
    const db = await this.getLocalDb();
    const req = db.requests.find(r => r.id === id);
    if (req) {
      req.status = status;
      await this.saveLocalDb(db);
    }
  }

  async deleteRequest(id: string) {
    const db = await this.getLocalDb();
    db.requests = db.requests.filter(r => r.id !== id);
    await this.saveLocalDb(db);
  }

  async deleteDonor(id: string) {
    const db = await this.getLocalDb();
    db.donors = db.donors.filter(d => d.user_id !== id && d.id !== id);
    await this.saveLocalDb(db);
  }
}

export const dbManager = new DatabaseEngine();
