import { definePlugin } from "@vencord/core";

export default definePlugin({
    name: "CopyAlwaysId",
    description: "Copia automaticamente l'ID dell'utente negli appunti appena si clicca sul suo avatar/nome, senza aprire il menu a tendina.",
    authors: [{ name: "Antigravity", id: 0n }],

    start() {
        document.addEventListener("click", this.handleClick);
    },
    
    stop() {
        document.removeEventListener("click", this.handleClick);
    },

    handleClick(event: MouseEvent) {
        // Logica fittizia/placeholder che cerca un attributo dati Discord che contiene l'ID utente
        const target = event.target as HTMLElement;
        const avatarOrNameNode = target.closest('[class*="avatar"], [class*="username"]');
        
        if (avatarOrNameNode) {
            // Estrae ID da prop React o attributi (nell'implementazione reale si usa findByProps)
            const idMatch = avatarOrNameNode.outerHTML.match(/(\d{17,20})/);
            if (idMatch && idMatch[1]) {
                const userId = idMatch[1];
                navigator.clipboard.writeText(userId).then(() => {
                    // Notifica in-app fittizia
                    console.log("Copiato ID: " + userId);
                });
            }
        }
    }
});
