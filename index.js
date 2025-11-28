const {
  Client,
  GatewayIntentBits,
  REST,
  Routes
} = require('discord.js');



// 🔧 Env vars
const DISCORD_TOKEN  = process.env.DISCORD_TOKEN;
const CLIENT_ID      = process.env.CLIENT_ID;      // still needed to register slash commands
const GUILD_ID       = process.env.GUILD_ID;
const STAFF_ROLE_ID  = process.env.STAFF_ROLE_ID;
const ADMIN_ROLE_ID  = process.env.ADMIN_ROLE_ID;

if (!DISCORD_TOKEN || !CLIENT_ID || !GUILD_ID || !ADMIN_ROLE_ID) {
  console.error('❌ Missing one or more env vars: DISCORD_TOKEN, CLIENT_ID, GUILD_ID, ADMIN_ROLE_ID');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

// Slash commands
const commands = [
  {
    name: 'giverole',
    description: 'Give a role to a user (staff/admin only)',
    options: [
      {
        name: 'user',
        description: 'User to give the role to',
        type: 6, // USER
        required: true
      },
      {
        name: 'role',
        description: 'Role to give',
        type: 8, // ROLE
        required: true
      }
    ]
  }
];

// Register commands for one guild
async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

  try {
    console.log('🛠️ Registering slash commands…');
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log('✅ Slash commands registered.');
  } catch (error) {
    console.error('❌ Error registering commands:', error);
  }
}

client.once('ready', () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'giverole') return;

  if (!interaction.guild) {
    return interaction.reply({
      content: '❌ This command can only be used in a server.',
      ephemeral: true
    });
  }

  // 🔐 Permission check based on roles
  try {
    const invokerMember = await interaction.guild.members.fetch(interaction.user.id);

    const hasAdminRole = invokerMember.roles.cache.has(ADMIN_ROLE_ID);
    const hasStaffRole = STAFF_ROLE_ID
      ? invokerMember.roles.cache.has(STAFF_ROLE_ID)
      : false;

    if (!hasAdminRole && !hasStaffRole) {
      return interaction.reply({
        content: '❌ You do not have permission to use this command.',
        ephemeral: true
      });
    }
  } catch (err) {
    console.error('❌ Error fetching invoker member:', err);
    return interaction.reply({
      content: '❌ Could not verify your permissions.',
      ephemeral: true
    });
  }

  const targetUser = interaction.options.getUser('user');
  const role = interaction.options.getRole('role');

  try {
    const member = await interaction.guild.members.fetch(targetUser.id);
    await member.roles.add(role);

    await interaction.reply({
      content: `✅ Gave role **${role.name}** to **${targetUser.tag}**.`,
      ephemeral: false
    });
  } catch (error) {
    console.error('❌ Error giving role:', error);
    await interaction.reply({
      content: '❌ Failed to give the role. Check my permissions and role position.',
      ephemeral: true
    });
  }
});

// Boot
(async () => {
  await registerCommands();
  await client.login(DISCORD_TOKEN);
})();