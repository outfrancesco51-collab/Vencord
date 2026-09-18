import { Devs } from "@utils/constants";
import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { Logger } from "@utils/Logger";

const logger = new Logger("FakeCamera");

const settings = definePluginSettings({
    imageUrl: {
        description: "Link dell'immagine da usare come finta videocamera (es. https://i.imgur.com/...)",
        type: OptionType.STRING,
        default: "https://i.imgur.com/G5X1X2s.jpeg",
        onChange: () => updateImage()
    },
    enableFakeCamera: {
        description: "Attiva la finta videocamera",
        type: OptionType.BOOLEAN,
        default: true,
    }
});

let originalGetUserMedia = navigator.mediaDevices ? navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices) : null;
let fakeStream: MediaStream | null = null;
let animationFrameId: number;
let currentImage = new Image();

function updateImage() {
    currentImage.crossOrigin = "anonymous";
    currentImage.src = settings.store.imageUrl;
}

async function getFakeCameraStream(constraints?: MediaStreamConstraints): Promise<MediaStream> {
    if (!settings.store.enableFakeCamera || !constraints?.video) {
        if (originalGetUserMedia) return originalGetUserMedia(constraints);
        throw new Error("getUserMedia not supported");
    }

    // Se stiamo richiedendo audio, lo prendiamo dal microfono vero
    let audioStream: MediaStream | null = null;
    if (constraints.audio && originalGetUserMedia) {
        try {
            audioStream = await originalGetUserMedia({ audio: constraints.audio });
        } catch (e) {
            logger.error("Errore nell'ottenere il microfono", e);
        }
    }

    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext("2d")!;

    // Aggiorniamo l'immagine se necessario
    if (currentImage.src !== settings.store.imageUrl) {
        updateImage();
    }

    const draw = () => {
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (currentImage.complete && currentImage.naturalWidth > 0) {
            // Centra l'immagine
            const scale = Math.min(canvas.width / currentImage.width, canvas.height / currentImage.height);
            const w = currentImage.width * scale;
            const h = currentImage.height * scale;
            const x = (canvas.width - w) / 2;
            const y = (canvas.height - h) / 2;
            ctx.drawImage(currentImage, x, y, w, h);
        } else {
            // Disegna testo di caricamento
            ctx.fillStyle = "#ffffff";
            ctx.font = "40px Arial";
            ctx.fillText("Loading Fake Camera...", 50, 100);
        }
        
        animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    fakeStream = canvas.captureStream(30);

    if (audioStream) {
        audioStream.getAudioTracks().forEach(track => fakeStream!.addTrack(track));
    }

    const stopAll = () => {
        cancelAnimationFrame(animationFrameId);
        if (audioStream) audioStream.getTracks().forEach(t => t.stop());
        if (fakeStream) fakeStream.getTracks().forEach(t => t.stop());
    };

    fakeStream.getVideoTracks()[0].addEventListener("ended", stopAll);

    return fakeStream;
}

export default definePlugin({
    name: "ShowCamera",
    description: "Permette di usare un'immagine da internet come finta webcam (Fake Camera).",
    authors: [Devs.AI],
    tags: ["Voice", "Media", "Utility"],
    settings,
    
    start() {
        updateImage();
        if (navigator.mediaDevices) {
            navigator.mediaDevices.getUserMedia = getFakeCameraStream as any;
        }
    },

    stop() {
        if (navigator.mediaDevices && originalGetUserMedia) {
            navigator.mediaDevices.getUserMedia = originalGetUserMedia;
        }
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        if (fakeStream) {
            fakeStream.getTracks().forEach(t => t.stop());
        }
    }
});
