import { RequestHandler } from "express";
import { TokenTypes } from "../../constants/tokens";
import { SecretEchoContext } from "../../middleware/context";
import { ReturnError, ReturnSuccess } from "../../models/request_response";
import { GenerateSessionTokenData } from "../../models/token";
import {
	LoginRequest,
	LoginRequestSchema,
	LoginResponse,
	SignUpRequest,
	SignUpRequestSchema,
	SignUpResponse,
	UserDetailsResponse,
} from "../../models/users";
import { getErrorMessage } from "../../oplog/error";
import oplog from "../../oplog/oplog";
import { providersInterface } from "../../providers/interface";
import { UserService } from "../../services/users/users_serv_interface";
import { validateDataUsingJOI } from "../../utils/validator";

export const signup: RequestHandler = async (req, res) => {
	const data = validateDataUsingJOI<SignUpRequest>(req.body, SignUpRequestSchema);
	if (data instanceof Error) {
		return ReturnError(res, [data.message], 400);
	}

	const secretEchoCtx = SecretEchoContext.get(req);
	const result = await providersInterface.users.signup(secretEchoCtx, data);
	if (result instanceof Error) {
		return ReturnError(res, [result.message], 400);
	}

	// Generate token
	const tokenData: GenerateSessionTokenData = {
		user_pid: result.user_pid, // Fixed: Changed user_id to user_pid
		expiry_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours expiry
	};

	const tokenResponse = await providersInterface.tokens.create(secretEchoCtx, TokenTypes.SESSION_TOKEN, tokenData);
	if (tokenResponse instanceof Error) {
		oplog.error(`Error generating token: ${getErrorMessage(tokenResponse)}`);
		return ReturnError(res, [tokenResponse.message], 500);
	}

	const response: SignUpResponse = {
		user_pid: result.user_pid,
		email: result.email,
		first_name: result.first_name,
		last_name: result.last_name,
		token: tokenResponse.token,
	};

	return ReturnSuccess(res, response);
};

export const login: RequestHandler = async (req, res) => {
	const data = validateDataUsingJOI<LoginRequest>(req.body, LoginRequestSchema);
	if (data instanceof Error) {
		return ReturnError(res, [data.message], 400);
	}

	const secretEchoCtx = SecretEchoContext.get(req);
	const result = await UserService.login(secretEchoCtx, data);
	if (result instanceof Error) {
		return ReturnError(res, [result.message], 401);
	}

	// Generate token
	const tokenData: GenerateSessionTokenData = {
		user_pid: result.user_pid,
		expiry_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours expiry
	};

	const tokenResponse = await providersInterface.tokens.create(secretEchoCtx, TokenTypes.SESSION_TOKEN, tokenData);
	if (tokenResponse instanceof Error) {
		oplog.error(`Error generating token: ${getErrorMessage(tokenResponse)}`);
		return ReturnError(res, [tokenResponse.message], 500);
	}

	const response: LoginResponse = {
		token: tokenResponse.token,
		user_pid: result.user_pid,
		email: result.email,
		first_name: result.first_name,
		last_name: result.last_name,
	};

	return ReturnSuccess(res, response);
};

export const getUserDetails: RequestHandler = async (req, res) => {
	const secretEchoCtx: SecretEchoContext = SecretEchoContext.get(req);
	const userPid = secretEchoCtx.UserPID;

	const result = await UserService.getUserDetails(secretEchoCtx, userPid);
	if (result instanceof Error) {
		return ReturnError(res, [result.message], 404);
	}

	const response: UserDetailsResponse = {
		user_pid: result.user_pid,
		email: result.email,
		first_name: result.first_name,
		last_name: result.last_name,
		created_at: result.created_at,
		updated_at: result.updated_at,
	};

	return ReturnSuccess(res, response);
};

export const logout: RequestHandler = async (req, res, _) => {
	const secretEchoCtx: SecretEchoContext = SecretEchoContext.get(req);
	const data = await providersInterface.users.logout(secretEchoCtx);

	if (data instanceof Error) {
		oplog.error("error logout users: " + getErrorMessage(data));

		return ReturnError(res, ["could not logout the current user"]);
	}

	return ReturnSuccess(res, data);
};
