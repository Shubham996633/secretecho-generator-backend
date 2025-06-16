import { create, findByUserAndPlugin, listByUser, pushMessage, saveGeneratedPlugin } from "./plugin_generator_repo";

export const PluginGeneratorRepository = {
	findByUserAndPlugin,
	create,
	pushMessage,
	listByUser,
	saveGeneratedPlugin,
};
