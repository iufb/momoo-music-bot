const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "help",
  aliases: ["h", "cmd", "command"],
  run: async (client, message) => {
    message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("Commands")
          .setDescription(
            client.commands.map((cmd) => `\`${cmd.name}\``).join(", ")
          )
          .setColor("c2a8c2"),
      ],
    });
  },
};
