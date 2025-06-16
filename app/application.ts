import bodyParser from "body-parser";
import express from "express";
import http from "http";
import WebSocket from "ws";
import { getEnvConfig } from "../config/config";
import { SecretEchoContextMiddleware } from "../middleware/context";
import { RateLimiterMiddleware } from "../middleware/rate_limiter"; // Add this import
import oplog from "../oplog/oplog";
import { mapUrls } from "./url_mapping";
import { mapWebSocketUrls } from "./ws_url_mapping";

export function bootstrapApp() {
	const app = express();
	const server = http.createServer(app);
	const wss = new WebSocket.Server({ server });

	const PORT = process.env.PORT || getEnvConfig().APP_PORT || 3000;

	// Register Express middlewares and routes
	registerMiddlewares(app);
	mapUrls(app);
	mapWebSocketUrls(wss);

	wss.on("error", (error) => {
		oplog.error("WebSocket server error:", error);
	});

	server.listen(PORT, () => {
		oplog.info(`Server is running on port ${PORT}`);
	});
}

function registerMiddlewares(app: express.Express) {
	app.use(bodyParser.json({ limit: "50mb" }));
	app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
	app.use(SecretEchoContextMiddleware);
	app.use(RateLimiterMiddleware); // Add rate limiter after context middleware
}
