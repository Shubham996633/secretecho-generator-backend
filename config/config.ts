import dotenv from "dotenv";

let envLoaded = false;

export const getEnvConfig = () => {
	if (!envLoaded) {
		dotenv.config();
		envLoaded = true;
	}

	const APP_NAME = process.env.APP_NAME ?? "";
	const APP_ENV = process.env.APP_ENV ?? "";
	const APP_PORT = parseInt(process.env.APP_PORT ?? "3000");
	const TOKEN_SECRET = process.env.TOKEN_SECRET ?? "your-secret-key";
	const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
	const MONGO_URI = process.env.MONGO_URI ?? "mongodb://localhost:27017/secret-echo";
	const REDIS_CLOUD_HOST = process.env.REDIS_CLOUD_HOST ?? "localhost";
	const REDIS_CLOUD_PORT = parseInt(process.env.REDIS_CLOUD_PORT ?? "6379");
	const REDIS_CLOUD_USERNAME = process.env.REDIS_CLOUD_USERNAME ?? "";
	const REDIS_CLOUD_PASSWORD = process.env.REDIS_CLOUD_PASSWORD ?? "";
	const REDIS_CLOUD_TLS = process.env.REDIS_CLOUD_TLS === "true";

	const config = {
		APP_NAME,
		APP_ENV,
		APP_PORT,
		TOKEN_SECRET,
		GEMINI_API_KEY,
		MONGO_URI,
		REDIS_CLOUD_HOST,
		REDIS_CLOUD_PORT,
		REDIS_CLOUD_USERNAME,
		REDIS_CLOUD_PASSWORD,
		REDIS_CLOUD_TLS,
	};

	return config;
};
