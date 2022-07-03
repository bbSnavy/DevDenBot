import {Command, commandInfo} from '../commands/Commands.js'
import {logger} from '../logging.js'
import {MarkedClient} from '../MarkedClient.js'
import {SetCommand} from '../commands/SetCommand.js'
import {InfoCommand} from '../commands/InfoCommand.js'
import {HotTakeCommand} from '../commands/HotTakeCommand.js'
import {TimeoutCommand} from '../commands/TimeoutCommand.js'
import {REST} from '@discordjs/rest'
import {Routes} from 'discord-api-types/v9'
import {config} from '../Config.js'
import {LeaderboardCommand} from '../commands/LeaderboardCommand.js'
import {MessageContextMenuInteraction} from 'discord.js'
import {LearningCommand} from '../commands/LearningCommand.js'

export const commands = [ SetCommand, InfoCommand, HotTakeCommand,
	TimeoutCommand, LeaderboardCommand, LearningCommand]

const rest = new REST({version: '10'}).setToken(process.env.BOT_TOKEN ?? '')

/**
 * @deprecated
 */
export async function init(client: MarkedClient) {
	if (process.env.UPDATE_COMMANDS) {
		logger.info('Registering interactions')
		await update(client, commands)
		logger.info('Registered interactions')
	}

	const guild = await client.guilds.fetch(config.guildId)
	await guild.commands.fetch()
	await Promise.all(commands.map(async command => {
		const info = await commandInfo(command)
		const slash = guild.commands.cache.find(cmd => cmd.name == info.name)
		if (!slash) {
			logger.error(`Command ${info.name} not found in guild ${config.guildId}`)
			return
		}
		client.commands.set(info.name, command)
		logger.info(`Loaded command: ${info.name}`)
	}))
}

/**
 * @deprecated
 */
export async function update(client: MarkedClient, command: (Command | Command<MessageContextMenuInteraction>)[]) {
	const info = await Promise.all(command.map(
		async cmd => await commandInfo(cmd)
	))
	await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), {
		body: info.map(i => i.toJSON())
	})
}

/**
 * @deprecated
 */
export function handle(client: MarkedClient) {
	client.on('interactionCreate', async interaction => {
		if (!interaction.isCommand() && !interaction.isMessageContextMenu()) return
		const command = client.commands.get(interaction.commandName) as Command<typeof interaction>
		if (!command) return
		try {
			await command.execute(interaction)
		} catch (e) {
			logger.error(e)
			await interaction.reply('There was an internal error')
		}
	})
}
