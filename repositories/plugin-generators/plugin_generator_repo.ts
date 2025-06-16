import mongoose from "mongoose";
import { PublicIDPrefixes } from "../../config/prefixes";
import { IPluginGenerator } from "../../entities/plugin_generator";
import { SecretEchoContext } from "../../middleware/context";
import { ChatMessage } from "../../models/plugin_generator"; // Update to use plugin_generator model
import { getErrorMessage } from "../../oplog/error";
import oplog from "../../oplog/oplog";
import { generatePublicID } from "../../utils/ids";

// Find a plugin chat by userId and pluginId
export async function findByUserAndPlugin(
	secretEchoCtx: SecretEchoContext,
	userId: string,
	pluginId: string
): Promise<IPluginGenerator | null | Error> {
	try {
		const pluginGenerator = await secretEchoCtx.entities.PluginGenerators.findOne({
			userId: new mongoose.Types.ObjectId(userId),
			pluginId,
		}).exec();
		return pluginGenerator;
	} catch (error) {
		oplog.error(getErrorMessage(error));
		return error as Error;
	}
}

// Create a new plugin chat for a user
export async function create(
	secretEchoCtx: SecretEchoContext,
	userId: string,
	pluginName: string
): Promise<IPluginGenerator | Error> {
	try {
		const pluginId = generatePublicID(PublicIDPrefixes.PLUGIN);
		const pluginGenerator = new secretEchoCtx.entities.PluginGenerators({
			userId: new mongoose.Types.ObjectId(userId),
			pluginId,
			pluginName,
			chat: [],
			generatedPlugin: null,
		});
		const savedPluginGenerator = await pluginGenerator.save();
		return savedPluginGenerator;
	} catch (error) {
		oplog.error(getErrorMessage(error));
		return error as Error;
	}
}

// Add a message to the plugin chat
export async function pushMessage(
	secretEchoCtx: SecretEchoContext,
	userId: string,
	pluginId: string,
	message: ChatMessage
): Promise<void | Error> {
	try {
		const pluginGenerator = await secretEchoCtx.entities.PluginGenerators.findOneAndUpdate(
			{
				userId: new mongoose.Types.ObjectId(userId),
				pluginId,
			},
			{
				$push: {
					chat: message,
				},
			},
			{ upsert: true }
		).exec();
		if (!pluginGenerator) {
			return new Error("PluginGenerator not found");
		}
		return;
	} catch (error) {
		oplog.error(getErrorMessage(error));
		return error as Error;
	}
}

// List all plugin chats for a user
export async function listByUser(
	secretEchoCtx: SecretEchoContext,
	userId: string
): Promise<IPluginGenerator[] | Error> {
	try {
		const pluginGenerators = await secretEchoCtx.entities.PluginGenerators.find({
			userId: new mongoose.Types.ObjectId(userId),
		}).exec();
		return pluginGenerators;
	} catch (error) {
		oplog.error(getErrorMessage(error));
		return error as Error;
	}
}

// Save the final generated plugin code
export async function saveGeneratedPlugin(
	secretEchoCtx: SecretEchoContext,
	userId: string,
	pluginId: string,
	generatedPlugin: string
): Promise<void | Error> {
	try {
		const pluginGenerator = await secretEchoCtx.entities.PluginGenerators.findOneAndUpdate(
			{
				userId: new mongoose.Types.ObjectId(userId),
				pluginId,
			},
			{
				$set: {
					generatedPlugin,
				},
			},
			{ new: true }
		).exec();
		if (!pluginGenerator) {
			return new Error("PluginGenerator not found");
		}
		return;
	} catch (error) {
		oplog.error(getErrorMessage(error));
		return error as Error;
	}
}
