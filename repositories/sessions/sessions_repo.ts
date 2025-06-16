import { PublicIDPrefixes } from "../../config/prefixes";
import { ISession } from "../../entities/session";
import { SecretEchoContext } from "../../middleware/context";
import { getErrorMessage } from "../../oplog/error";
import oplog from "../../oplog/oplog";
import { generatePublicID } from "../../utils/ids";

export async function create(
	secretEchoCtx: SecretEchoContext,
	sessionData: Partial<ISession>
): Promise<ISession | Error> {
	try {
		const session = new secretEchoCtx.entities.Sessions({
			...sessionData,
			session_pid: generatePublicID(PublicIDPrefixes.SESSION),
		});
		const savedSession = await session.save();
		return savedSession;
	} catch (error) {
		oplog.error(getErrorMessage(error));
		return error as Error;
	}
}

export async function getActiveSessionsByUserId(
	secretEchoCtx: SecretEchoContext,
	userId: string
): Promise<ISession[] | Error> {
	try {
		const sessions = await secretEchoCtx.entities.Sessions.find({
			user_id: userId,
			expiry_at: { $gt: new Date() },
			deleted_at: null,
		});
		return sessions;
	} catch (error) {
		oplog.error(getErrorMessage(error));
		return error as Error;
	}
}

export async function getByPid(secretEchoCtx: SecretEchoContext, sessionPid: string): Promise<ISession | null | Error> {
	try {
		const session = await secretEchoCtx.entities.Sessions.findOne({
			session_pid: sessionPid,
			deleted_at: null, // Only return sessions that are not soft-deleted
		});
		return session;
	} catch (error) {
		oplog.error(getErrorMessage(error));
		return error as Error;
	}
}
export async function deleteByPid(secretEchoCtx: SecretEchoContext, sessionPid: string): Promise<void | Error> {
	try {
		const session = await secretEchoCtx.entities.Sessions.findOneAndUpdate(
			{ session_pid: sessionPid, deleted_at: null },
			{ deleted_at: new Date() },
			{ new: true }
		);
		if (!session) {
			return new Error("Session not found or already deleted");
		}
		return;
	} catch (error) {
		oplog.error(getErrorMessage(error));
		return error as Error;
	}
}
