import { Router, Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler";

const router: Router = Router();

// POST /api/decipher - Decode a secret code
router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const { code } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({ error: "Code is required" });
    }

    // Decode base64
    let decoded: string;
    try {
      decoded = Buffer.from(code.trim(), "base64").toString("utf-8");
    } catch (decodeError) {
      return res.status(400).json({ error: "Invalid code - unable to decode" });
    }

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
  }),
);

export default router;
