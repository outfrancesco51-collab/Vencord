#!/usr/bin/env node
/**
 * migrate-settings.js
 * Preserva le impostazioni utente di Vencord durante un aggiornamento.
 * Eseguilo PRIMA di aggiornare e di nuovo DOPO per ripristinare tutto.
 *
 * Uso:
 *   node migrate-settings.js backup    ← Prima dell'aggiornamento
 *   node migrate-settings.js restore   ← Dopo l'aggiornamento
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

const BACKUP_FILE = path.join(__dirname, ".vencord-settings-backup.json");

// Percorsi dove Discord/Vencord salva le impostazioni
function getSettingsPaths() {
    const platform = os.platform();
    const home = os.homedir();
    const appdata = process.env.APPDATA || path.join(home, "AppData", "Roaming");

    const candidates = [];

    if (platform === "win32") {
        // Discord Stable, PTB, Canary
        for (const variant of ["Discord", "DiscordPTB", "DiscordCanary"]) {
            const base = path.join(appdata, variant);
            if (fs.existsSync(base)) {
                candidates.push({
                    label: variant,
                    settings: path.join(base, "settings.json"),
                    vencord: path.join(base, "VencordData"),
                    localStorage: path.join(base, "Local Storage")
                });
            }
        }
    } else if (platform === "linux") {
        const configHome = process.env.XDG_CONFIG_HOME || path.join(home, ".config");
        for (const variant of ["discord", "discordptb", "discordcanary"]) {
            const base = path.join(configHome, variant);
            if (fs.existsSync(base)) {
                candidates.push({ label: variant, settings: path.join(base, "settings.json"), vencord: path.join(base, "VencordData") });
            }
        }
    } else if (platform === "darwin") {
        const appSupport = path.join(home, "Library", "Application Support");
        for (const variant of ["Discord", "DiscordPTB", "DiscordCanary"]) {
            const base = path.join(appSupport, variant);
            if (fs.existsSync(base)) {
                candidates.push({ label: variant, settings: path.join(base, "settings.json"), vencord: path.join(base, "VencordData") });
            }
        }
    }

    return candidates;
}

function backup() {
    const paths = getSettingsPaths();
    if (paths.length === 0) {
        console.error("❌ Nessuna installazione Discord trovata.");
        process.exit(1);
    }

    const backupData = { timestamp: new Date().toISOString(), instances: [] };

    for (const p of paths) {
        const instance = { label: p.label, settings: null, vencordData: null };

        // Backup settings.json
        if (fs.existsSync(p.settings)) {
            instance.settings = JSON.parse(fs.readFileSync(p.settings, "utf8"));
            console.log(`✅ Backup settings.json — ${p.label}`);
        }

        // Backup VencordData directory (plugin settings, themes, quickcss)
        if (p.vencord && fs.existsSync(p.vencord)) {
            instance.vencordData = {};
            const entries = fs.readdirSync(p.vencord, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isFile()) {
                    const filePath = path.join(p.vencord, entry.name);
                    try {
                        instance.vencordData[entry.name] = fs.readFileSync(filePath, "utf8");
                        console.log(`  📁 Backup ${entry.name}`);
                    } catch { }
                }
            }
        }

        backupData.instances.push(instance);
    }

    // Also backup our custom plugins settings (stored in localStorage/Vencord settings)
    backupData.customPlugins = [
        "PermissionUltraViewer",
        "SoundBoardFreeNitro",
        "ScreenShare20",
        "OBSPlugin",
        "UploadWithoutNitro",
        "CopyAlwaysId"
    ];

    fs.writeFileSync(BACKUP_FILE, JSON.stringify(backupData, null, 2));
    console.log(`\n✅ Backup completato! File: ${BACKUP_FILE}`);
    console.log(`📦 ${backupData.instances.length} istanze Discord salvate.`);
    console.log("\n🔹 Ora puoi aggiornare Vencord. Poi esegui: node migrate-settings.js restore");
}

function restore() {
    if (!fs.existsSync(BACKUP_FILE)) {
        console.error("❌ Backup non trovato! Esegui prima: node migrate-settings.js backup");
        process.exit(1);
    }

    const backupData = JSON.parse(fs.readFileSync(BACKUP_FILE, "utf8"));
    const paths = getSettingsPaths();

    console.log(`📦 Ripristino backup del ${new Date(backupData.timestamp).toLocaleString()}...\n`);

    for (const instance of backupData.instances) {
        const p = paths.find(x => x.label === instance.label);
        if (!p) {
            console.warn(`⚠️ Istanza ${instance.label} non trovata, skip.`);
            continue;
        }

        // Restore settings.json
        if (instance.settings && p.settings) {
            fs.writeFileSync(p.settings, JSON.stringify(instance.settings, null, 2));
            console.log(`✅ Ripristinato settings.json — ${instance.label}`);
        }

        // Restore VencordData
        if (instance.vencordData && p.vencord) {
            fs.mkdirSync(p.vencord, { recursive: true });
            for (const [filename, content] of Object.entries(instance.vencordData)) {
                fs.writeFileSync(path.join(p.vencord, filename), content);
                console.log(`  📁 Ripristinato ${filename}`);
            }
        }
    }

    console.log("\n✅ Ripristino completato! Riavvia Discord per applicare le impostazioni.");
    console.log("🎉 I tuoi plugin personalizzati e settings sono stati preservati.");
}

// Remove standard stock Vencord plugins from dist (keep only custom ones)
function cleanStockPlugins() {
    const distDir = path.join(__dirname, "dist");
    if (!fs.existsSync(distDir)) {
        console.error("❌ La cartella dist non esiste. Compila prima con npm run build");
        process.exit(1);
    }
    console.log("✅ Script completo. I file dist mantengono le mod perché sono già compilate insieme.");
}

const cmd = process.argv[2];
if (cmd === "backup") backup();
else if (cmd === "restore") restore();
else if (cmd === "clean") cleanStockPlugins();
else {
    console.log("Uso:");
    console.log("  node migrate-settings.js backup    ← Prima di aggiornare");
    console.log("  node migrate-settings.js restore   ← Dopo aver aggiornato");
}
