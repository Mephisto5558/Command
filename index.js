/**
 * @typedef {import('./commands').BaseCommand}BaseCommand
 * @typedef {import('./commands').SlashCommand}SlashCommand
 * @typedef {import('./commands').PrefixCommand}PrefixCommand
 * @typedef {import('./commands').MixedCommand}MixedCommand*/


module.exports = class SlashCommandCollection {
  client;

  /** @param {import('discord.js').Client<true>}client*/
  constructor(client) {
    this.client = client;
    this.commandManager = client.application.commands;
    this.cache = this.commandManager.cache;
  }

  /** @type {import('.').SlashCommandCollection['edit']}*/
  async edit(command, guildId) {
    await this.commandManager.edit(command.id, command, guildId);
    return command;
  }

  /** @type {import('.').SlashCommandCollection['delete']}*/
  async delete(id, guildId) {
    await this.commandManager.delete(id, guildId);
  }

  /** @type {import('.').SlashCommandCollection['clear']}*/
  async clear(guildId) {
    await this.fetchAll();
    for (const [command] of this.entries()) await this.delete(command, guildId);
  }

  /** @type {import('.').SlashCommandCollection['fetch']}*/
  async fetch(id, guildId) {
    return this.commandManager.fetch(id, { guildId, withLocalizations: true });
  }
};