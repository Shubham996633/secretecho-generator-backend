import WebSocket from "ws";
import { getEnvConfig } from "../config/config";
import { SecretEchoContext } from "../middleware/context";
import { getErrorMessage } from "../oplog/error";
import oplog from "../oplog/oplog";
import { providersInterface } from "../providers/interface";

const GEMINI_WS_URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${
	getEnvConfig().GEMINI_API_KEY
}`;

const GEMINI_MODEL = "models/gemini-2.0-flash-exp";

// System prompt for the plugin generator
const PLUGIN_GENERATOR_PROMPT = `
You are a WooCommerce Plugin Generator, an AI assistant that creates single-file WooCommerce plugins based on merchant requests. Follow these guidelines:
1. Generate plugins as single PHP files with proper WordPress plugin headers (e.g., Plugin Name, Description, Version).
2. Use WordPress/WooCommerce functions and hooks (e.g., add_action, add_filter, wp_mail) to implement functionality.
3. Ensure the code is secure: sanitize inputs, escape outputs, and follow WordPress coding standards.
4. If the request is unclear, ask the merchant clarifying questions (e.g., "What color would you like the button to be?").
5. Format the response as a PHP code block that can be directly saved as a .php file.
6. Do not include explanations or additional text outside the PHP code block unless asking a clarifying question.
7. When the user indicates the plugin is complete (e.g., by saying "Looks good" or "Finalize"), prefix your response with "FINAL_PLUGIN:" to indicate the final plugin code.

Example Request: "Change the color of my add to cart button to blue."
Example Output:
<?php
/**
 * Plugin Name: WooCommerce Add to Cart Button Color
 * Description: Changes the add to cart button color to blue
 * Version: 1.0.0
 */
if (!defined('ABSPATH')) exit;
add_action('wp_head', 'change_add_to_cart_button_color');
function change_add_to_cart_button_color() {
    echo '<style>.single_add_to_cart_button { background-color: blue !important; color: white !important; }</style>';
}
`;

// Types
interface Part {
	text?: string;
	inlineData?: { mimeType: string; data: string };
}
interface Content {
	role: string;
	parts: Part[];
}
interface ClientContentMessage {
	clientContent: { turns: Content[]; turnComplete: boolean };
}
interface ServerContent {
	modelTurn?: { parts: Part[] };
	turnComplete?: boolean;
	interrupted?: boolean;
}
interface LiveIncomingMessage {
	serverContent?: ServerContent;
	setupComplete?: {};
}
interface LiveConfig {
	model: string;
	generationConfig?: {
		responseModalities: "text" | "audio" | "image";
	};
	systemInstruction?: {
		parts: [{ text: string }];
	};
}
interface SetupMessage {
	setup: LiveConfig;
}
interface ClientMessage {
	message: string;
}
interface ChatMessage {
	role: "user" | "plugin_generator";
	content: string;
	timestamp: string;
}

function isServerContentMessage(message: LiveIncomingMessage): message is { serverContent: ServerContent } {
	return "serverContent" in message;
}
function isModelTurn(serverContent: ServerContent): serverContent is { modelTurn: { parts: Part[] } } {
	return "modelTurn" in serverContent;
}
function isTurnComplete(serverContent: ServerContent): boolean {
	return !!serverContent.turnComplete;
}
function isSetupCompleteMessage(message: LiveIncomingMessage): message is { setupComplete: {} } {
	return "setupComplete" in message;
}

// Basic validation for generated plugin code
function validatePluginCode(code: string): boolean {
	// Check for WordPress plugin header
	if (!code.includes("<?php") || !code.includes("Plugin Name:")) {
		return false;
	}
	// Check for common security issues (basic checks)
	if (code.includes("eval(") || code.includes("exec(")) {
		return false;
	}
	return true;
}

export class PluginGeneratorService {
	private clientWs: WebSocket;
	private geminiWs: WebSocket | null = null;
	private responseBuffer: string[] = [];
	private pendingMessages: Array<{ message: string }> = [];
	private setupReceived: boolean = false;
	private initialResponseReceived: boolean = false;
	private pluginId: string;
	private userPID: string;
	private ctx: SecretEchoContext;

	constructor(clientWs: WebSocket, pluginId: string) {
		this.clientWs = clientWs;
		this.pluginId = pluginId;
		this.ctx = SecretEchoContext.getWs(clientWs);
		this.userPID = this.ctx.UserPID;
		this.setupClientWebSocket();
	}

	private setupClientWebSocket() {
		this.clientWs.on("message", async (message: Buffer) => {
			try {
				const rawMessage = message.toString();
				oplog.info(`Received raw message from client: ${rawMessage}`);
				const data: ClientMessage = JSON.parse(rawMessage);
				if (!data.message) {
					throw new Error("Message field is missing in the request");
				}
				if (typeof data.message !== "string") {
					throw new Error("Message field must be a string");
				}
				if (data.message.trim() === "") {
					throw new Error("Message field cannot be empty");
				}
				oplog.info(`Received valid client message: ${data.message}`);
				await this.handleClientMessage(data);
			} catch (error) {
				oplog.error(`Error processing client message: ${getErrorMessage(error)}`);
				this.clientWs.send(JSON.stringify({ error: `Invalid message format: ${getErrorMessage(error)}` }));
			}
		});

		this.clientWs.on("close", (code, reason) => {
			oplog.info(`Client WebSocket closed with code ${code}, reason: ${reason.toString()}`);
			this.geminiWs?.close();
		});

		this.clientWs.on("error", (error) => {
			oplog.error(`Client WebSocket error: ${getErrorMessage(error)}`);
			this.clientWs.send(JSON.stringify({ error: "Client WebSocket error" }));
		});
	}

	private async waitForWebSocketOpen(ws: WebSocket): Promise<void> {
		return new Promise((resolve, reject) => {
			if (ws.readyState === WebSocket.OPEN) {
				resolve();
				return;
			}
			ws.on("open", () => resolve());
			ws.on("error", (error) => reject(error));
			ws.on("close", () => reject(new Error("WebSocket closed while waiting to connect")));
		});
	}

	private async connectToGemini(): Promise<void> {
		try {
			this.geminiWs = new WebSocket(GEMINI_WS_URL);
			oplog.info(`Connecting to Gemini Live API: ${GEMINI_WS_URL}`);

			this.geminiWs.on("open", () => {
				oplog.info("Connected to Gemini Live API WebSocket");
				this.clientWs.send(JSON.stringify({ status: "connected" }));

				const setupMessage: SetupMessage = {
					setup: {
						model: GEMINI_MODEL,
						generationConfig: { responseModalities: "text" },
						systemInstruction: { parts: [{ text: PLUGIN_GENERATOR_PROMPT }] },
					},
				};
				oplog.info(`Sending setup message to Gemini Live API`);
				this.geminiWs?.send(JSON.stringify(setupMessage));
			});

			this.geminiWs.on("message", (data: Buffer) => {
				try {
					const response: LiveIncomingMessage = JSON.parse(data.toString());
					oplog.info(`Received message from Gemini Live API`);
					this.receive(response);
				} catch (error) {
					oplog.error(`Error processing Gemini response: ${getErrorMessage(error)}`);
					this.clientWs.send(JSON.stringify({ error: "Error processing Gemini response" }));
				}
			});

			this.geminiWs.on("close", (code, reason) => {
				oplog.info(`Gemini Live API WebSocket closed with code ${code}, reason: ${reason.toString()}`);
				this.setupReceived = false;
				this.initialResponseReceived = false;
				this.clientWs.send(
					JSON.stringify({ error: `Gemini WebSocket closed with code ${code}, reason: ${reason.toString()}` })
				);
			});

			this.geminiWs.on("error", (error) => {
				oplog.error(`Gemini Live API WebSocket error: ${getErrorMessage(error)}`);
				this.setupReceived = false;
				this.initialResponseReceived = false;
				this.clientWs.send(JSON.stringify({ error: `Gemini connection error: ${getErrorMessage(error)}` }));
			});

			await this.waitForWebSocketOpen(this.geminiWs);
		} catch (error) {
			oplog.error(`Error connecting to Gemini Live API: ${getErrorMessage(error)}`);
			this.setupReceived = false;
			this.initialResponseReceived = false;
			this.clientWs.send(JSON.stringify({ error: `Failed to connect to Gemini API: ${getErrorMessage(error)}` }));
			throw error;
		}
	}

	private async receive(response: LiveIncomingMessage) {
		if (isSetupCompleteMessage(response)) {
			oplog.info("Setup complete message received from Gemini Live API");
			this.setupReceived = true;
			this.clientWs.send(JSON.stringify({ setupComplete: {} }));

			// Fetch and send chat history or send a default greeting
			try {
				oplog.info(`Fetching chat history for user ${this.userPID}, plugin ${this.pluginId}`);
				const chatHistory = await providersInterface.PluginGenerators.getPluginGeneratorChatHistory(
					this.ctx,
					this.userPID,
					this.pluginId
				);
				if (chatHistory instanceof Error) {
					oplog.error(`Failed to fetch chat history: ${getErrorMessage(chatHistory)}`);
					this.clientWs.send(
						JSON.stringify({ error: `Failed to fetch chat history: ${getErrorMessage(chatHistory)}` })
					);
					return;
				}
				oplog.info(`Chat history length: ${chatHistory.length}`);
				if (chatHistory.length > 0) {
					const historyPrompt =
						"This is the previous chat context, and if you don't tell user you know their history just keep it in mind and it will help you generating next response:\n";
					const historyMessage = historyPrompt + JSON.stringify(chatHistory);
					oplog.info(`Sending chat history to Gemini Live API: ${historyMessage}`);
					this.send({ message: historyMessage }, false); // Don't save to database
				} else {
					// No chat history: Send a default greeting to initialize Gemini API
					const defaultGreeting =
						"Introduce yourself as a WooCommerce Plugin Generator and ask what functionality the user would like to add.";
					oplog.info(`No chat history found, sending default greeting to Gemini Live API: ${defaultGreeting}`);
					this.send({ message: defaultGreeting }, true, false); // Save to database, do NOT skip client response
					oplog.info("Default greeting sent to Gemini Live API");
				}
			} catch (error) {
				oplog.error(`Failed to fetch chat history: ${getErrorMessage(error)}`);
				this.clientWs.send(JSON.stringify({ error: `Failed to fetch chat history: ${getErrorMessage(error)}` }));
			}
			return;
		}

		if (isServerContentMessage(response)) {
			const { serverContent } = response;
			oplog.info(`Received server content: ${JSON.stringify(serverContent)}`);
			if (isModelTurn(serverContent)) {
				let parts: Part[] = serverContent.modelTurn.parts;
				oplog.info(`Model turn parts: ${JSON.stringify(parts)}`);
				const textParts = parts.filter((p) => !p.inlineData && p.text);

				if (!textParts.length) {
					oplog.info("No text parts in model turn, skipping");
					return;
				}

				textParts.forEach((part) => {
					if (part.text) {
						this.responseBuffer.push(part.text);
						oplog.info(`Buffering response part: ${part.text}`);
					}
				});
			}

			if (isTurnComplete(serverContent)) {
				const fullResponse = this.responseBuffer.join("");
				this.responseBuffer = [];
				oplog.info(`Turn complete, full response: ${fullResponse}`);

				// Check if this is the final plugin code
				if (fullResponse.startsWith("FINAL_PLUGIN:")) {
					const pluginCode = fullResponse.replace("FINAL_PLUGIN:", "").trim();
					if (!validatePluginCode(pluginCode)) {
						oplog.error("Generated plugin code failed validation");
						this.clientWs.send(JSON.stringify({ error: "Generated plugin code is invalid or unsafe" }));
						this.send(
							{
								message:
									"The generated plugin code is invalid or unsafe. Please revise it following WordPress coding standards and security best practices.",
							},
							false
						);
						return;
					}

					// Save the final plugin code to the database
					try {
						await providersInterface.PluginGenerators.saveGeneratedPlugin(
							this.ctx,
							this.userPID,
							this.pluginId,
							pluginCode
						);
						oplog.info(`Saved final plugin code for user ${this.userPID}, plugin ${this.pluginId}`);
						this.clientWs.send(JSON.stringify({ response: pluginCode, isFinal: true }));
					} catch (error) {
						oplog.error(`Failed to save final plugin code: ${getErrorMessage(error)}`);
						this.clientWs.send(
							JSON.stringify({ error: `Failed to save final plugin code: ${getErrorMessage(error)}` })
						);
					}
					return;
				}

				// Handle initial response differently
				if (!this.initialResponseReceived) {
					const initialMessage = fullResponse;
					oplog.info(`Sending initial response to client: ${initialMessage}`);
					this.clientWs.send(JSON.stringify({ response: initialMessage }));

					// Save initial response to database
					try {
						await providersInterface.PluginGenerators.savePluginGeneratorMessage(
							this.ctx,
							this.userPID,
							this.pluginId,
							initialMessage,
							"plugin_generator"
						);
						oplog.info(`Saved initial plugin generator message for user ${this.userPID}, plugin ${this.pluginId}`);
					} catch (error) {
						oplog.error(`Failed to save initial plugin generator message: ${getErrorMessage(error)}`);
						this.clientWs.send(
							JSON.stringify({ error: `Failed to save initial plugin generator message: ${getErrorMessage(error)}` })
						);
					}

					this.initialResponseReceived = true;
					oplog.info("Initial response processed, processing pending messages");
					this.processPendingMessages();
				} else {
					// Handle regular plugin generator responses
					oplog.info(`Sending plugin generator response to client: ${fullResponse}`);
					this.clientWs.send(JSON.stringify({ response: fullResponse }));

					// Save response to database
					try {
						await providersInterface.PluginGenerators.savePluginGeneratorMessage(
							this.ctx,
							this.userPID,
							this.pluginId,
							fullResponse,
							"plugin_generator"
						);
						oplog.info(`Saved plugin generator message for user ${this.userPID}, plugin ${this.pluginId}`);
					} catch (error) {
						oplog.error(`Failed to save plugin generator message: ${getErrorMessage(error)}`);
						this.clientWs.send(
							JSON.stringify({ error: `Failed to save plugin generator message: ${getErrorMessage(error)}` })
						);
					}
				}
			}
		} else {
			oplog.info(`Received unmatched message: ${JSON.stringify(response)}`);
		}
	}

	private processPendingMessages() {
		while (this.pendingMessages.length > 0) {
			const data = this.pendingMessages.shift();
			if (data && this.geminiWs && this.geminiWs.readyState === WebSocket.OPEN) {
				this.send(data);
			}
		}
	}

	private send(data: { message: string }, saveToDatabase: boolean = true, skipClientResponse: boolean = false) {
		const parts: Part[] = [{ text: data.message }];
		const content: Content = {
			role: "user",
			parts,
		};
		const clientContentRequest: ClientContentMessage = {
			clientContent: {
				turns: [content],
				turnComplete: true,
			},
		};

		if (!this.geminiWs || this.geminiWs.readyState !== WebSocket.OPEN || !this.setupReceived) {
			oplog.error("Cannot send message: Gemini WebSocket is not connected or setup not complete");
			this.clientWs.send(JSON.stringify({ error: "Gemini WebSocket is not connected or setup not complete" }));
			return;
		}

		oplog.info(`Sending message to Gemini Live API: ${JSON.stringify(clientContentRequest)}`);
		this.geminiWs.send(JSON.stringify(clientContentRequest));

		// Save to database if specified
		if (saveToDatabase && !skipClientResponse) {
			try {
				providersInterface.PluginGenerators.savePluginGeneratorMessage(
					this.ctx,
					this.userPID,
					this.pluginId,
					data.message,
					"user"
				);
				oplog.info(`Saved user message for user ${this.userPID}, plugin ${this.pluginId}`);
			} catch (error) {
				oplog.error(`Failed to save user message: ${getErrorMessage(error)}`);
				this.clientWs.send(JSON.stringify({ error: `Failed to save user message: ${getErrorMessage(error)}` }));
			}
		}
	}

	private async handleClientMessage(data: { message: string }) {
		if (!this.geminiWs || this.geminiWs.readyState !== WebSocket.OPEN || !this.setupReceived) {
			if (!this.geminiWs || this.geminiWs.readyState === WebSocket.CLOSED) {
				oplog.info("Initiating Gemini WebSocket connection for message");
				await this.connectToGemini();
			}
			oplog.info(`Queuing message while Gemini WebSocket is connecting or setup is pending: ${data.message}`);
			this.pendingMessages.push(data);
			return;
		}

		// Queue message if initial response not received
		if (!this.initialResponseReceived) {
			oplog.info(`Queuing message until initial response is received: ${data.message}`);
			this.pendingMessages.push(data);
			return;
		}

		this.send(data);
	}
}
