import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import WebSocket from "ws";
import { getEnvConfig } from "../config/config";
import { dbProvidersInterface } from "../db_providers/interface";
import { dBEntities } from "../entities";
import { ReturnError } from "../models/request_response";
import oplog from "../oplog/oplog";

export class SecretEchoContext {
	static _httpBindings = new WeakMap<Request, SecretEchoContext>();
	static _wsBindings = new WeakMap<WebSocket, SecretEchoContext>();

	public Authorization: string = "";
	public UserPID: string = "";
	public SessionPID: string = "";
	public dbProviders = dbProvidersInterface;
	public entities = dBEntities;

	constructor() {}

	// Bind to HTTP request
	static bind(req: Request): void {
		const ctx = new SecretEchoContext();
		SecretEchoContext._httpBindings.set(req, ctx);
	}

	// Get for HTTP request
	static get(req: Request): SecretEchoContext {
		const ctx = SecretEchoContext._httpBindings.get(req);
		if (!ctx) {
			throw new Error("Cannot get SecretEcho context for HTTP request");
		}
		return ctx;
	}

	// Bind to WebSocket connection
	static bindWs(ws: WebSocket): void {
		const ctx = new SecretEchoContext();
		SecretEchoContext._wsBindings.set(ws, ctx);
	}

	// Get for WebSocket connection
	static getWs(ws: WebSocket): SecretEchoContext {
		const ctx = SecretEchoContext._wsBindings.get(ws);
		if (!ctx) {
			throw new Error("Cannot get SecretEcho context for WebSocket connection");
		}
		return ctx;
	}
}

export async function SecretEchoContextMiddleware(req: Request, res: Response, next: NextFunction) {
	SecretEchoContext.bind(req);

	// Skip authentication for /signup and /login routes
	const publicRoutes = ["/api/v1/auth/signup", "/api/v1/auth/login"];
	if (publicRoutes.includes(req.path)) {
		return next();
	}

	const authHeader = req.get("Authorization");
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return ReturnError(res, ["Unauthorized: No token provided"], 401);
	}

	const token = authHeader.replace("Bearer ", "");
	let decoded: any;
	try {
		decoded = jwt.verify(token, getEnvConfig().TOKEN_SECRET) as { user_id: string; session_id: string };
	} catch (error: any) {
		oplog.error(`Token verification failed: ${error.message}`);
		return ReturnError(res, ["Unauthorized: Invalid token"], 401);
	}

	const secretEchoCtx = SecretEchoContext.get(req);
	const session = await dbProvidersInterface.Session.getByPid(secretEchoCtx, decoded.session_id);
	if (session instanceof Error) {
		oplog.error(`Error fetching session: ${session.message}`);
		return ReturnError(res, ["Unauthorized: Invalid session"], 401);
	}
	if (!session) {
		return ReturnError(res, ["Unauthorized: Session not found"], 401);
	}

	if (session.expiry_at < new Date()) {
		oplog.error(`Session expired: ${session.session_pid}`);
		return ReturnError(res, ["Unauthorized: Session expired"], 401);
	}

	secretEchoCtx.Authorization = authHeader;
	secretEchoCtx.UserPID = decoded.user_id;
	secretEchoCtx.SessionPID = decoded.session_id;

	return next();
}

export async function authorizeWebSocketConnection(ws: WebSocket, req: Request): Promise<boolean> {
	let token: string | undefined;
	const authHeader = req.headers.authorization;
	if (authHeader && authHeader.startsWith("Bearer ")) {
		token = authHeader.replace("Bearer ", "");
	} else {
		// Check query parameters (e.g., wss://server/chat?token=<token>)
		const url = new URL(req.url, `http://${req.headers.host}`);

		token = url.searchParams.get("token") || undefined;
	}
	console.log(token)

	if (!token) {
		oplog.warn("WebSocket authorization failed: No token provided");
		ws.close(1008, "Unauthorized: No token provided");
		return false;
	}

	// Verify the token
	let decoded: any;
	try {
		decoded = jwt.verify(token, getEnvConfig().TOKEN_SECRET) as { user_pid: string; session_id: string };
	} catch (error: any) {
		oplog.error(`WebSocket token verification failed: ${error.message}`);
		ws.close(1008, "Unauthorized: Invalid token");
		return false;
	}

	// Bind the context to the WebSocket connection
	SecretEchoContext.bindWs(ws);
	const secretEchoCtx = SecretEchoContext.getWs(ws);

	// Validate the session
	const session = await dbProvidersInterface.Session.getByPid(secretEchoCtx, decoded.session_id);
	if (session instanceof Error) {
		oplog.error(`Error fetching session for WebSocket: ${session.message}`);
		ws.close(1008, "Unauthorized: Invalid session");
		return false;
	}
	if (!session) {
		oplog.warn("WebSocket authorization failed: Session not found");
		ws.close(1008, "Unauthorized: Session not found");
		return false;
	}

	if (session.expiry_at < new Date()) {
		oplog.error(`Session expired for WebSocket: ${session.session_pid}`);
		ws.close(1008, "Unauthorized: Session expired");
		return false;
	}

	// Store the validated data in the context
	secretEchoCtx.Authorization = `Bearer ${token}`;
	secretEchoCtx.UserPID = decoded.user_id;
	secretEchoCtx.SessionPID = decoded.session_id;

	return true;
}
