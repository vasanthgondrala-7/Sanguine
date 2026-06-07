import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { matchDonors, NetworkStateOverrides, parseDataset, addDonorRecord, addPendingRequest, getPendingRequests, updateRequestStatus, deletePendingRequest, deleteDonorRecord } from './src/backend/matching_engine';
import { AgentOrchestrator } from './src/backend/agent_logic';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  app.use(express.json());

  // ==========================================
  // RBAC Middleware
  // ==========================================
  const requirePrivilegedRole = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const role = req.headers['x-user-role'];
    if (role === 'System Admin' || role === 'Hospital Coordinator' || role === 'NGO Partner') {
      next();
    } else {
      res.status(403).json({ error: "Access denied. Insufficient role permissions." });
    }
  };

  // ==========================================
  // ROUTE 1: THE MATHEMATICAL MATCHING ENGINE
  // ==========================================
  app.post('/api/v1/requests/match', requirePrivilegedRole, async (req, res) => {
    try {
      const { raw_request_text, blood_group, urgency } = req.body;
      
      // Step 1: Agent intercepts unstructured doctor inputs
      const requestData = await AgentOrchestrator.intakeAgent(
        raw_request_text || "Patient crashing. We need 2 units of O- blood immediately."
      );
      
      // Step 2: Math engine executes algorithm against 'Dataset.csv' (Now live Postgres)
      const optimalDonors = await matchDonors(
        requestData.hospital_lat, 
        requestData.hospital_lon, 
        blood_group || requestData.blood_group
      );
      
      // Step 3: Outreach agent creates psychological prompts for top matches
      const outreachPayloads = await Promise.all(
        optimalDonors.map(donor => AgentOrchestrator.outreachAgent(donor.user_id, { ...requestData, urgency, blood_group: blood_group || requestData.blood_group }))
      );

      res.status(200).json({
        status: "success",
        data: {
          extracted_intent: requestData,
          optimal_donors_ranked: optimalDonors,
          outreach_payloads: outreachPayloads
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: String(error) });
    }
  });

  // ==========================================
  // ROUTE 2: FAILURE LEARNING & TELEMETRY LOOP
  // ==========================================
  app.post('/api/v1/telemetry/outreach-callback', async (req, res) => {
    try {
      // Simulating a webhook from Twilio/AWS SNS tracking donor replies
      const { user_id, status } = req.body; 
      
      // If the donor did not reply in time, or explicitly declined
      if (status === 'TIMEOUT' || status === 'DECLINED') {
        const now = new Date();
        
        // Innovation feature: The cooling block penalization mechanism
        const blockDurationDays = 14; 
        const coolingBlockEnd = new Date(now.getTime() + (blockDurationDays * 24 * 60 * 60 * 1000));
        
        // Fetch current memory
        const existingPenalty = NetworkStateOverrides[user_id]?.penalty || 0;
        
        // Implement the algorithmic penalty (+15% score reduction for future runs)
        NetworkStateOverrides[user_id] = {
          cooling_block_until: coolingBlockEnd,
          penalty: existingPenalty + 0.15 
        };
        
        console.warn(`[Failure Learning Loop] Activated for ${user_id}. State: ${status}`);
        
        return res.status(200).json({
          status: "failure_learning_applied",
          adaptation_protocol: {
            target_node: user_id,
            cooling_block_until: coolingBlockEnd.toISOString(),
            new_penalty_value: existingPenalty + 0.15,
            message: "System self-adapted. Pipeline stagnation averted."
          }
        });
      }

      // If accepted, reset bounds (mock)
      res.status(200).json({ status: "acknowledged", state: "NOMINAL" });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // ==========================================
  // ROUTE 3: ORCHESTRATOR CHAT ASSISTANT
  // ==========================================
  app.post('/api/v1/chat', async (req, res) => {
    try {
      const { message, context } = req.body;
      
      let replyText = "";
      if (process.env.GEMINI_API_KEY) {
        // Use real Gemini if key exists
        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: `You are the Sanguine Core AI Orchestrator Assistant. Keep answers brief and technical. Context: ${JSON.stringify(context)}. User says: ${message}`,
        });
        replyText = response.text || "No response generated.";
      } else {
        // Mock fallback if user hasn't provided key
        replyText = `[Mock Agent Response]\nAcknowledged input: "${message}".\n(Set GEMINI_API_KEY in your environment to enable live AI responses.)`;
      }
      
      res.status(200).json({ status: "success", reply: replyText });
    } catch (error) {
      console.error("Chat api error:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // ==========================================
  // ROUTE 4: PROFILE ENDPOINTS FOR TENANTS
  // ==========================================
  app.post('/api/v1/auth/me', async (req, res) => {
    try {
      const { email, tenant } = req.body;
      const donors = await parseDataset();
      if (!donors || donors.length === 0) {
        return res.status(404).json({ error: "Dataset empty" });
      }

      // Hash email to consistently pick a donor/patient record if not strictly matching
      let hash = 0;
      for (let i = 0; i < (email || '').length; i++) {
        hash = ((hash << 5) - hash) + (email || '').charCodeAt(i);
        hash |= 0;
      }
      const idx = Math.abs(hash) % donors.length;
      const userRecord = donors[idx];
      
      const hexUserId = Buffer.from(userRecord.user_id).toString('hex').toUpperCase();

      res.status(200).json({ status: "success", data: {
        ...userRecord,
        hexUserId
      } });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: String(e) });
    }
  });

  // ==========================================
  // VITE UI MIDDLEWARE (DASHBOARD)
  // ==========================================
  
  // ==========================================
  // ROUTE 5: STATE BRIDGE (DONORS & REQUESTS)
  // ==========================================
  app.post('/api/v1/auth/register-donor', async (req, res) => {
    try {
      await addDonorRecord(req.body);
      res.status(200).json({ status: "success" });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.get('/api/v1/donors', requirePrivilegedRole, async (req, res) => {
    try {
      const data = await parseDataset();
      res.status(200).json({ status: "success", data });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.get('/api/v1/requests', requirePrivilegedRole, async (req, res) => {
    try {
      const data = await getPendingRequests();
      res.status(200).json({ status: "success", data });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.post('/api/v1/requests', async (req, res) => {
    try {
      const newReq = await addPendingRequest(req.body);
      res.status(200).json({ status: "success", data: newReq });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.post('/api/v1/requests/delete', requirePrivilegedRole, async (req, res) => {
    try {
      await deletePendingRequest(req.body.id);
      res.status(200).json({ status: "success" });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.post('/api/v1/requests/update', requirePrivilegedRole, async (req, res) => {
    try {
      await updateRequestStatus(req.body.id, req.body.status);
      res.status(200).json({ status: "success" });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.post('/api/v1/donors/delete', requirePrivilegedRole, async (req, res) => {
    try {
      await deleteDonorRecord(req.body.id);
      res.status(200).json({ status: "success" });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // ==========================================
  // VITE UI MIDDLEWARE (DASHBOARD)
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Sanguine Core] Server actively listening on 0.0.0.0:${PORT}`);
  });
}

startServer();
