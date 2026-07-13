import Tesseract from "./tesseract.esm.min.js";

window.Tesseract = Tesseract;
document.documentElement.dataset.ocrReady = String(Boolean(Tesseract?.createWorker));
