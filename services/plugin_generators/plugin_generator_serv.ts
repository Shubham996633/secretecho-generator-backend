import { SecretEchoContext } from "../../middleware/context";
import { ChatHistoryResponse, ChatMessage } from "../../models/plugin_generator";
import { getErrorMessage } from "../../oplog/error";
import oplog from "../../oplog/oplog";

// Create a new plugin generator session
export async function createPluginGenerator(
	secretEchoCtx: SecretEchoContext,
	userPid: string,
	pluginName: string
): Promise<string | Error> {
	try {
		const user = await secretEchoCtx.dbProviders.user.findByPid(secretEchoCtx, userPid);
		if (user instanceof Error) {
			oplog.error("User not found: " + getErrorMessage(user));
			return user as Error;
		}
		if (!user) {
			oplog.error(`User not found for user_pid: ${userPid}`);
			return new Error("User not found");
		}

		const userId = user._id.toString();
		const result = await secretEchoCtx.dbProviders.PluginGenerator.create(secretEchoCtx, userId, pluginName);
		if (result instanceof Error) {
			oplog.error(getErrorMessage(result));
			return result;
		}

		return result.pluginId;
	} catch (error) {
		oplog.error(getErrorMessage(error));
		return error as Error;
	}
}

// Save a message to the plugin generator chat
export async function savePluginGeneratorMessage(
	secretEchoCtx: SecretEchoContext,
	userPid: string,
	pluginId: string,
	content: string,
	sender: "user" | "plugin_generator"
): Promise<void | Error> {
	try {
		const message: ChatMessage = {
			content,
			sender,
			timestamp: new Date(),
		};
		const secretEchoUser = await secretEchoCtx.dbProviders.user.findByPid(secretEchoCtx, userPid);
		if (secretEchoUser instanceof Error) {
			oplog.error("User not found: " + getErrorMessage(secretEchoUser));
			return secretEchoUser as Error;
		}
		if (!secretEchoUser) {
			oplog.error(`User not found for user_pid: ${userPid}`);
			return new Error("User not found");
		}

		const userId = secretEchoUser._id.toString();
		const result = await secretEchoCtx.dbProviders.PluginGenerator.pushMessage(
			secretEchoCtx,
			userId,
			pluginId,
			message
		);
		if (result instanceof Error) {
			oplog.error(getErrorMessage(result));
			return result;
		}
		return;
	} catch (error) {
		oplog.error(getErrorMessage(error));
		return error as Error;
	}
}

// Retrieve the chat history for a plugin generator session
export async function getPluginGeneratorChatHistory(
	secretEchoCtx: SecretEchoContext,
	userPid: string,
	pluginId: string
): Promise<ChatHistoryResponse | Error> {
	try {
		const secretEchoUser = await secretEchoCtx.dbProviders.user.findByPid(secretEchoCtx, userPid);
		if (secretEchoUser instanceof Error) {
			oplog.error("User not found: " + getErrorMessage(secretEchoUser));
			return secretEchoUser as Error;
		}
		if (!secretEchoUser) {
			oplog.error(`User not found for user_pid: ${userPid}`);
			return new Error("User not found");
		}

		const userId = secretEchoUser._id.toString();
		const pluginGenerator = await secretEchoCtx.dbProviders.PluginGenerator.findByUserAndPlugin(
			secretEchoCtx,
			userId,
			pluginId
		);
		if (pluginGenerator instanceof Error) {
			oplog.error(getErrorMessage(pluginGenerator));
			return pluginGenerator;
		}

		const chat = pluginGenerator ? pluginGenerator.chat : [];

		// Find the last code message (if any)
		const codeMessages = chat.filter(
			(message) => message.content.includes("<?php") || message.content.startsWith("```php")
		);
		const lastCodeMessage = codeMessages.length > 0 ? codeMessages[codeMessages.length - 1] : null;

		// Clean up the last code message (remove ```php markers and fix newlines)
		const lastCode = lastCodeMessage
			? lastCodeMessage.content
					.replace(/```php\n|```/g, "") // Remove ```php and ``` markers
					.replace(/\\n/g, "\n") // Replace escaped newlines with actual newlines
					.trim() // Remove leading/trailing whitespace
			: null;

		return {
			chat,
			lastCode,
		};
	} catch (error) {
		oplog.error(getErrorMessage(error));
		return error as Error;
	}
}

// Save the final generated plugin code
export async function saveGeneratedPlugin(
	secretEchoCtx: SecretEchoContext,
	userPid: string,
	pluginId: string,
	generatedPlugin: string
): Promise<void | Error> {
	try {
		const secretEchoUser = await secretEchoCtx.dbProviders.user.findByPid(secretEchoCtx, userPid);
		if (secretEchoUser instanceof Error) {
			oplog.error("User not found: " + getErrorMessage(secretEchoUser));
			return secretEchoUser as Error;
		}
		if (!secretEchoUser) {
			oplog.error(`User not found for user_pid: ${userPid}`);
			return new Error("User not found");
		}

		const userId = secretEchoUser._id.toString();
		const result = await secretEchoCtx.dbProviders.PluginGenerator.saveGeneratedPlugin(
			secretEchoCtx,
			userId,
			pluginId,
			generatedPlugin
		);
		if (result instanceof Error) {
			oplog.error(getErrorMessage(result));
			return result;
		}
		return;
	} catch (error) {
		oplog.error(getErrorMessage(error));
		return error as Error;
	}
}

// List all plugin generator sessions for a user
export async function listPluginGenerators(
	secretEchoCtx: SecretEchoContext,
	userPid: string
): Promise<Array<{ pluginId: string; pluginName: string; isFinal: boolean }> | Error> {
	try {
		const secretEchoUser = await secretEchoCtx.dbProviders.user.findByPid(secretEchoCtx, userPid);
		if (secretEchoUser instanceof Error) {
			oplog.error("User not found: " + getErrorMessage(secretEchoUser));
			return secretEchoUser as Error;
		}
		if (!secretEchoUser) {
			oplog.error(`User not found for user_pid: ${userPid}`);
			return new Error("User not found");
		}

		const userId = secretEchoUser._id.toString();
		const pluginGenerators = await secretEchoCtx.dbProviders.PluginGenerator.listByUser(secretEchoCtx, userId);
		if (pluginGenerators instanceof Error) {
			oplog.error(getErrorMessage(pluginGenerators));
			return pluginGenerators;
		}

		// Map the plugin generators to include pluginId, pluginName, and isFinal
		return pluginGenerators.map((plugin) => ({
			pluginId: plugin.pluginId,
			pluginName: plugin.pluginName,
			isFinal: !!plugin.generatedPlugin, // isFinal is true if generatedPlugin exists
		}));
	} catch (error) {
		oplog.error(getErrorMessage(error));
		return error as Error;
	}
}
