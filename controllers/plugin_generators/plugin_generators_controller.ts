import { RequestHandler } from "express";
import { SecretEchoContext } from "../../middleware/context";
import {
	CreatePluginGeneratorRequest,
	CreatePluginGeneratorRequestSchema,
	CreatePluginGeneratorResponse,
	GetPluginGeneratorChatHistoryRequest,
	GetPluginGeneratorChatHistoryRequestSchema,
	SaveGeneratedPluginRequest,
	SaveGeneratedPluginRequestSchema,
	SaveGeneratedPluginResponse,
	SavePluginGeneratorMessageRequest,
	SavePluginGeneratorMessageRequestSchema,
	SavePluginGeneratorMessageResponse,
} from "../../models/plugin_generator";
import { ReturnError, ReturnSuccess } from "../../models/request_response";
import { providersInterface } from "../../providers/interface";
import { validateDataUsingJOI } from "../../utils/validator";

// Create a new plugin generator session
export const createPluginGenerator: RequestHandler = async (req, res) => {
	const data = validateDataUsingJOI<CreatePluginGeneratorRequest>(req.body, CreatePluginGeneratorRequestSchema);
	if (data instanceof Error) {
		return ReturnError(res, [data.message], 400);
	}

	const secretEchoCtx = SecretEchoContext.get(req);
	const userId = secretEchoCtx.UserPID;

	if (!userId) {
		return ReturnError(res, ["User ID is required"], 400);
	}

	const result = await providersInterface.PluginGenerators.createPluginGenerator(
		secretEchoCtx,
		userId,
		data.pluginName
	);
	if (result instanceof Error) {
		return ReturnError(res, [result.message], 500);
	}

	const response: CreatePluginGeneratorResponse = {
		message: "Plugin generator session created successfully",
		pluginId: result, // The service returns the generated pluginId
	};

	return ReturnSuccess(res, response);
};

// Save a message to the plugin generator chat
export const savePluginGeneratorMessage: RequestHandler = async (req, res) => {
	const data = validateDataUsingJOI<SavePluginGeneratorMessageRequest>(
		req.body,
		SavePluginGeneratorMessageRequestSchema
	);
	if (data instanceof Error) {
		return ReturnError(res, [data.message], 400);
	}

	const secretEchoCtx = SecretEchoContext.get(req);
	const userId = secretEchoCtx.UserPID;

	if (!userId) {
		return ReturnError(res, ["User ID is required"], 400);
	}

	const result = await providersInterface.PluginGenerators.savePluginGeneratorMessage(
		secretEchoCtx,
		userId,
		data.pluginId,
		data.content,
		data.sender
	);
	if (result instanceof Error) {
		return ReturnError(res, [result.message], 500);
	}

	const response: SavePluginGeneratorMessageResponse = {
		message: "Message saved successfully",
	};

	return ReturnSuccess(res, response);
};

// Retrieve the chat history for a plugin generator session
export const getPluginGeneratorChatHistory: RequestHandler = async (req, res) => {
	const data = validateDataUsingJOI<GetPluginGeneratorChatHistoryRequest>(
		{ pluginId: req.query.plugin_id },
		GetPluginGeneratorChatHistoryRequestSchema
	);
	if (data instanceof Error) {
		return ReturnError(res, [data.message], 400);
	}

	const secretEchoCtx = SecretEchoContext.get(req);
	const userId = secretEchoCtx.UserPID;

	if (!userId) {
		return ReturnError(res, ["User ID is required"], 400);
	}

	const chatHistory = await providersInterface.PluginGenerators.getPluginGeneratorChatHistory(
		secretEchoCtx,
		userId,
		data.pluginId
	);
	if (chatHistory instanceof Error) {
		return ReturnError(res, [chatHistory.message], 500);
	}

	return ReturnSuccess(res, chatHistory);
};

// Save the final generated plugin code
export const saveGeneratedPlugin: RequestHandler = async (req, res) => {
	const data = validateDataUsingJOI<SaveGeneratedPluginRequest>(req.body, SaveGeneratedPluginRequestSchema);
	if (data instanceof Error) {
		return ReturnError(res, [data.message], 400);
	}

	const secretEchoCtx = SecretEchoContext.get(req);
	const userId = secretEchoCtx.UserPID;

	if (!userId) {
		return ReturnError(res, ["User ID is required"], 400);
	}

	const result = await providersInterface.PluginGenerators.saveGeneratedPlugin(
		secretEchoCtx,
		userId,
		data.pluginId,
		data.generatedPlugin
	);
	if (result instanceof Error) {
		return ReturnError(res, [result.message], 500);
	}

	const response: SaveGeneratedPluginResponse = {
		message: "Generated plugin saved successfully",
	};

	return ReturnSuccess(res, response);
};

// List all plugin generator sessions for a user
export const listPluginGenerators: RequestHandler = async (req, res) => {
	const secretEchoCtx = SecretEchoContext.get(req);
	const userId = secretEchoCtx.UserPID;

	if (!userId) {
		return ReturnError(res, ["User ID is required"], 400);
	}

	const pluginGenerators = await providersInterface.PluginGenerators.listPluginGenerators(secretEchoCtx, userId);
	if (pluginGenerators instanceof Error) {
		return ReturnError(res, [pluginGenerators.message], 500);
	}

	return ReturnSuccess(res, pluginGenerators);
};
