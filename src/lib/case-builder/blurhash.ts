import { encode } from "blurhash";

const BLURHASH_SIZE = 32;
const COMPONENT_X = 4;
const COMPONENT_Y = 4;

/**
 * Gera um blurhash a partir de um arquivo de imagem (File).
 * Retorna null se o arquivo não for imagem ou se a geração falhar.
 */
export function getBlurhashFromFile(file: File): Promise<string | null> {
  if (!file.type.startsWith("image/")) return Promise.resolve(null);

  const url = URL.createObjectURL(file);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = BLURHASH_SIZE;
        canvas.height = BLURHASH_SIZE;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, BLURHASH_SIZE, BLURHASH_SIZE);
        const imageData = ctx.getImageData(0, 0, BLURHASH_SIZE, BLURHASH_SIZE);
        const hash = encode(
          imageData.data,
          BLURHASH_SIZE,
          BLURHASH_SIZE,
          COMPONENT_X,
          COMPONENT_Y,
        );
        URL.revokeObjectURL(url);
        resolve(hash);
      } catch {
        URL.revokeObjectURL(url);
        resolve(null);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}
