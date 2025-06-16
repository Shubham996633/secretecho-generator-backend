import bcrypt from "bcrypt";
import { IUser } from "../../entities/user";
import { SecretEchoContext } from "../../middleware/context";
import { LoginRequest, SignUpRequest } from "../../models/users";
import { getErrorMessage } from "../../oplog/error";
import oplog from "../../oplog/oplog";

export async function signup(secretEchoCtx: SecretEchoContext, data: SignUpRequest): Promise<IUser | Error> {
	const existingUser = await secretEchoCtx.dbProviders.user.findByEmail(secretEchoCtx, data.email);
	if (existingUser instanceof Error) {
		oplog.error(`Error checking existing user: ${getErrorMessage(existingUser)}`);
		return existingUser;
	}
	if (existingUser) {
		oplog.error(`User with email ${data.email} already exists`);
		return new Error("User with this email already exists");
	}

	const hashedPassword = await bcrypt.hash(data.password, 10);
	const userData = {
		...data,
		password: hashedPassword,
	};

	const savedUser = await secretEchoCtx.dbProviders.user.create(secretEchoCtx, userData);
	if (savedUser instanceof Error) {
		oplog.error(`Error creating user: ${getErrorMessage(savedUser)}`);
		return savedUser;
	}

	oplog.info(`User created successfully: ${savedUser.email}`);
	return savedUser;
}

export async function login(secretEchoCtx: SecretEchoContext, data: LoginRequest): Promise<IUser | Error> {
	const user = await secretEchoCtx.dbProviders.user.findByEmail(secretEchoCtx, data.email);
	if (user instanceof Error) {
		oplog.error(`Error finding user: ${getErrorMessage(user)}`);
		return user;
	}
	if (!user) {
		oplog.error(`Invalid credentials for email: ${data.email}`);
		return new Error("Invalid credentials");
	}

	const isPasswordValid = await bcrypt.compare(data.password, user.password);
	if (!isPasswordValid) {
		oplog.error(`Invalid password for email: ${data.email}`);
		return new Error("Invalid credentials");
	}

	oplog.info(`User logged in successfully: ${user.email}`);
	return user;
}

export async function getUserDetails(secretEchoCtx: SecretEchoContext, userPid: string): Promise<IUser | Error> {
	const user = await secretEchoCtx.dbProviders.user.findByPid(secretEchoCtx, userPid);
	if (user instanceof Error) {
		oplog.error(`Error fetching user details: ${getErrorMessage(user)}`);
		return user;
	}
	if (!user) {
		oplog.error(`User not found for PID: ${userPid}`);
		return new Error("User not found");
	}
	return user;
}

export async function logout(secretEchoCtx: SecretEchoContext): Promise<void | Error> {
	const sessionPid = secretEchoCtx.SessionPID;
	if (!sessionPid) {
		oplog.error("No session PID found in context for logout");
		return new Error("No active session found");
	}

	const deleteResponse = await secretEchoCtx.dbProviders.Session.deleteByPid(secretEchoCtx, sessionPid);
	if (deleteResponse instanceof Error) {
		oplog.error(`Could not logout user: ${getErrorMessage(deleteResponse)}`);
		return deleteResponse;
	}
}
