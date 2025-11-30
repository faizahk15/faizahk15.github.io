// image-processor.js

class ImageProcessor {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
    }

    // Create a canvas element for image processing
    createCanvas(width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        return canvas;
    }

    // Crop image to square (center crop)
    cropToSquare(image) {
        const size = Math.min(image.width, image.height);
        const canvas = this.createCanvas(size, size);
        const ctx = canvas.getContext('2d');

        // Calculate crop coordinates (center)
        const sx = (image.width - size) / 2;
        const sy = (image.height - size) / 2;

        ctx.drawImage(image, sx, sy, size, size, 0, 0, size, size);
        return canvas;
    }

    // Resize image to maximum dimensions while maintaining aspect ratio
    resizeImage(image, maxWidth = 400, maxHeight = 400) {
        let { width, height } = image;

        // Calculate new dimensions maintaining aspect ratio
        if (width > height) {
            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }
        } else {
            if (height > maxHeight) {
                width = Math.round((width * maxHeight) / height);
                height = maxHeight;
            }
        }

        const canvas = this.createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // Use high-quality image scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(image, 0, 0, width, height);

        return canvas;
    }

    // Process image: crop to square and resize
    async processProfileImage(file, options = {}) {
        const {
            cropToSquare: shouldCrop = true,
            maxSize = 400,
            quality = 0.85,
            outputFormat = 'image/jpeg'
        } = options;

        return new Promise((resolve, reject) => {
            const img = new Image();
            const reader = new FileReader();

            reader.onload = (e) => {
                img.onload = () => {
                    try {
                        let canvas;

                        if (shouldCrop) {
                            // First crop to square, then resize
                            const squareCanvas = this.cropToSquare(img);
                            canvas = this.resizeImage(squareCanvas, maxSize, maxSize);
                        } else {
                            // Just resize maintaining aspect ratio
                            canvas = this.resizeImage(img, maxSize, maxSize);
                        }

                        // Convert to blob with specified quality
                        canvas.toBlob(
                            (blob) => {
                                resolve({
                                    blob: blob,
                                    width: canvas.width,
                                    height: canvas.height,
                                    originalWidth: img.width,
                                    originalHeight: img.height,
                                    format: outputFormat
                                });
                            },
                            outputFormat,
                            quality
                        );
                    } catch (error) {
                        reject(error);
                    }
                };

                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = e.target.result;
            };

            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    }

    // Get image dimensions
    async getImageDimensions(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const reader = new FileReader();

            reader.onload = (e) => {
                img.onload = () => {
                    resolve({
                        width: img.width,
                        height: img.height,
                        aspectRatio: img.width / img.height
                    });
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // Convert blob to base64
    async blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    // Check if image needs processing (based on size or dimensions)
    async needsProcessing(file, maxSize = 400, maxFileSize = 2 * 1024 * 1024) {
        const dimensions = await this.getImageDimensions(file);
        const isSquare = Math.abs(dimensions.width - dimensions.height) < 10; // 10px tolerance

        return {
            needsResize: dimensions.width > maxSize || dimensions.height > maxSize,
            needsCrop: !isSquare,
            needsCompression: file.size > maxFileSize,
            dimensions: dimensions
        };
    }
}

// Create global instance
const imageProcessor = new ImageProcessor();

// Export for use in other files (if using modules)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = imageProcessor;
}