import mongoose, { Document, Schema } from "mongoose";

export interface IPluginGenerator extends Document {
	userId: mongoose.Types.ObjectId;
	pluginId: string; // Unique identifier for the plugin chat
	pluginName: string; // Name of the plugin for display in frontend
	chat: ChatMessage[];
	generatedPlugin?: string; // Final generated plugin code
}

export interface ChatMessage {
	content: string;
	sender: "user" | "plugin_generator";
	timestamp: Date;
}

const PluginGeneratorSchema: Schema = new Schema({
	userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
	pluginId: { type: String, required: true, index: true }, // Added pluginId
	pluginName: { type: String, required: true }, // Added pluginName for display
	chat: [
		{
			content: { type: String, required: true },
			sender: { type: String, enum: ["user", "plugin_generator"], required: true },
			timestamp: { type: Date, default: Date.now },
		},
	],
	generatedPlugin: { type: String, required: false }, // Optional, stores the final plugin code
});

PluginGeneratorSchema.index({ userId: 1, pluginId: 1 }, { unique: true });

export const PluginGeneratorModel = mongoose.model<IPluginGenerator>("PluginGenerator", PluginGeneratorSchema);
