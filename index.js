const {
  Client,
  GatewayIntentBits
} = require("discord.js");

// ========== CONSTANTS / OWNER ==========
const OWNER_ID = "1123073076360380487"; // <-- YOU

// ========== ENV VARS ==========
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

// we don’t actually need GUILD_ID for this message-based bot,
// but we’ll still read it so Railway is happy
const GUILD_ID      = process.env.GUILD_ID || "";

const ADMIN_ROLE_ID = process.env.ADMIN_ROLE_ID || "";
const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID || "";

// other vars just to satisfy Railway
const ADMIN_APPROVAL_CHANNEL_ID = process.env.ADMIN_APPROVAL_CHANNEL_ID || "";
const MEDIA_CATEGORY_ID         = process.env.MEDIA_CATEGORY_ID || "";
const REPORT_CATEGORY_ID        = process.env.REPORT_CATEGORY_ID || "";
const SUPPORT_CATEGORY_ID       = process.env.SUPPORT_CATEGORY_ID || "";
const TICKET_PANEL_CHANNEL_ID   = process.env.TICKET_PANEL_CHANNEL_ID || "";
const TRANSCRIPT_LOG_CHANNEL_ID = process.env.TRANSCRIPT_LOG_CHANNEL_ID || "";
const POSTGRES_URL              = process.env.POSTGRES_URL || "";

if (!DISCORD_TOKEN) {
  console.error("❌ DISCORD_TOKEN missing.");
  process.exit(1);
}

console.log("🔧 ENV CHECK:", {
  DISCORD_TOKEN: !!DISCORD_TOKEN,
  GUILD_ID: !!GUILD_ID,
  ADMIN_ROLE_ID: !!ADMIN_ROLE_ID,
  STAFF_ROLE_ID: !!STAFF_ROLE_ID
});

// ========== CLIENT ==========
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent   // make sure this is enabled in Dev Portal
  ]
});

// ========== READY ==========
client.once("ready", () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

// ========== MESSAGE HANDLER ==========
client.on("messageCreate", async (msg) => {
  // ignore bots & DMs
  if (msg.author.bot) return;
  if (!msg.guild) return;

  // only react if the bot is mentioned
  if (!msg.mentions.has(client.user)) return;

  // remove the bot mention from the message content
  const mentionPattern = new RegExp(`<@!?${client.user.id}>`, "g");
  const withoutMention = msg.content.replace(mentionPattern, "").trim();

  if (!withoutMention.length) {
    return msg.reply("Usage: `@Bot role <roleID> <userID or @user>`");
  }

  const parts = withoutMention.split(/\s+/);
  const command = (parts[0] || "").toLowerCase();

  if (command !== "role") {
    return msg.reply("❌ Invalid command. Use: `@Bot role <roleID> <userID or @user>`");
  }

  const roleID = parts[1];
  let userArg = parts[2];

  if (!roleID || !userArg) {
    return msg.reply("❌ Usage: `@Bot role <roleID> <userID or @user>`");
  }

  // support @mention OR raw ID for the user
  // e.g. <@1234567890> or <@!1234567890>
  const mentionMatch = userArg.match(/^<@!?(\d+)>$/);
  const userID = mentionMatch ? mentionMatch[1] : userArg;

  // ===== permission check =====
  let invoker;
  try {
    invoker = await msg.guild.members.fetch(msg.author.id);
  } catch (e) {
    console.error("Error fetching invoking member:", e);
    return msg.reply("❌ Could not verify your permissions.");
  }

  const isOwner = msg.author.id === OWNER_ID;
  const isAdmin = ADMIN_ROLE_ID && invoker.roles.cache.has(ADMIN_ROLE_ID);
  const isStaff = STAFF_ROLE_ID && invoker.roles.cache.has(STAFF_ROLE_ID);

  if (!isOwner && !isAdmin && !isStaff) {
    return msg.reply("❌ You don't have permission to use this.");
  }

  // ===== fetch target user =====
  let target;
  try {
    target = await msg.guild.members.fetch(userID);
  } catch (e) {
    console.error("Error fetching target member:", e);
    return msg.reply("❌ Invalid user ID or user not in this server.");
  }

  // ===== fetch role =====
  const role = msg.guild.roles.cache.get(roleID);
  if (!role) {
    return msg.reply("❌ Invalid role ID.");
  }

  // ===== check bot's role hierarchy =====
  const me = await msg.guild.members.fetchMe();
  if (me.roles.highest.position <= role.position) {
    return msg.reply("❌ I can't manage that role (my role is lower or equal).");
  }

  // ===== add the role =====
  try {
    await target.roles.add(role);
    return msg.reply(`✅ Added role **${role.name}** to <@${userID}>`);
  } catch (e) {
    console.error("Error adding role:", e);
    return msg.reply("❌ Failed to give the role. Check my permissions and role order.");
  }
});

// ========== LOGIN ==========
client.login(DISCORD_TOKEN).catch((err) => {
  console.error("❌ Failed to login:", err);
});