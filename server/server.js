const http = require("http");
const url = require("url");

let clients = [];

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url);

  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle OPTIONS request (CORS preflight)
  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  // Handle SSE endpoint
  if (parsedUrl.pathname === "/listen" && req.method === "GET") {
    console.log("👥 New client connected");
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    const clientId = Date.now();
    const newClient = {
      id: clientId,
      res,
    };
    clients.push(newClient);
    console.log(`✅ Total clients connected: ${clients.length}`);

    req.on("close", () => {
      clients = clients.filter((client) => client.id !== clientId);
      console.log(
        `👋 Client disconnected. Remaining clients: ${clients.length}`
      );
    });
  }
  // Handle heartbeat endpoint
  else if (parsedUrl.pathname === "/" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", () => {
      try {
        const heartbeatData = JSON.parse(body);
        console.log(`📥 Received heartbeat at ${heartbeatData.timestamp}`);

        // Send heartbeat to all connected clients
        clients.forEach((client) => {
          client.res.write(`data: ${JSON.stringify(heartbeatData)}\n\n`);
        });
        console.log(`📤 Forwarded heartbeat to ${clients.length} clients`);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Heartbeat received" }));
      } catch (error) {
        console.error("❌ Error processing heartbeat:", error);
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON" }));
      }
    });
  }
  // Handle unknown endpoints
  else {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not Found" }));
  }
});

const PORT = 3141;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// Handle server shutdown
process.on("SIGINT", () => {
  console.log("\n👋 Shutting down server...");
  clients.forEach((client) => {
    try {
      client.res.end();
    } catch (error) {
      // Ignore client connection errors during shutdown
    }
  });
  server.close(() => {
    console.log("✅ Server shutdown complete");
    process.exit();
  });
});
