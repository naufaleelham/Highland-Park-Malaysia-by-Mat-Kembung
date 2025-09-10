// bot.js
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder } = require("discord.js");
const fs = require("fs");
require("dotenv").config();

// ===== Mini HTTP server supaya Render detect port =====
const http = require('http');
const port = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Bot is running!');
}).listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// ===== Discord Client =====
const client = new Client({ intents:[GatewayIntentBits.Guilds] });

// ---------- Database ----------
const dbFile = "./database.json";
const adminFile = "./admin.json";
let db = fs.existsSync(dbFile) ? JSON.parse(fs.readFileSync(dbFile,"utf8")) : [];
let adminIDs = fs.existsSync(adminFile) ? JSON.parse(fs.readFileSync(adminFile,"utf8")) : ["1307736930103988275"];
function saveDB(){ fs.writeFileSync(dbFile, JSON.stringify(db,null,2)); }
function saveAdmin(){ fs.writeFileSync(adminFile, JSON.stringify(adminIDs,null,2)); }

// ---------- Embeds ----------
function createICEmbed(data, author, user){
  const emojiJantina = data.jantina?.toLowerCase()==="lelaki"?"🙍‍♂️":"🙍‍♀️";
  const color = data.jantina?.toLowerCase()==="lelaki"?"#1E90FF":"#FF69B4";
  return new EmbedBuilder()
    .setColor(color)
    .setTitle("Kad Pengenalan Highland Park")
    .setThumbnail(user.displayAvatarURL({dynamic:true,size:128}))
    .addFields([{name:"🪪 Maklumat IC", value:
`${emojiJantina} Nama : ${data.nama}
🎂 Umur : ${data.umur}
🆔 No IC : ${data.noIC || "—"}
⚛️ Jantina : ${data.jantina || "—"}
🎮 RobloxID : ${data.robloxID || "—"}`, inline:false}])
    .setFooter({text:`Didaftar/Edit oleh ${author.tag}`})
    .setTimestamp();
}

function createLesenEmbed(data, author, user){
  const namaPemilik = data.nama || user.username;
  const noICPemilik = data.noIC || "—";
  return new EmbedBuilder()
    .setColor("#32CD32")
    .setTitle("Lesen Memandu Highland Park")
    .setThumbnail(user.displayAvatarURL({dynamic:true,size:128}))
    .addFields([{name:"📜 Maklumat Lesen", value:
`👤 Nama Pemilik : ${namaPemilik}
🆔 No IC : ${noICPemilik}
📄 Jenis Lesen : ${data.lesen?.jenis || "—"}
🪪 No Lesen : ${data.lesen?.noLesen || "—"}
⏳ Tamat Tempoh : ${data.lesen?.tarikhTamat || "—"}`, inline:false}])
    .setFooter({text:`Didaftar/Edit oleh ${author.tag}`})
    .setTimestamp();
}

// ---------- Slash Commands ----------
const commands = [
  new SlashCommandBuilder().setName("ping").setDescription("Check bot ping"),
  new SlashCommandBuilder().setName("addadmin").setDescription("Tambah admin")
    .addUserOption(opt=>opt.setName("user").setDescription("User jadi admin").setRequired(true)),
  new SlashCommandBuilder().setName("removeadmin").setDescription("Buang admin")
    .addUserOption(opt=>opt.setName("user").setDescription("User dibuang").setRequired(true)),
  new SlashCommandBuilder().setName("listadmin").setDescription("Senarai admin"),
  new SlashCommandBuilder().setName("ic").setDescription("Daftar IC")
    .addUserOption(opt=>opt.setName("user").setDescription("User").setRequired(true))
    .addStringOption(opt=>opt.setName("nama").setDescription("Nama penuh").setRequired(true))
    .addIntegerOption(opt=>opt.setName("umur").setDescription("Umur").setRequired(true))
    .addStringOption(opt=>opt.setName("jantina").setDescription("Lelaki/Perempuan").setRequired(true))
    .addStringOption(opt=>opt.setName("noic").setDescription("No IC").setRequired(true))
    .addStringOption(opt=>opt.setName("robloxid").setDescription("Roblox ID").setRequired(true)),
  new SlashCommandBuilder().setName("checkic").setDescription("Check IC user")
    .addUserOption(opt=>opt.setName("user").setDescription("User").setRequired(false)),
  new SlashCommandBuilder().setName("editic").setDescription("Edit IC user")
    .addUserOption(opt=>opt.setName("user").setDescription("User").setRequired(true))
    .addStringOption(opt=>opt.setName("nama").setDescription("Nama"))
    .addIntegerOption(opt=>opt.setName("umur").setDescription("Umur"))
    .addStringOption(opt=>opt.setName("jantina").setDescription("Jantina"))
    .addStringOption(opt=>opt.setName("noic").setDescription("No IC"))
    .addStringOption(opt=>opt.setName("robloxid").setDescription("RobloxID")),
  new SlashCommandBuilder().setName("lesen").setDescription("Daftar lesen")
    .addUserOption(opt=>opt.setName("user").setDescription("User").setRequired(true))
    .addStringOption(opt=>opt.setName("jenis").setDescription("Jenis lesen").setRequired(true))
    .addStringOption(opt=>opt.setName("nolesen").setDescription("No lesen").setRequired(true))
    .addStringOption(opt=>opt.setName("tarikhtamat").setDescription("Tarikh tamat").setRequired(true)),
  new SlashCommandBuilder().setName("checklesen").setDescription("Check lesen")
    .addUserOption(opt=>opt.setName("user").setDescription("User").setRequired(false)),
  new SlashCommandBuilder().setName("editlesen").setDescription("Edit lesen dan auto letak nama & IC")
    .addUserOption(opt=>opt.setName("user").setDescription("User").setRequired(true))
    .addStringOption(opt=>opt.setName("jenis").setDescription("Jenis lesen"))
    .addStringOption(opt=>opt.setName("nolesen").setDescription("No lesen"))
    .addStringOption(opt=>opt.setName("tarikhtamat").setDescription("Tarikh tamat"))
].map(c => c.toJSON());

// ---------- Deploy Commands ----------
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
(async()=>{
  try{
    console.log("🚀 Deploying commands...");
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands });
    console.log("✅ Commands deployed!");
  }catch(e){console.error(e);}
})();

// ---------- Interaction ----------
client.on("interactionCreate", async interaction=>{
  if(!interaction.isCommand()) return;
  const { commandName, options, user: author } = interaction;

  // Admin check
  const adminOnly = ["addadmin","removeadmin","ic","lesen","editic","editlesen"];
  if(adminOnly.includes(commandName) && !adminIDs.includes(author.id))
    return interaction.reply("❌ Hanya admin boleh guna command ni!");

  // Ping
  if(commandName==="ping") return interaction.reply("🏓 Pong!");

  // Add/Remove/List Admin
  if(commandName==="addadmin"){
    const u = options.getUser("user");
    if(adminIDs.includes(u.id)) return interaction.reply("⚠️ User dah admin.");
    adminIDs.push(u.id); saveAdmin();
    return interaction.reply(`✅ ${u.tag} ditambah sebagai admin!`);
  }
  if(commandName==="removeadmin"){
    const u = options.getUser("user");
    if(!adminIDs.includes(u.id)) return interaction.reply("⚠️ User bukan admin.");
    adminIDs = adminIDs.filter(id=>id!==u.id); saveAdmin();
    return interaction.reply(`✅ ${u.tag} dibuang dari admin.`);
  }
  if(commandName==="listadmin"){
    if(adminIDs.length===0) return interaction.reply("❌ Tiada admin.");
    return interaction.reply(`📋 Senarai Admin:\n${adminIDs.map((id,i)=>`${i+1}. <@${id}>`).join("\n")}`);
  }

  // IC
  if(commandName==="ic"){
    const u = options.getUser("user");
    const nama = options.getString("nama");
    const umur = options.getInteger("umur");
    const jantina = options.getString("jantina");
    const noIC = options.getString("noic");
    const robloxID = options.getString("robloxid");
    const existing = db.find(d=>d.id===u.id);
    if(existing) Object.assign(existing,{nama,umur,jantina,noIC,robloxID});
    else db.push({id:u.id,nama,umur,jantina,noIC,robloxID});
    saveDB();
    return interaction.reply({embeds:[createICEmbed({nama,umur,jantina,noIC,robloxID},author,u)]});
  }
  if(commandName==="checkic"){
    const u = options.getUser("user")||author;
    const data = db.find(d=>d.id===u.id);
    if(!data) return interaction.reply("❌ Belum daftar IC.");
    return interaction.reply({embeds:[createICEmbed(data,author,u)]});
  }
  if(commandName==="editic"){
    const u = options.getUser("user");
    const data = db.find(d=>d.id===u.id);
    if(!data) return interaction.reply("❌ User belum daftar IC.");
    const nama = options.getString("nama"); if(nama) data.nama=nama;
    const umur = options.getInteger("umur"); if(umur) data.umur=umur;
    const jantina = options.getString("jantina"); if(jantina) data.jantina=jantina;
    const noIC = options.getString("noic"); if(noIC) data.noIC=noIC;
    const robloxID = options.getString("robloxid"); if(robloxID) data.robloxID=robloxID;
    saveDB();
    return interaction.reply({embeds:[createICEmbed(data,author,u)],content:"✅ IC dikemaskini!"});
  }

  // Lesen
  if(commandName==="lesen"){
    const u = options.getUser("user");
    const jenis = options.getString("jenis");
    const noLesen = options.getString("nolesen");
    const tarikhTamat = options.getString("tarikhtamat");
    const existing = db.find(d=>d.id===u.id);
    if(existing) {
      existing.lesen={jenis,noLesen,tarikhTamat};
      if(!existing.nama) existing.nama = u.username;
      if(!existing.noIC) existing.noIC = "—";
    }
    else db.push({id:u.id,lesen:{jenis,noLesen,tarikhTamat}, nama:u.username, noIC:"—"});
    saveDB();
    return interaction.reply({embeds:[createLesenEmbed(db.find(d=>d.id===u.id),author,u)]});
  }
  if(commandName==="checklesen"){
    const u = options.getUser("user")||author;
    const data = db.find(d=>d.id===u.id);
    if(!data || !data.lesen) return interaction.reply("❌ User belum ada Lesen.");
    return interaction.reply({embeds:[createLesenEmbed(data,author,u)]});
  }
  if(commandName==="editlesen"){
    const u = options.getUser("user");
    const data = db.find(d=>d.id===u.id);
    if(!data || !data.lesen) return interaction.reply("❌ User belum ada Lesen.");

    const jenis = options.getString("jenis"); if(jenis) data.lesen.jenis=jenis;
    const noLesen = options.getString("nolesen"); if(noLesen) data.lesen.noLesen=noLesen;
    const tarikhTamat = options.getString("tarikhtamat"); if(tarikhTamat) data.lesen.tarikhTamat=tarikhTamat;

    // Auto letak nama & IC kalau kosong
    if(!data.nama) data.nama = u.username;
    if(!data.noIC) data.noIC = "—";

    saveDB();
    return interaction.reply({embeds:[createLesenEmbed(data,author,u)],content:"✅ Lesen dikemaskini dengan Nama & No IC!"});
  }
});

// ===== Bot Ready =====
client.once("ready", ()=>console.log(`✅ Bot online sebagai ${client.user.tag}`));
client.login(process.env.TOKEN);
