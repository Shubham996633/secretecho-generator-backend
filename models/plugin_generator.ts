import Joi from "joi";

// Request/Response for creating a new plugin generator session
export type CreatePluginGeneratorRequest = {
	pluginName: string; // Added to allow naming the plugin for frontend display
};

export const CreatePluginGeneratorRequestSchema = Joi.object<CreatePluginGeneratorRequest>({
	pluginName: Joi.string().required().messages({
		"string.base": "Plugin Name must be a string",
		"any.required": "Plugin Name is required",
	}),
});

export type CreatePluginGeneratorResponse = {
	message: string;
	pluginId: string;
};

// Request/Response for saving a message in the plugin generator chat
export type SavePluginGeneratorMessageRequest = {
	pluginId: string;
	content: string;
	sender: "user" | "plugin_generator";
};

export const SavePluginGeneratorMessageRequestSchema = Joi.object<SavePluginGeneratorMessageRequest>({
	pluginId: Joi.string().required().messages({
		"string.base": "Plugin ID must be a string",
		"any.required": "Plugin ID is required",
	}),
	content: Joi.string().required().messages({
		"string.base": "Content must be a string",
		"any.required": "Content is required",
	}),
	sender: Joi.string().valid("user", "plugin_generator").required().messages({
		"string.base": "Sender must be a string",
		"any.only": 'Sender must be either "user" or "plugin_generator"',
		"any.required": "Sender is required",
	}),
});

export type SavePluginGeneratorMessageResponse = {
	message: string;
};

// Request/Response for retrieving the chat history of a plugin generator session
export type GetPluginGeneratorChatHistoryRequest = {
	pluginId: string;
};

export const GetPluginGeneratorChatHistoryRequestSchema = Joi.object<GetPluginGeneratorChatHistoryRequest>({
	pluginId: Joi.string().required().messages({
		"string.base": "Plugin ID must be a string",
		"any.required": "Plugin ID is required",
	}),
});

export type ChatMessage = {
	content: string;
	sender: "user" | "plugin_generator";
	timestamp: Date;
};

export type GetPluginGeneratorChatHistoryResponse = ChatMessage[];

// Request/Response for saving the final generated plugin code
export type SaveGeneratedPluginRequest = {
	pluginId: string;
	generatedPlugin: string;
};

export const SaveGeneratedPluginRequestSchema = Joi.object<SaveGeneratedPluginRequest>({
	pluginId: Joi.string().required().messages({
		"string.base": "Plugin ID must be a string",
		"any.required": "Plugin ID is required",
	}),
	generatedPlugin: Joi.string().required().messages({
		"string.base": "Generated Plugin must be a string",
		"any.required": "Generated Plugin is required",
	}),
});

export type SaveGeneratedPluginResponse = {
	message: string;
};

export type ChatHistoryResponse = {
	chat: ChatMessage[];
	lastCode: string | null; // The most recent code message, if any
};
