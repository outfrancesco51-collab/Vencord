import { readdirSync, unlinkSync, rmSync, existsSync } from "fs";
import { join } from "path";

const distPath = "./dist";
if (existsSync(distPath)) {
    for (const item of readdirSync(distPath)) {
        if (item === "Installer") continue;
        const fullPath = join(distPath, item);
        try {
            rmSync(fullPath, { recursive: true, force: true });
            console.log("Deleted:", item);
        } catch (e) {
            console.error("Failed to delete:", item, e);
        }
    }
}
console.log("Clean dist completed (preserved Installer).");
