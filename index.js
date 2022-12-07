require("dotenv").config();
const { DisTube } = require("distube");
const Discord = require("discord.js");
const client = new Discord.Client({
  intents: [
    Discord.GatewayIntentBits.Guilds,
    Discord.GatewayIntentBits.GuildMessages,
    Discord.GatewayIntentBits.GuildVoiceStates,
    Discord.GatewayIntentBits.MessageContent,
  ],
});
const fs = require("fs");
const config = require("./config.json");
const { SpotifyPlugin } = require("@distube/spotify");
const { SoundCloudPlugin } = require("@distube/soundcloud");
const { YtDlpPlugin } = require("@distube/yt-dlp");

client.config = require("./config.json");
client.distube = new DisTube(client, {
  leaveOnStop: false,
  searchSongs: 5,
  emitNewSongOnly: true,
  emitAddSongWhenCreatingQueue: false,
  emitAddListWhenCreatingQueue: false,
  plugins: [
    new SpotifyPlugin({
      emitEventsAfterFetching: true,
    }),
    new SoundCloudPlugin(),
    new YtDlpPlugin(),
  ],
});
client.commands = new Discord.Collection();
client.aliases = new Discord.Collection();
client.emotes = config.emoji;

fs.readdir("./commands/", (err, files) => {
  if (err) return console.log("Could not find any commands!");
  const jsFiles = files.filter((f) => f.split(".").pop() === "js");
  if (jsFiles.length <= 0) return console.log("Could not find any commands!");
  jsFiles.forEach((file) => {
    const cmd = require(`./commands/${file}`);
    console.log(`Loaded ${file}`);
    client.commands.set(cmd.name, cmd);
    if (cmd.aliases)
      cmd.aliases.forEach((alias) => client.aliases.set(alias, cmd.name));
  });
});

client.on("ready", () => {
  console.log(`${client.user.tag} is ready to play music.`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;
  const prefix = config.prefix;
  if (!message.content.startsWith(prefix)) return;
  const args = message.content.slice(prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();
  const cmd =
    client.commands.get(command) ||
    client.commands.get(client.aliases.get(command));
  if (!cmd) return;
  if (cmd.inVoiceChannel && !message.member.voice.channel) {
    return message.channel.send(
      `${client.emotes.error} | You must be in a voice channel!`
    );
  }
  try {
    cmd.run(client, message, args);
  } catch (e) {
    console.error(e);
    message.channel.send(`${client.emotes.error} | Error: \`${e}\``);
  }
});

const status = (queue) =>
  `Volume: \`${queue.volume}%\` | Loop: \`${
    queue.repeatMode
      ? queue.repeatMode === 2
        ? "All Queue"
        : "This Song"
      : "Off"
  }\ \``;
client.distube
  .on("playSong", (queue, song) =>
    queue.textChannel.send({
      embeds: [
        new Discord.EmbedBuilder()
          .setTitle("Playing song")
          .setDescription(
            `${client.emotes.play} | Playing \`${song.name}\` - \`${
              song.formattedDuration
            }\`\nRequested by: ${song.user}\n${status(queue)}`
          )
          .setColor("c2a8c2"),
      ],
    })
  )
  .on("addSong", (queue, song) =>
    queue.textChannel.send({
      embeds: [
        new Discord.EmbedBuilder()
          .setTitle("Added song:")
          .setDescription(
            `${client.emotes.success} | Added ${song.name} - \`${song.formattedDuration}\` to the queue by ${song.user}`
          )
          .setColor("c2a8c2"),
      ],
    })
  )
  .on("addList", (queue, playlist) =>
    queue.textChannel.send({
      embeds: [
        new Discord.EmbedBuilder()
          .setTitle("Added playlist:")
          .setDescription(
            `${client.emotes.success} | Added \`${playlist.name}\` playlist (${
              playlist.songs.length
            } songs) to queue\n${status(queue)}`
          )
          .setColor("c2a8c2"),
      ],
    })
  )
  .on("searchNoResult", (message, query) =>
    message.channel.send({
      embeds: [
        new Discord.EmbedBuilder()
          .setTitle("No results")
          .setDescription(
            `${client.emotes.error} | No result found for \`${query}\`!`
          )
          .setColor("Red"),
      ],
    })
  )
  .on("finish", (queue) =>
    queue.textChannel.send({
      embeds: [
        new Discord.EmbedBuilder()
          .setDescription(`${client.emotes.finish} | Finished!`)
          .setColor("c2a8c2"),
      ],
    })
  )
  .on("searchResult", (message, result) => {
    let i = 0;
    message.channel.send({
      embeds: [
        new Discord.EmbedBuilder()
          .setTitle("Search list")
          .setDescription(
            `**Choose an option from below**\n${result
              .map(
                (song) =>
                  `**${++i}**. ${song.name} - \`${song.formattedDuration}\``
              )
              .join("\n")}\n*Enter anything else or wait 60 seconds to cancel*`
          )
          .setColor("#c2a8c2"),
      ],
    });
  })
  .on("searchCancel", (message) =>
    message.channel.send(`${client.emotes.error} | Searching canceled`)
  )
  .on("searchInvalidAnswer", (message) =>
    message.channel.send(
      `${client.emotes.error} | Invalid answer! You have to enter the number in the range of the results`
    )
  )
  .on("searchDone", () => {});

client.login(process.env.TOKEN);
