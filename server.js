const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

const config = {
	minecraft: {
		host: 'localhost',
		port: 25565
	},
	discord: {
		statusWebhook: 'https://discord.com/api/webhooks/1414715570389254154/fu4IiKcfN1dWasMzrXe_L9LIDHYCRo7Sex9LjafIxbEj6_1bu3FORcLO-CTWs2YF9NM2',
		logsWebhook: 'https://discord.com/api/webhooks/1414716963271217295/qP2Oh7lHaRaRQdSElVxg3jC_-3QeAMyLYNqvXMXAIOutDZLJMcCK3MRR0McdwKK94GBT'
	},
	server: {
		path: './server',
		jarFile: 'paper.jar',
		javaArgs: ['-Xmx2G', '-Xms1G']
	}
};

let minecraftProcess = null;
let serverStatus = 'offline';
let lastStatus = 'offline';

app.use(express.json());

async function downloadPaperMC() {
return new Promise((resolve, reject) => {
	console.log('Fetching latest PaperMC version...');

	https.get('https://papermc.io/api/v2/projects/paper', (res) => {
			let data = '';
			res.on('data', (chunk) => data += chunk);
			res.on('end', () => {
					try {
						const projectInfo = JSON.parse(data);
						const latestVersion = projectInfo.versions[projectInfo.versions.length - 1];

						https.get(`https:
                        let buildData = '';
                        res.on('data', (chunk) => buildData += chunk);
                        res.on('end', () => {
                            try {
                                const versionInfo = JSON.parse(buildData);
                                const latestBuild = versionInfo.builds[versionInfo.builds.length - 1];

                                const downloadUrl = `
							https:
							const jarPath = path.join(config.server.path, config.server.jarFile);

							console.log(`Downloading PaperMC ${latestVersion} build ${latestBuild}...`);

							const file = fs.createWriteStream(jarPath); https.get(downloadUrl, (response) => {
								response.pipe(file);

								file.on('finish', () => {
									file.close();
									console.log('PaperMC downloaded successfully!');
									resolve();
								});
							}).on('error', (err) => {
								fs.unlink(jarPath, () => {});
								reject(err);
							});
						}
						catch (error) {
							reject(error);
						}
					});
			}).on('error', reject);
	}
	catch (error) {
		reject(error);
	}
});
}).on('error', reject);
});
}

async function initServer() {
	try {

		if (!fs.existsSync(config.server.path)) {
			console.log('Creating server directory...');
			fs.mkdirSync(config.server.path, {
				recursive: true
			});
		}

		const jarPath = path.join(config.server.path, config.server.jarFile);
		if (!fs.existsSync(jarPath)) {
			console.log('PaperMC jar not found, downloading...');
			await downloadPaperMC();
		}

		const serverPropertiesPath = path.join(config.server.path, 'server.properties');
		if (!fs.existsSync(serverPropertiesPath)) {
			console.log('Creating server.properties...');
			let defaultProperties = `#Minecraft server properties
online-mode=true
server-port=25565
max-players=20
motd=A Minecraft Server
view-distance=10`;
			fs.writeFileSync(serverPropertiesPath, defaultProperties);
		}

		const eulaPath = path.join(config.server.path, 'eula.txt');
		if (!fs.existsSync(eulaPath)) {
			console.log('Creating eula.txt...');
			fs.writeFileSync(eulaPath, 'eula=true\n');
		}

		console.log('Minecraft server backend initialized');
	} catch (error) {
		console.error('Error initializing server:', error);
	}
}

function startMinecraftServer() {
	if (minecraftProcess) {
		return {
			success: false,
			message: 'Server is already running'
		};
	}

	try {
		const jarPath = path.join(config.server.path, config.server.jarFile);

		if (!fs.existsSync(jarPath)) {
			return {
				success: false,
				message: 'Server jar file not found'
			};
		}

		const args = ['-jar', ...config.javaArgs, config.server.jarFile, 'nogui'];
		minecraftProcess = spawn('java', args, {
			cwd: config.server.path
		});

		minecraftProcess.stdout.on('data', (data) => {
			const message = data.toString();
			console.log(message);
			sendToDiscord(message, config.discord.logsWebhook);

			if (message.includes('Done') && message.includes('For help, type "help"')) {
				serverStatus = 'online';
				if (lastStatus !== 'online') {
					sendToDiscord(`🟢 Minecraft server is now online \`${config.minecraft.host}:${config.minecraft.port}\``, config.discord.statusWebhook);
					lastStatus = 'online';
				}
			}
		});

		minecraftProcess.stderr.on('data', (data) => {
			const message = data.toString();
			console.error(message);
			sendToDiscord(`❌ ${message}`, config.discord.logsWebhook);
		});

		minecraftProcess.on('close', (code) => {
			console.log(`Minecraft server process exited with code ${code}`);
			serverStatus = 'offline';
			minecraftProcess = null;

			if (lastStatus !== 'offline') {
				if (code === 0) {
					sendToDiscord('🔴 Minecraft server has been stopped', config.discord.statusWebhook);
				} else {
					sendToDiscord('💥 Minecraft server has crashed!', config.discord.statusWebhook);
				}
				lastStatus = 'offline';
			}
		});

		return {
			success: true,
			message: 'Server starting...'
		};
	} catch (error) {
		console.error('Error starting server:', error);
		return {
			success: false,
			message: error.message
		};
	}
}

function stopMinecraftServer() {
	if (!minecraftProcess) {
		return {
			success: false,
			message: 'Server is not running'
		};
	}

	try {

		minecraftProcess.stdin.write('stop\n');
		return {
			success: true,
			message: 'Server stopping...'
		};
	} catch (error) {
		console.error('Error stopping server:', error);
		return {
			success: false,
			message: error.message
		};
	}
}

function sendToDiscord(message, webhookUrl) {

	if (message.length > 2000) {
		message = message.substring(0, 1997) + '...';
	}

	if (!message || message.trim().length === 0) {
		return;
	}

	const skipPatterns = [
		/Can't keep up!/,
		/logged in with entity id/,
		/joined the game/,
		/left the game/
	];

	if (skipPatterns.some(pattern => pattern.test(message))) {
		return;
	}

	axios.post(webhookUrl, {
			content: message,
			username: 'Minecraft Server',
			avatar_url: 'https://example.com/creeper.jpg'
		})
		.catch(error => {
			console.error('Error sending message to Discord:', error);
		});
}

app.get('/api/status', (req, res) => {
	res.json({
		status: serverStatus,
		pid: minecraftProcess ? minecraftProcess.pid : null
	});
});

app.post('/api/start', (req, res) => {
	const result = startMinecraftServer();
	res.json(result);
});

app.post('/api/stop', (req, res) => {
	const result = stopMinecraftServer();
	res.json(result);
});

app.listen(PORT, () => {
	console.log(`Minecraft server backend running on port ${PORT}`);
	initServer();
});

process.on('SIGINT', () => {
	console.log('Shutting down...');
	if (minecraftProcess) {
		stopMinecraftServer();
		setTimeout(() => process.exit(0), 5000);
	} else {
		process.exit(0);
	}
});