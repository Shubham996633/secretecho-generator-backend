import { parse } from "url";
import WebSocket from "ws";
import { PluginGeneratorService } from "../helpers/gemini_live_api";
import { authorizeWebSocketConnection, SecretEchoContext } from "../middleware/context";
import oplog from "../oplog/oplog";

type WebSocketHandler = (ws: WebSocket, req: any) => void;

// Define the WebSocket routes mapping
const webSocketRoutes: { [path: string]: WebSocketHandler } = {
	"/plugin_generator": (ws: WebSocket, req: any) => {
		oplog.info("New WebSocket connection established at /plugin_generator");
		// Initialize Plugin Generator Service for this connection
		const query = parse(req.url || "", true).query;
		const pluginId = query.plugin_id as string | undefined;
		if (!pluginId) {
			oplog.warn("Missing plugin_id in WebSocket query");
			ws.close(1000, "Missing plugin_id");
			return;
		}

		new PluginGeneratorService(ws, pluginId);

		// Add error handling for this connection
		ws.on("error", (error) => {
			oplog.error("WebSocket error on /plugin_generator:", error);
		});

		ws.on("close", () => {
			oplog.info("WebSocket connection closed at /plugin_generator");
		});
	},
};

export function mapWebSocketUrls(wss: WebSocket.Server) {
	wss.on("connection", async (ws: WebSocket, req: any) => {
		const path = req.url?.split("?")[0];
		if (!path || !webSocketRoutes[path]) {
			oplog.warn(`No WebSocket handler found for path: ${path}`);
			ws.close(1000, "Invalid WebSocket path");
			return;
		}

		// Authorize the WebSocket connection
		const isAuthorized = await authorizeWebSocketConnection(ws, req);
		if (!isAuthorized) {
			return; // Connection is already closed by authorizeWebSocketConnection
		}

		// If authorized, get the context and log user info
		const ctx = SecretEchoContext.getWs(ws);
		oplog.info(`WebSocket connection authorized for user: ${ctx.UserPID}, session: ${ctx.SessionPID}`);

		const handler = webSocketRoutes[path];
		handler(ws, req);
	});
}
