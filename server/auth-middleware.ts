import jwt from "jsonwebtoken";
import { storage } from "./storage";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Middleware to verify JWT token for Express routes
export const verifyToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await storage.getUser(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ message: "Invalid token" });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ 
        message: "Account is deactivated. Please contact support for assistance.",
        code: "ACCOUNT_DEACTIVATED"
      });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ message: "Invalid token" });
  }
};

// Function to verify JWT token for WebSocket connections
export const verifyTokenForWebSocket = async (token: string) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Check if user is active
    const user = await storage.getUser(decoded.userId);
    if (!user) {
      throw new Error("Invalid or deactivated account");
    }

    if (!user.isActive) {
      console.log("Account is deactivated:" + user.firstName + " " + user.lastName + " " + user.email);
      throw new Error("Account is deactivated. Please contact support for assistance.");
    }

    return decoded;
  } catch (error) {
    throw new Error("Invalid token");
  }
};
