const {
  Client,
  GatewayIntentBits
} = require("discord.js");

// ========== ENV VARS ==========
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID      = process.env.GUILD_ID;
const ADMIN_ROLE_ID = process.env.ADMIN_ROLE_ID;
const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID || "";

// (Other vars read so Railway doesn't complain)
const ADMIN_APPROVAL_CHANNEL_ID = process.env.ADMIN_APPROVAL_CHANNEL_ID || "";
const MEDIA_CATEGORY_ID         = process.env.MEDIA_CATEGORY_ID || "";
const REPORT_CATEGORY_ID        = process.env.REPORT_CATEGORY_ID || "";
const SUPPORT_CATEGORY_ID       = process.env.SUPPORT_CATEGORY_ID || "";
const TICKET_PANEL_CHANNEL_ID   = process.env.TICKET_PANEL_CHANNEL_ID || "";
const TRANSCRIPT_LOG_CHANNEL_ID = process.env.TRANSCRIPT_LOG_CHANNEL_ID || "";
const POSTGRES_URL              = process.env.POSTGRES_URL || "";

if (!DISCORD_TOKEN || !GUILD_ID || !ADMIN_ROLE_ID) {
  console.error("❌ Missing required env vars.");
  process.exit(1);
}

// ========== CLIENT ==========
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ========== BOOT ==========
client.once("ready", () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

// ========== MESSAGE HANDLER ==========
client.on("messageCreate", async (msg) => {
  // Ignore bots
  if (msg.author.bot) return;

  // Only respond if bot is pinged
  if (!msg.mentions.has(client.user)) return;

  // Command format: @Bot role <roleID> <userID>
  const args = msg.content.split(/\s+/).slice(1); 
  // args[0] = "role"
  // args[1] = roleID
  // args[2] = userID

  if (args[0] !== "role") {
    return msg.reply("❌ Invalid command. Use: `@Bot role <roleID> <userID>`");
  }

  const roleID = args[1];
  const userID = args[2];

  if (!roleID || !userID) {
    return msg.reply("❌ Usage: `@Bot role <roleID> <userID>`");
  }

  // Permission check
  const invoker = await msg.guild.members.fetch(msg.author.id);

  const isAdmin = invoker.roles.cache.has(ADMIN_ROLE_ID);
  const isStaff = STAFF_ROLE_ID && invoker.roles.cache.has(STAFF_ROLE_ID);

  if (!isAdmin && !isStaff) {
    return msg.reply("❌ You don't have permission to use this.");
  }

  // Fetch target user
  let target;
  try {
    target = await msg.guild.members.fetch(userID);
  } catch {
    return msg.reply("❌ Invalid userID.");
  }

  // Try adding role
  try {
    const role = msg.guild.roles.cache.get(roleID);
    if (!role) return msg.reply("❌ Invalid roleID.");

    // Check hierarchy
    const me = await msg.guild.members.fetchMe();
    if (me.roles.highest.position <= role.position) {
      return msg.reply("❌ I cannot manage that role (role too high).");
    }

    await target.roles.add(role);
    return msg.reply(`✅ Added role **${role.name}** to <@${userID}>`);
  } catch (err) {
    console.error(err);
    return msg.reply("❌ Failed to give role. Check bot permissions & role order.");
  }
});

// ========== LOGIN ==========
client.login(DISCORD_TOKEN);