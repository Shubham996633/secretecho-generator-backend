import { PublicIDPrefixes } from "../../config/prefixes";
import { IUser } from "../../entities/user";
import { SecretEchoContext } from "../../middleware/context";
import { getErrorMessage } from "../../oplog/error";
import oplog from "../../oplog/oplog";
import { generatePublicID } from "../../utils/ids";

export async function create(secretEchoCtx: SecretEchoContext, userData: Partial<IUser>): Promise<IUser | Error> {
	try {
		const user = new secretEchoCtx.entities.Users({
			...userData,
			user_pid: generatePublicID(PublicIDPrefixes.USER),
		});
		const savedUser = await user.save();
		return savedUser;
	} catch (error) {
		oplog.error(getErrorMessage(error));
		return error as Error;
	}
}

export async function findByEmail(secretEchoCtx: SecretEchoContext, email: string): Promise<IUser | null | Error> {
	try {
		const user = await secretEchoCtx.entities.Users.findOne({ email });
		return user;
	} catch (error) {
		oplog.error(getErrorMessage(error));
		return error as Error;
	}
}

export async function findById(secretEchoCtx: SecretEchoContext, userId: string): Promise<IUser | null | Error> {
	try {
		const user = await secretEchoCtx.entities.Users.findById(userId).select("-password");
		return user;
	} catch (error) {
		oplog.error(getErrorMessage(error));
		return error as Error;
	}
}

export async function findByPid(secretEchoCtx: SecretEchoContext, userPid: string): Promise<IUser | null | Error> {
	try {
		const user = await secretEchoCtx.entities.Users.findOne({ user_pid: userPid });
		return user;
	} catch (error) {
		oplog.error(getErrorMessage(error));
		return error as Error;
	}
}
