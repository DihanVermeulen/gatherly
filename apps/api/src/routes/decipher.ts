import { Router, Request, Response } from "express";

const router: Router = Router();

// POST /api/decipher - Decode a secret code
router.post("/", async (req: Request, res: Response) => {
  try {
    const { code } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({ error: "Code is required" });
    }

    try {
      // Decode base64
      const decoded = Buffer.from(code.trim(), "base64").toString("utf-8");

      // Parse format: "person:receiver1,receiver2,..."
      const [person, receiversStr] = decoded.split(":");

      if (!person || !receiversStr) {
        return res.status(400).json({ error: "Invalid code format" });
      }

      const receivers = receiversStr.split(",").filter((r) => r.trim());

      if (receivers.length === 0) {
        return res.status(400).json({ error: "Invalid code format" });
      }

      res.json({
        person,
        receivers,
      });
    } catch (decodeError) {
      return res.status(400).json({ error: "Invalid code - unable to decode" });
    }
  } catch (error) {
    console.error("Error deciphering code:", error);
    res.status(500).json({ error: "Failed to decipher code" });
  }
});

export default router;
