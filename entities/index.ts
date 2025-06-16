import { PluginGeneratorModel } from "./plugin_generator";
import { SessionModel } from "./session";
import { UserModel } from "./user";

export const dBEntities = {
	Users: UserModel,
	Sessions: SessionModel,
	PluginGenerators: PluginGeneratorModel,
};
