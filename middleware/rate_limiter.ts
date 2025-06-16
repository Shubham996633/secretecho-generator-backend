import { NextFunction, Request, Response } from "express";
import Redis from "ioredis";
import { getEnvConfig } from "../config/config";
import { ReturnError } from "../models/request_response";
import oplog from "../oplog/oplog";
import { SecretEchoContext } from "./context";

// Redis client setup
const config = getEnvConfig();
const redis = new Redis({
	host: config.REDIS_CLOUD_HOST,
	port: config.REDIS_CLOUD_PORT,
	password: config.REDIS_CLOUD_PASSWORD || undefined,
	username: config.REDIS_CLOUD_USERNAME || undefined,
	tls: config.REDIS_CLOUD_TLS ? {} : undefined,
	enableTLSForSentinelMode: false,
	maxRetriesPerRequest: 3,
	retryStrategy: (times) => Math.min(times * 50, 2000), // Retry on connection failure
});

// Log Redis connection status
redis.on("connect", () => {
	oplog.info("Successfully connected to Redis");
});

redis.on("error", (error) => {
	oplog.error("Redis connection error:", error);
});

// Rate limit configuration (adjusted for testing)
const RATE_LIMIT_WINDOW_MS = 10 * 1000; // 10 seconds window for testing
const MAX_REQUESTS_PER_WINDOW = 45; // Allow only 45 requests per window for testing

export async function RateLimiterMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
	// Skip rate limiting for public routes
	const publicRoutes = ["/api/v1/auth/signup", "/api/v1/auth/login"];
	if (publicRoutes.includes(req.path)) {
		return next();
	}

	const ctx = SecretEchoContext.get(req);
	const userId = ctx.UserPID;

	if (!userId) {
		ReturnError(res, ["Rate limiter: User not identified"], 401);
		return;
	}

	const key = `rate_limit:${userId}`;
	const currentTime = Date.now();

	try {
		// Start a Redis transaction
		const pipeline = redis.pipeline();

		// Add current timestamp to sorted set
		pipeline.zadd(key, currentTime, currentTime.toString());

		// Remove timestamps outside the window
		pipeline.zremrangebyscore(key, 0, currentTime - RATE_LIMIT_WINDOW_MS);

		// Count requests within the window
		pipeline.zcard(key);

		// Set expiration for the key (window duration + buffer)
		pipeline.expire(key, Math.ceil(RATE_LIMIT_WINDOW_MS / 1000) + 1);

		const results = await pipeline.exec();
		const requestCount = results?.[2]?.[1] as number;

		if (requestCount > MAX_REQUESTS_PER_WINDOW) {
			oplog.warn(`Rate limit exceeded for user ${userId}: ${requestCount} requests`);
			ReturnError(res, ["Too Many Requests"], 429);
			return;
		}

		// Add rate limit headers
		res.setHeader("X-RateLimit-Limit", MAX_REQUESTS_PER_WINDOW);
		res.setHeader("X-RateLimit-Remaining", Math.max(0, MAX_REQUESTS_PER_WINDOW - requestCount));
		res.setHeader("X-RateLimit-Reset", Math.ceil((currentTime + RATE_LIMIT_WINDOW_MS) / 1000));

		return next();
	} catch (error: any) {
		oplog.error(`Rate limiter error for user ${userId}: ${error.message}`);
		// Fail open in case of Redis error to avoid blocking legitimate requests
		return next();
	}
}

// Graceful shutdown
process.on("SIGTERM", () => {
	redis.quit();
});
