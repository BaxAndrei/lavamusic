import { Event, Lavamusic, Context } from "../../structures/index.js";
import { CommandInteraction, Interaction, Collection, ChannelType, InteractionType, PermissionFlagsBits } from "discord.js";

export default class InteractionCreate extends Event {
    constructor(client: Lavamusic, file: string) {
        super(client, file, {
            name: "interactionCreate",
        });
    }
    public async run(interaction: Interaction | CommandInteraction | any): Promise<void> {

        if (interaction.type === InteractionType.ApplicationCommand) {
           const { commandName } = interaction;
            const command = this.client.commands.get(interaction.commandName);
            if (!command) return;
            const ctx = new Context(interaction, interaction.options.data);
            ctx.setArgs(interaction.options.data as any);
            if (!interaction.inGuild() || !interaction.channel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.ViewChannel)) return;

            if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.SendMessages)) {
                return await interaction.member.send({ content: `I don't have **\`SendMessage\`** permission in \`${interaction.guild.name}\`\nchannel: <#${interaction.channelId}>` }).catch(() => { });
            }

            if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.EmbedLinks)) return await interaction.reply({ content: 'I don\'t have **`\EmbedLinks\`** permission.' });

            if (command.permissions) {
                if (command.permissions.client) {
                    if (!interaction.guild.members.me.permissions.has(command.permissions.client)) return await interaction.reply({ content: 'I don\'t have enough permissions to execute this command.' });
                }

                if (command.permissions.user) {
                    if (!interaction.member.permissions.has(command.permissions.user)) {
                        await interaction.reply({ content: 'You don\'t have enough permissions to use this command.', ephemeral: true });
                        return;
                    }

                }
                if (command.permissions.dev) {
                    if (this.client.config.owners) {
                        const findDev = this.client.config.owners.find((x) => x === interaction.user.id);
                        if (!findDev) return;
                    }
                }
            }
            if (command.player) {
                if (command.player.voice) {
                    if (!interaction.member.voice.channel) return await interaction.reply({ content: `You must be connected to a voice channel to use this \`${command.name}\` command.` });

                    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.Speak)) return await interaction.reply({ content: `I don't have \`CONNECT\` permissions to execute this \`${command.name}\` command.` });

                    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.Speak)) return await interaction.reply({ content: `I don't have \`SPEAK\` permissions to execute this \`${command.name}\` command.` });

                    if (interaction.member.voice.channel.type === ChannelType.GuildStageVoice && !interaction.guild.members.me.permissions.has(PermissionFlagsBits.RequestToSpeak)) return await interaction.reply({ content: `I don't have \`REQUEST TO SPEAK\` permission to execute this \`${command.name}\` command.` });

                    if (interaction.guild.members.me.voice.channel) {
                        if (interaction.guild.members.me.voice.channelId !== interaction.member.voice.channelId) return await interaction.reply({ content: `You are not connected to ${interaction.guild.members.me.voice.channel} to use this \`${command.name}\` command.` });
                    }
                }
                if (command.player.active) {
                    if (!this.client.queue.get(interaction.guildId)) return await interaction.reply({ content: 'Nothing is playing right now.' });
                    if (!this.client.queue.get(interaction.guildId).queue) return await interaction.reply({ content: 'Nothing is playing right now.' });
                    if (!this.client.queue.get(interaction.guildId).current) return await interaction.reply({ content: 'Nothing is playing right now.' });
                }
            }
            if (!this.client.cooldowns.has(commandName)) {
                this.client.cooldowns.set(commandName, new Collection());
            }
            const now = Date.now();
            const timestamps = this.client.cooldowns.get(commandName);

            const cooldownAmount = Math.floor(command.cooldown || 5) * 1000;
            if (!timestamps.has(interaction.author.id)) {
                timestamps.set(interaction.author.id, now);
                setTimeout(() => timestamps.delete(interaction.author.id), cooldownAmount);
            } else {
                const expirationTime = timestamps.get(interaction.author.id) + cooldownAmount;
                const timeLeft = (expirationTime - now) / 1000;
                if (now < expirationTime && timeLeft > 0.9) {
                    return interaction.reply({ content: `Please wait ${timeLeft.toFixed(1)} more second(s) before reusing the \`${commandName}\` command.` });
                }
                timestamps.set(interaction.author.id, now);
                setTimeout(() => timestamps.delete(interaction.author.id), cooldownAmount);
            }
            try {
                await command.run(this.client, ctx, ctx.args);
            } catch (error) {
                this.client.logger.error(error);
                await interaction.reply({ content: `An error occured: \`${error}\`` })
            }
        }
    }
};

/**
 * Project: lavamusic
 * Author: Blacky
 * Company: Coders
 * Copyright (c) 2023. All rights reserved.
 * This code is the property of Coder and may not be reproduced or
 * modified without permission. For more information, contact us at
 * https://discord.gg/ns8CTk9J3e
 */