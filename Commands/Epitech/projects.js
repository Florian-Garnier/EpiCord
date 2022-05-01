const { SlashCommandBuilder } = require('@discordjs/builders')
const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const { getModuleRegisteredActivities, getLogin, getListProjectRegistered, getListProjects, getProjectInformations, registerProject, unregisterProject } = require('../../Services/requests');

module.exports = {
	data: new SlashCommandBuilder().setName('projects').setDescription('Gets the current projects').addStringOption((option) => {
		return option.setName('start').setDescription(`The start date, format is DD MM YYYY, DD MM or DD`).setRequired(false);
	}).addStringOption((option) => {
		return option.setName('end').setDescription(`The end date, format is DD MM YYYY, DD MM or DD`).setRequired(false);
	}).addStringOption((option) => {
		return option.setName('project').setDescription('The project name')
	}).addBooleanOption((option) => {
		return option.setName('registered').setDescription('Show only registered projects when project parameter is empty').setRequired(false)
	}),
	async execute(interaction) {
		const startString = interaction.options.getString('start')
		const endString = interaction.options.getString('end')
		const project = interaction.options.getString('project')
		let registered = interaction.options.getBoolean('registered')
		if (registered === null)
			registered = true
		const start = new Date(Date.now())
		const end = new Date(start.getTime() + (24 * 60 * 60 * 1000))
		const argsStart = startString ? startString.split(' ') : []
		const argsEnd = endString ? endString.split(' ') : []
		argsStart.length == 3 && start.setFullYear(argsStart[2])
		argsStart.length >= 2 && start.setMonth(argsStart[1] - 1)
		argsStart.length >= 1 && start.setDate(argsStart[0])
		argsEnd.length == 3 && end.setFullYear(argsEnd[2])
		argsEnd.length >= 2 && end.setMonth(argsEnd[1] - 1)
		argsEnd.length >= 1 && end.setDate(argsEnd[0])
		const embed = new MessageEmbed().setColor('#0099ff')
		const message = await interaction.deferReply()
		const login = await getLogin(interaction.member.id)
		try {
			if (!project) {
				const data = await (registered ? getListProjectRegistered(login, start, end) : getListProjects(login, start, end))
				const fields = data.map((e) => ({
					name: e.acti_title,
					value: `**${e.title_module}**\n${e.codemodule}`,
					inline: false
				}))
				embed.setTitle('Current projects').setFields(...fields)
				await interaction.editReply({ embeds: [embed] })
			} else {
				const data = await getListProjects(login, start, end)
				const tmp = data.find((e) => e.acti_title.includes(project) || e.codeacti.includes(project))
				const currentProject = await getProjectInformations(login, tmp.codemodule, tmp.codeinstance, tmp.codeacti)
				embed.setTitle(currentProject.title).setDescription(`Start: ${currentProject.begin.substring(8, 10)}/${currentProject.begin.substring(5, 7)} - ${currentProject.begin.substring(11, 16)}
			End of inscription: ${currentProject.end_register.substring(8, 10)}/${currentProject.end_register.substring(5, 7)} - ${currentProject.end_register.substring(11, 16)}
			End: ${currentProject.end.substring(8, 10)}/${currentProject.end.substring(5, 7)} - ${currentProject.end.substring(11, 16)}
			Between ${currentProject.nb_min} and ${currentProject.nb_max} persons`)
					.setURL(`https://intra.epitech.eu/module/${currentProject.scolaryear}/${currentProject.codemodule}/${currentProject.codeinstance}/${currentProject.codeacti}/project/#!/group`)
				const row = new MessageActionRow().addComponents(
					new MessageButton()
						.setCustomId(`register§${currentProject.codemodule}§${currentProject.codeinstance}§${currentProject.codeacti}`)
						.setLabel("Register")
						.setStyle('PRIMARY'),
					new MessageButton()
						.setCustomId(`unregister§${currentProject.codemodule}§${currentProject.codeinstance}§${currentProject.codeacti}`)
						.setLabel("Unregister")
						.setStyle('SECONDARY')
				)
				const message = await interaction.editReply({ embeds: [embed], components: [row] })
				const collector = message.createMessageComponentCollector({ componentType: 'BUTTON', time: 60000 * 5 })
				collector.on('collect', async i => {
					const userLogin = await getLogin(i.user.id);
					const args = i.customId.split('§')
					let res = {}
					if (args[0] == 'register')
						res = await registerProject(userLogin, args[1], args[2], args[3])
					else if (args[0] == 'unregister')
						res = await unregisterProject(userLogin, args[1], args[2], args[3])
						await i.reply(res.status === 200 ? `Successfully ${args[0] == 'register' ? 'Registered' : 'Unregistered'}` : `Error: ${res.statusText}`)
				})
			}
		} catch (e) {
			console.log(e);
			await interaction.editReply('Command failed ! Try to check your arguments')
		}
	}
}