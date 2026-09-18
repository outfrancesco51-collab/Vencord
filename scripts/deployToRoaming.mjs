import { cpSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const appData = process.env.APPDATA;
if (appData) {
    const targetDir = join(appData, "Vencord", "dist");
    mkdirSync(targetDir, { recursive: true });
    
    cpSync("./dist", targetDir, {
        recursive: true,
        filter: (src) => !src.includes("Installer") && !src.endsWith(".zip")
    });
    console.log("Successfully synced built dist to AppData Roaming:", targetDir);
} else {
    console.warn("APPDATA environment variable not found.");
}
