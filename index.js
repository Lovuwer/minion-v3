// index.js

const {
  Client,
  GatewayIntentBits,
  REST,
  Routes
} = require("discord.js");

// ==========================
// Env variables
// ==========================

// required for the bot to actually run
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID      = process.env.GUILD_ID;
const ADMIN_ROLE_ID = process.env.ADMIN_ROLE_ID;

// optional / for future features – we still read them so Railway is happy
const STAFF_ROLE_ID            = process.env.STAFF_ROLE_ID || "";
const ADMIN_APPROVAL_CHANNEL_ID = process.env.ADMIN_APPROVAL_CHANNEL_ID || "";
const MEDIA_CATEGORY_ID        = process.env.MEDIA_CATEGORY_ID || "";
const REPORT_CATEGORY_ID       = process.env.REPORT_CATEGORY_ID || "";
const SUPPORT_CATEGORY_ID      = process.env.SUPPORT_CATEGORY_ID || "";
const TICKET_PANEL_CHANNEL_ID  = process.env.TICKET_PANEL_CHANNEL_ID || "";
const TRANSCRIPT_LOG_CHANNEL_ID = process.env.TRANSCRIPT_LOG_CHANNEL_ID || "";
const POSTGRES_URL             = process.env.POSTGRES_URL || "";

// basic sanity check
if (!DISCORD_TOKEN || !GUILD_ID || !ADMIN_ROLE_ID) {
  console.error("❌ Missing one or more REQUIRED env vars: DISCORD_TOKEN, GUILD_ID, ADMIN_ROLE_ID");
  process.exit(1);
}

console.log("🔧 Environment loaded:", {
  DISCORD_TOKEN: !!DISCORD_TOKEN,
  GUILD_ID: !!GUILD_ID,
  ADMIN_ROLE_ID: !!ADMIN_ROLE_ID,
  STAFF_ROLE_ID: !!STAFF_ROLE_ID,
});

// ==========================
// Discord client
// ==========================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ],
});

// Slash command definition
const commands = [
  {
    name: "giverole",
    description: "Give a role to a user (admin/staff only)",
    options: [
      {
        name: "user",
        description: "User to give the role to",
        type: 6, // USER
        required: true
      },
      {
        name: "role",
        description: "Role to give",
        type: 8, // ROLE
        required: true
      }
    ]
  }
];

// ==========================
// Register slash commands on ready
// ==========================

client.once("ready", async () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);

  const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

  try {
    console.log("🛠️ Registering guild slash commands…");
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, GUILD_ID),
      { body: commands }
    );
    console.log("✅ Slash commands registered.");
  } catch (err) {
    console.error("❌ Failed to register slash commands:", err);
  }
});

// ==========================
// Interaction handler
// ==========================

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "giverole") return;

  if (!interaction.guild) {
    return interaction.reply({
      content: "❌ This command can only be used in a server.",
      ephemeral: true
    });
  }

  // --- permission check based on roles ---
  let invokerMember;
  try {
    invokerMember = await interaction.guild.members.fetch(interaction.user.id);
  } catch (err) {
    console.error("❌ Could not fetch invoking member:", err);
    return interaction.reply({
      content: "❌ Could not verify your permissions.",
      ephemeral: true
    });
  }

  const hasAdminRole =
    ADMIN_ROLE_ID && invokerMember.roles.cache.has(ADMIN_ROLE_ID);

  const hasStaffRole =
    STAFF_ROLE_ID && invokerMember.roles.cache.has(STAFF_ROLE_ID);

  if (!hasAdminRole && !hasStaffRole) {
    return interaction.reply({
      content: "❌ You do not have permission to use this command.",
      ephemeral: true
    });
  }

  // --- get target user + role ---
  const targetUser = interaction.options.getUser("user");
  const role = interaction.options.getRole("role");

  if (!targetUser || !role) {
    return interaction.reply({
      content: "❌ Invalid user or role.",
      ephemeral: true
    });
  }

  // optional safety: check bot can actually manage that role
  const me = await interaction.guild.members.fetchMe();
  if (me.roles.highest.position <= role.position) {
    return interaction.reply({
      content: "❌ I can't give that role because it's higher than or equal to my highest role.",
      ephemeral: true
    });
  }

  try {
    const memberToEdit = await interaction.guild.members.fetch(targetUser.id);
    await memberToEdit.roles.add(role);

    return interaction.reply({
      content: `✅ Gave **${role.name}** to **${targetUser.tag}**.`,
      ephemeral: false
    });
  } catch (err) {
    console.error("❌ Error adding role:", err);
    return interaction.reply({
      content: "❌ Failed to give the role. Check my permissions and role position.",
      ephemeral: true
    });
  }
});

// ==========================
// Login
// ==========================

client.login(DISCORD_TOKEN).catch((err) => {
  console.error("❌ Failed to login:", err);
});