import Joi from "joi";
import * as jwt from "jsonwebtoken";
import { getEnvConfig } from "../config/config";
import { getErrorMessage } from "../oplog/error";
import oplog from "../oplog/oplog";

export type SecretEchoJWTClaims = {
	user_id: string;
	session_id: string;
	audience?: string;
} & jwt.JwtPayload;

export function generateJWT(body: SecretEchoJWTClaims): string | Error {
	const claims: SecretEchoJWTClaims = {
		user_id: body.user_id,
		session_id: body.session_id,
		audience: "secretEcho.companion.io",
	};

	const envConfig = getEnvConfig();

	const token = jwt.sign(claims, envConfig.TOKEN_SECRET, {
		algorithm: "HS256",
		expiresIn: body.exp,
		audience: claims.audience,
	});

	return token;
}

export function verifyJWT(token: string): SecretEchoJWTClaims | Error {
	try {
		const verifiedToken = jwt.verify(token, getEnvConfig().TOKEN_SECRET, {
			ignoreExpiration: false,
		}) as SecretEchoJWTClaims;

		return verifiedToken;
	} catch (error) {
		oplog.error(getErrorMessage(error));

		return error as Error;
	}
}

export type GenerateTokenResponse = {
	type: string;
	token: string;
	data: Object;
};

export type GenerateSessionTokenData = {
	user_pid: string;
	expiry_at: Date;
};

export const GenerateSessionTokenDataSchema = Joi.object<GenerateSessionTokenData>({
	user_pid: Joi.string().required(),
	expiry_at: Joi.date().required(),
});
