import express from "express";
import {
	createPluginGenerator,
	getPluginGeneratorChatHistory,
	listPluginGenerators,
	saveGeneratedPlugin,
	savePluginGeneratorMessage,
} from "../controllers/plugin_generators/plugin_generators_controller";
import { getUserDetails, login, logout, signup } from "../controllers/users/users_controller";

export function mapUrls(app: express.Express) {
	const msV1APIRouter = express.Router();

	// status
	app.get("/", (req, res) => {
		res.status(200).json({ status: "OK" });
	});

	app.use("/api/v1", msV1APIRouter);

	// User-related routes (unchanged)
	msV1APIRouter.post("/auth/signup", signup);
	msV1APIRouter.post("/auth/login", login);
	msV1APIRouter.post("/auth/logout", logout);
	msV1APIRouter.get("/users/me", getUserDetails);

	// Plugin generator routes
	msV1APIRouter.post("/plugin/plugin-generator", createPluginGenerator); // Create a new plugin generator session
	msV1APIRouter.get("/plugin/plugin-generator/chat-history", getPluginGeneratorChatHistory); // Get chat history for a plugin session
	msV1APIRouter.post("/plugin/plugin-generator/message", savePluginGeneratorMessage); // Save a message to the chat (optional, mostly handled via WebSocket)
	msV1APIRouter.post("/plugin/plugin-generator/save-plugin", saveGeneratedPlugin); // Save the final generated plugin code
	msV1APIRouter.get("/plugin/plugin-generators", listPluginGenerators); // List all plugin generator sessions for the user
}
