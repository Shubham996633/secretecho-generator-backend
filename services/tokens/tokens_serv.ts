import { TokenTypes } from "../../constants/tokens";
import { SecretEchoContext } from "../../middleware/context";
import {
	generateJWT,
	GenerateSessionTokenData,
	GenerateSessionTokenDataSchema,
	GenerateTokenResponse,
} from "../../models/token";
import { getErrorMessage } from "../../oplog/error";
import oplog from "../../oplog/oplog";
import { validateDataUsingJOI } from "../../utils/validator";

export async function create(
	secretEchoCtx: SecretEchoContext,
	tokenType: string,
	tokenData: GenerateSessionTokenData
): Promise<GenerateTokenResponse | Error> {
	if (tokenType === TokenTypes.SESSION_TOKEN) {
		return await generateSessionToken(secretEchoCtx, TokenTypes.SESSION_TOKEN, tokenData);
	}

	const err = new Error("invalid token type: " + tokenType);
	oplog.error(err.message);
	return err;
}

const generateSessionToken = async (
	secretEchoCtx: SecretEchoContext,
	tokenType: string,
	tokenData: GenerateSessionTokenData
): Promise<GenerateTokenResponse | Error> => {
	try {
		if (tokenType !== TokenTypes.SESSION_TOKEN) {
			throw new Error(`cannot generate session token for type ${tokenType}`);
		}

		const validateTokenData = validateDataUsingJOI<GenerateSessionTokenData>(tokenData, GenerateSessionTokenDataSchema);
		if (validateTokenData instanceof Error) {
			oplog.error("invalid token data: " + getErrorMessage(validateTokenData));
			return validateTokenData as Error;
		}

		// Find the user by user_pid to get the MongoDB _id
		const secretEchoUser = await secretEchoCtx.dbProviders.user.findByPid(secretEchoCtx, validateTokenData.user_pid);
		if (secretEchoUser instanceof Error) {
			oplog.error("user not found: " + getErrorMessage(secretEchoUser));
			return secretEchoUser as Error;
		}
		if (!secretEchoUser) {
			oplog.error(`User not found for user_pid: ${validateTokenData.user_pid}`);
			return new Error("User not found");
		}

		// Create the session with the correct user_id field
		const sessionToCreate = {
			user_id: secretEchoUser._id,
			expiry_at: tokenData.expiry_at,
		};
		const createdSession = await secretEchoCtx.dbProviders.Session.create(secretEchoCtx, sessionToCreate);
		if (createdSession instanceof Error) {
			oplog.error("could not create session: " + getErrorMessage(createdSession));
			return createdSession as Error;
		}

		const token = generateJWT({
			session_id: createdSession.session_pid,
			user_id: secretEchoUser.user_pid,
			exp: tokenData.expiry_at.getTime(),
		});
		if (token instanceof Error) {
			oplog.error("could not generate jwt: " + getErrorMessage(token));
			return token as Error;
		}

		const response: GenerateTokenResponse = {
			type: TokenTypes.SESSION_TOKEN,
			data: tokenData,
			token: token,
		};

		return response;
	} catch (error) {
		oplog.error(getErrorMessage(error));
		return error as Error;
	}
};
