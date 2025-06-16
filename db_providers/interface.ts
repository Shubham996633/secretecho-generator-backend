import { PluginGeneratorRepository } from "../repositories/plugin-generators/plugin_generator_repo_interface";
import { SessionRepository } from "../repositories/sessions/sessions_repo_interface";
import { UserRepository } from "../repositories/users/users_repo_interface";

export const dbProvidersInterface = {
	Session: SessionRepository,
	user: UserRepository,
	PluginGenerator: PluginGeneratorRepository,
};
