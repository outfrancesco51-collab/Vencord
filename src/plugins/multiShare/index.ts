import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Logger } from "@utils/Logger";

const logger = new Logger("MultiShare");
const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);

let currentStreams: MediaStream[] = [];
let animationFrameId: number;

async function getCompositedStream(options: DisplayMediaStreamOptions): Promise<MediaStream> {
    const countStr = prompt("Quante finestre/schermi vuoi condividere simultaneamente?", "2");
    const count = parseInt(countStr || "1", 10);

    if (isNaN(count) || count <= 1) {
        return originalGetDisplayMedia(options);
    }

    currentStreams = [];
    const videos: HTMLVideoElement[] = [];

    for (let i = 0; i < count; i++) {
        try {
            const stream = await originalGetDisplayMedia(options);
            currentStreams.push(stream);

            const video = document.createElement("video");
            video.srcObject = stream;
            video.autoplay = true;
            video.muted = true;
            await video.play();
            videos.push(video);
        } catch (err) {
            logger.error(`Errore nella cattura dello stream ${i + 1}`, err);
            break;
        }
    }

    if (currentStreams.length === 0) {
        throw new Error("Nessuno stream catturato");
    }
    if (currentStreams.length === 1) {
        return currentStreams[0];
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    
    const width = videos[0].videoWidth || 1920;
    const height = videos[0].videoHeight || 1080;
    
    canvas.width = width * currentStreams.length;
    canvas.height = height;

    const draw = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        videos.forEach((vid, index) => {
            ctx.drawImage(vid, index * width, 0, width, height);
        });
        animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    const compositedStream = canvas.captureStream(60);

    const stopAll = () => {
        cancelAnimationFrame(animationFrameId);
        videos.forEach(v => {
            v.pause();
            v.srcObject = null;
        });
        currentStreams.forEach(s => s.getTracks().forEach(t => t.stop()));
        compositedStream.getTracks().forEach(t => t.stop());
    };

    currentStreams.forEach(stream => {
        stream.getVideoTracks()[0].addEventListener("ended", stopAll);
    });

    compositedStream.getVideoTracks()[0].addEventListener("ended", stopAll);

    const audioTracks = currentStreams[0].getAudioTracks();
    if (audioTracks.length > 0) {
        compositedStream.addTrack(audioTracks[0]);
    }

    return compositedStream;
}

export default definePlugin({
    name: "MultiShare",
    description: "Permette di condividere più schermi contemporaneamente (Avanzato - Canvas Compositing).",
    authors: [Devs.AI],
    tags: ["Voice", "Utility"],
    
    start() {
        navigator.mediaDevices.getDisplayMedia = getCompositedStream as any;
    },

    stop() {
        navigator.mediaDevices.getDisplayMedia = originalGetDisplayMedia;
        
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        currentStreams.forEach(s => s.getTracks().forEach(t => t.stop()));
        currentStreams = [];
    }
});
