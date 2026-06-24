import express from "express";
import cors from "cors";
import { config } from "dotenv";
import { registerRoutes } from "./routes";
import { wsServer } from "./websocket-server";

const app = express();
const PORT = process.env.PORT || 3000;

// Load environment variables
config();

// Force UTC timezone for consistent timestamps across all environments
process.env.TZ = "UTC";
console.log("🌍 Server timezone set to UTC for consistent timestamps");
console.log("📅 Server startup time (UTC):", new Date());

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global error handler for PayloadTooLargeError
app.use((error: any, req: any, res: any, next: any) => {
  if (error.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'File too large',
      message: 'The uploaded file is too large. Please select a smaller image (max 8MB).',
      details: 'PayloadTooLargeError'
    });
  }
  next(error);
});

// Global error handler for payload too large
app.use((error: any, req: any, res: any, next: any) => {
  if (error.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'PayloadTooLargeError',
      message: 'The uploaded file is too large. Please select a smaller image (maximum 8MB).',
      details: 'The request body exceeds the maximum allowed size.'
    });
  }
  next(error);
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date(),
    websocket: {
      connected: wsServer.getConnectedClientsCount(),
      port: 8080,
    },
  });
});

// Start the server
(async () => {
  try {
    // Register routes and get HTTP server
    const server = await registerRoutes(app);

    if (process.env.NODE_ENV === "development") {
      // Only import vite in dev
      const { setupVite } = await import("./vite.js");
      await setupVite(app, server);
      console.log("🔧 Vite development server integrated");
    } else {
      // Import "path" dynamically in prod
      const { join } = await import("path");
      app.use(express.static(join(process.cwd(), "dist/public")));
    }

    server.listen(parseInt(PORT.toString()), "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🔌 WebSocket server running on port 8080`);
      console.log(
        `📧 Email notifications: ${process.env.SMTP_USER ? "Configured" : "Not configured"}`
      );
      console.log(`📱 SMS notifications: Coming soon`);
      console.log(`🔔 Push notifications: Active`);
      if (process.env.NODE_ENV === "development") {
        console.log(`🌐 Frontend available at http://localhost:${PORT}`);
      }
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  wsServer.close();
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully");
  wsServer.close();
  process.exit(0);
});